/**
 * EL VIGÍA — el bot se revisa solo, arregla lo que puede y avisa lo que no.
 *
 * Todas las caídas que ha tenido este bot tienen la misma forma: **fallan
 * calladas**. ManyChat contestando en paralelo, los mensajes de Paula cayéndose
 * una hora por un secret no declarado, el embudo de comentarios saltándose a
 * quien ya había escrito, el webhook del dueño suscrito a UN evento durante
 * doce días. Ninguna dio error. Desde fuera, todas se ven idénticas a "hoy
 * nadie escribió", y por eso todas se descubrieron de casualidad, días después.
 *
 * Ninguna era un error de código, tampoco: vivían en Zernio, en Meta o en el
 * saldo de Anthropic. Las 1200 pruebas del repo no podían verlas — corren
 * contra el código, y el código estaba bien.
 *
 * Esto es el latido que faltaba. Corre en el cron que ya existía.
 *
 * Tres cosas hace, en este orden de preferencia:
 *
 *   1. **ARREGLA** lo que se puede arreglar sin pedir permiso: un webhook al
 *      que le faltan eventos, un webhook apagado, una automatización de
 *      comentarios apagada. Son cambios idempotentes y de configuración —
 *      volver a poner lo que ya habíamos puesto, no inventar nada.
 *   2. **AVISA** lo que necesita manos: un permiso de Meta por vencer (eso se
 *      reconecta desde el panel de Zernio, no por API), una cuenta
 *      desconectada, el saldo de Anthropic agotado, una automatización que
 *      alguien borró.
 *   3. **SE CALLA** si todo está bien. La regla de siempre en este proyecto:
 *      avisar de lo que no es problema entrena a ignorar los avisos.
 *
 * La excepción a esa regla es el **resumen de los lunes**, y no es un capricho:
 * un vigía averiado se ve EXACTAMENTE igual que un vigía tranquilo — los dos
 * callados. Una línea a la semana es lo único que distingue "todo bien" de
 * "esto lleva un mes muerto". Es el mismo error que este bot ya cometió cuatro
 * veces, aplicado al que vigila.
 *
 * **Vive en `src/`: `forjabot update` lo borra.**
 */
import type { Env } from "../env";
import { Db } from "../db/client";

const ZERNIO_BASE = "https://zernio.com/api/v1";

/** Los cuatro eventos sin los cuales algo del bot deja de funcionar. */
export const EVENTOS_NECESARIOS = [
  "message.received", // sin esto el bot no oye nada
  "message.sent", // sin esto no se calla cuando el asesor contesta a mano
  "referral.received", // sin esto ningún anuncio se atribuye
  "comment.received", // sin esto el rescate del embudo es código muerto
] as const;

/** Con cuánta anticipación se avisa que un permiso de Meta va a vencer. */
export const DIAS_AVISO_VENCIMIENTO = 15;

/**
 * Cuánto silencio es sospechoso.
 *
 * Se mira una ventana que TERMINA hace 15 minutos, no ahora: un mensaje que
 * acaba de entrar todavía está en el buffer del bot y no tiene por qué estar
 * contestado. Sin ese margen, el vigía gritaría cada vez que alguien escribe.
 */
export const VENTANA_SILENCIO_MS = 3 * 60 * 60 * 1000;
export const MARGEN_BUFFER_MS = 15 * 60 * 1000;

/**
 * Un mismo problema no se repite antes de 6 horas.
 *
 * La corrida ligera es cada hora. Sin esto, un saldo agotado un viernes en la
 * noche serían treinta avisos idénticos el fin de semana — y el aviso número
 * treinta ya no lo lee nadie, que es justo lo que estamos tratando de evitar.
 */
export const ENFRIAMIENTO_AVISO_MS = 6 * 60 * 60 * 1000;

export type Nivel = "arreglado" | "alerta";
export interface Hallazgo {
  nivel: Nivel;
  /** Llave estable para el enfriamiento: mismo problema, misma clave. */
  clave: string;
  texto: string;
}

interface Webhook {
  _id?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  failureCount?: number;
}
interface Cuenta {
  _id?: string;
  platform?: string;
  displayName?: string;
  isActive?: boolean;
  needsReconnection?: boolean;
  tokenExpiresAt?: string | null;
}
interface Automatizacion {
  id?: string;
  accountId?: string;
  name?: string;
  isActive?: boolean;
  trigger?: string;
}

async function zernio(
  key: string,
  ruta: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${ZERNIO_BASE}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** Las cuentas de Zernio en juego: la del dueño y la de cada asesor con la suya. */
async function clavesZernio(env: Env): Promise<{ nombre: string; key: string }[]> {
  const salida: { nombre: string; key: string }[] = [];
  const vistas = new Set<string>();
  const mete = (nombre: string, key: string | undefined) => {
    if (key && !vistas.has(key)) {
      vistas.add(key);
      salida.push({ nombre, key });
    }
  };
  mete("el dueño", env.ZERNIO_API_KEY);
  try {
    const mod: any = await import("../../member/asesores.local");
    for (const a of mod.ASESORES ?? []) {
      if (a?.zernio?.apiKeyVar) mete(a.nombre ?? a.slug ?? "un asesor", (env as any)[a.zernio.apiKeyVar]);
    }
  } catch {
    /* sin reparto configurado: solo la del dueño */
  }
  return salida;
}

// ── 1. configuración de Zernio: revisa, y arregla lo que se puede ────────────

/**
 * El webhook de cada cuenta: activo, apuntando a nuestro Worker y con los
 * CUATRO eventos.
 *
 * Los eventos que falten se vuelven a poner aquí mismo. No es inventar nada:
 * es reponer exactamente lo que este bot necesita para funcionar, y el PUT es
 * idempotente. Este es el caso que ya pasó — el webhook del dueño llevaba doce
 * días con un solo evento y nadie podía saberlo.
 *
 * La URL NO se toca sola: si apunta a otro lado, alguien lo hizo a propósito o
 * hay dos bots peleándose la cuenta, y eso se mira antes de pisarlo.
 */
export async function revisaWebhooks(
  env: Env,
  nombre: string,
  key: string,
): Promise<Hallazgo[]> {
  const out: Hallazgo[] = [];
  const r = await zernio(key, "/webhooks/settings");
  if (!r.ok) {
    return [
      {
        nivel: "alerta",
        clave: `webhook-ilegible:${nombre}`,
        texto: `No se pudo leer el webhook de ${nombre} en Zernio (${r.status}). Puede ser la llave.`,
      },
    ];
  }
  const webhooks: Webhook[] = r.body?.webhooks ?? [];
  const nuestro = webhooks.find((w) => (w.url ?? "").includes("/webhooks/zernio"));
  if (!nuestro?._id) {
    return [
      {
        nivel: "alerta",
        clave: `webhook-ausente:${nombre}`,
        texto: `${nombre} NO tiene webhook apuntando al bot. Nada de lo que le escriban va a llegar.`,
      },
    ];
  }

  const tiene = new Set(nuestro.events ?? []);
  const faltan = EVENTOS_NECESARIOS.filter((e) => !tiene.has(e));
  const apagado = nuestro.isActive === false;

  if (faltan.length || apagado) {
    const eventos = [...new Set([...(nuestro.events ?? []), ...EVENTOS_NECESARIOS])].sort();
    const fix = await zernio(key, "/webhooks/settings", {
      method: "PUT",
      body: JSON.stringify({ _id: nuestro._id, events: eventos, isActive: true }),
    });
    const que = [
      faltan.length ? `le faltaban ${faltan.length} evento(s): ${faltan.join(", ")}` : "",
      apagado ? "estaba apagado" : "",
    ]
      .filter(Boolean)
      .join(" y ");
    out.push(
      fix.ok
        ? { nivel: "arreglado", clave: `webhook:${nombre}`, texto: `Webhook de ${nombre}: ${que}. Ya quedó.` }
        : {
            nivel: "alerta",
            clave: `webhook:${nombre}`,
            texto: `Webhook de ${nombre}: ${que}, y NO se pudo arreglar solo (${fix.status}).`,
          },
    );
  }

  if ((nuestro.failureCount ?? 0) > 0) {
    out.push({
      nivel: "alerta",
      clave: `webhook-fallos:${nombre}`,
      texto: `El webhook de ${nombre} lleva ${nuestro.failureCount} entregas fallidas. Zernio lo apaga solo si sigue así.`,
    });
  }
  return out;
}

/** Cuentas conectadas: que no pidan reconexión y que su permiso no esté por vencer. */
export async function revisaCuentas(
  env: Env,
  nombre: string,
  key: string,
  ahora = Date.now(),
): Promise<{ hallazgos: Hallazgo[]; cuentas: Cuenta[] }> {
  const out: Hallazgo[] = [];
  const r = await zernio(key, "/accounts");
  if (!r.ok) {
    return {
      hallazgos: [
        {
          nivel: "alerta",
          clave: `cuentas-ilegibles:${nombre}`,
          texto: `No se pudieron leer las cuentas de ${nombre} en Zernio (${r.status}).`,
        },
      ],
      cuentas: [],
    };
  }
  const cuentas: Cuenta[] = r.body?.accounts ?? [];
  for (const c of cuentas) {
    const quien = `${c.displayName ?? c.platform} (${nombre})`;
    if (c.needsReconnection || c.isActive === false) {
      out.push({
        nivel: "alerta",
        clave: `cuenta-desconectada:${c._id}`,
        texto: `${quien} está DESCONECTADA en Zernio. El bot no puede contestar ahí. Hay que reconectarla.`,
      });
      continue;
    }
    // Los permisos de Meta caducan, y cuando caducan la cuenta deja de
    // responder sin decir nada. Reconectar es a mano (es un login), así que
    // esto solo se puede avisar — con tiempo.
    if (c.tokenExpiresAt) {
      const dias = Math.floor((Date.parse(c.tokenExpiresAt) - ahora) / 86_400_000);
      if (Number.isFinite(dias) && dias <= DIAS_AVISO_VENCIMIENTO) {
        out.push({
          nivel: "alerta",
          clave: `token-por-vencer:${c._id}`,
          texto:
            dias < 0
              ? `⛔ El permiso de Meta de ${quien} VENCIÓ hace ${-dias} día(s). Esa cuenta ya no contesta — reconéctala en Zernio.`
              : `El permiso de Meta de ${quien} vence en ${dias} día(s). Reconéctala en Zernio antes, o deja de contestar sin avisar.`,
        });
      }
    }
  }
  return { hallazgos: out, cuentas };
}

/** Cada cuenta de Facebook/Instagram debe tener su embudo de comentarios vivo. */
export async function revisaEmbudos(
  env: Env,
  nombre: string,
  key: string,
  cuentas: Cuenta[],
): Promise<Hallazgo[]> {
  const meta = cuentas.filter((c) => c.platform === "facebook" || c.platform === "instagram");
  if (meta.length === 0) return [];
  const r = await zernio(key, "/comment-automations");
  if (!r.ok) {
    return [
      {
        nivel: "alerta",
        clave: `embudos-ilegibles:${nombre}`,
        texto: `No se pudieron leer los embudos de comentarios de ${nombre} (${r.status}).`,
      },
    ];
  }
  const autos: Automatizacion[] = r.body?.automations ?? [];
  const out: Hallazgo[] = [];
  for (const c of meta) {
    const suyas = autos.filter((a) => a.accountId === c._id && (a.trigger ?? "comment") === "comment");
    const quien = `${c.displayName ?? c.platform} (${nombre})`;
    if (suyas.length === 0) {
      out.push({
        nivel: "alerta",
        clave: `embudo-ausente:${c._id}`,
        texto: `${quien} NO tiene embudo de comentarios. Quien comente ahí no recibe mensaje privado.`,
      });
      continue;
    }
    if (suyas.some((a) => a.isActive !== false)) continue; // hay al menos una viva
    // Todas apagadas: encender la primera es reponer lo que ya estaba.
    const apagada = suyas[0];
    const fix = await zernio(key, `/comment-automations/${apagada.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: true }),
    });
    out.push(
      fix.ok
        ? { nivel: "arreglado", clave: `embudo:${c._id}`, texto: `El embudo de ${quien} estaba apagado. Ya quedó encendido.` }
        : {
            nivel: "alerta",
            clave: `embudo:${c._id}`,
            texto: `El embudo de ${quien} está APAGADO y no se pudo encender solo (${fix.status}).`,
          },
    );
  }
  return out;
}

// ── 2. prueba de vida: ¿el bot puede pensar y hablar? ────────────────────────

/**
 * Una llamada mínima al cerebro.
 *
 * Esto es lo que detecta el fallo más caro de todos: **el saldo de Anthropic
 * agotado**. Cuando se acaba, el bot deja de contestar y el cliente no ve
 * ningún error — se queda hablando con nadie. Cuesta una fracción de centavo
 * comprobarlo antes de que le pase a un cliente real.
 */
export async function pruebaDeVidaCerebro(env: Env): Promise<Hallazgo[]> {
  if (!env.ANTHROPIC_API_KEY) {
    return [{ nivel: "alerta", clave: "cerebro-sin-llave", texto: "No hay ANTHROPIC_API_KEY: el bot no puede contestar nada." }];
  }
  try {
    const base = (env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "ok" }],
      }),
    });
    if (res.ok) return [];
    const cuerpo = await res.text().catch(() => "");
    const saldo = /credit|balance|quota|insufficient/i.test(cuerpo) || res.status === 402;
    return [
      {
        nivel: "alerta",
        clave: "cerebro-caido",
        texto: saldo
          ? `⛔ El bot NO puede contestar: parece saldo de Anthropic agotado (${res.status}). Recarga en console.anthropic.com.`
          : `⛔ El bot NO puede contestar: Anthropic respondió ${res.status}. ${cuerpo.slice(0, 160)}`,
      },
    ];
  } catch (e) {
    return [{ nivel: "alerta", clave: "cerebro-caido", texto: `⛔ No se pudo llegar a Anthropic: ${String(e).slice(0, 160)}` }];
  }
}

// ── 3. detector de silencio: el que atrapa lo que no previmos ────────────────

/**
 * ¿Entraron mensajes y el bot no contestó ninguno?
 *
 * Las dos revisiones de arriba buscan causas que ya conocemos. Esta busca el
 * SÍNTOMA, y por eso atrapa también lo que no se nos ocurrió: da igual si fue
 * el saldo, un despliegue malo, Meta o algo nuevo — si entraron mensajes y no
 * salió una sola respuesta, el bot está mudo.
 *
 * Dos cuidados para no gritar en falso:
 *  · la ventana termina hace 15 minutos (un mensaje recién llegado sigue en el
 *    buffer y todavía no toca contestarlo);
 *  · las conversaciones PAUSADAS no cuentan — ahí el silencio del bot es
 *    justo lo que queremos, porque el asesor tomó el hilo a mano.
 */
export async function detectaSilencio(env: Env, ahora = Date.now()): Promise<Hallazgo[]> {
  const hasta = ahora - MARGEN_BUFFER_MS;
  const desde = hasta - VENTANA_SILENCIO_MS;
  const db = new Db(env.DB);
  const fila = await db.first<{ entraron: number; salieron: number }>(
    `SELECT
       SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END)      AS entraron,
       SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) AS salieron
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.created_at BETWEEN ? AND ?
       AND (c.paused_until IS NULL OR c.paused_until < ?)`,
    [desde, hasta, ahora],
  );
  const entraron = fila?.entraron ?? 0;
  const salieron = fila?.salieron ?? 0;
  if (entraron > 0 && salieron === 0) {
    return [
      {
        nivel: "alerta",
        clave: "bot-mudo",
        texto: `⛔ Entraron ${entraron} mensaje(s) en las últimas horas y el bot NO contestó ninguno. Algo lo tiene mudo.`,
      },
    ];
  }
  return [];
}

// ── enfriamiento: el mismo problema no se repite cada hora ───────────────────

/** Se asegura en CADA escritura, sin bandera de módulo (ver `lead_origen`). */
async function aseguraTabla(db: Db): Promise<void> {
  await db.run(
    `CREATE TABLE IF NOT EXISTS vigia_avisos (
       clave TEXT PRIMARY KEY, ultimo_en INTEGER NOT NULL)`,
  );
}

/** Deja pasar solo los hallazgos que no se avisaron hace poco. */
export async function filtraPorEnfriamiento(
  env: Env,
  hallazgos: Hallazgo[],
  ahora = Date.now(),
): Promise<Hallazgo[]> {
  const db = new Db(env.DB);
  await aseguraTabla(db);
  const nuevos: Hallazgo[] = [];
  for (const h of hallazgos) {
    const prev = await db.first<{ ultimo_en: number }>(
      "SELECT ultimo_en FROM vigia_avisos WHERE clave = ?",
      [h.clave],
    );
    if (prev && ahora - prev.ultimo_en < ENFRIAMIENTO_AVISO_MS) continue;
    nuevos.push(h);
    await db.run(
      `INSERT INTO vigia_avisos (clave, ultimo_en) VALUES (?, ?)
       ON CONFLICT(clave) DO UPDATE SET ultimo_en = excluded.ultimo_en`,
      [h.clave, ahora],
    );
  }
  return nuevos;
}

// ── la corrida ───────────────────────────────────────────────────────────────

export interface ResultadoVigia {
  hallazgos: Hallazgo[];
  avisados: Hallazgo[];
  resumenSemanal: boolean;
}

/**
 * Una pasada del vigía. **Nunca lanza**: si el vigía se cae, se lleva el cron
 * entero y con él la purga y los seguimientos.
 *
 * `completa` decide qué tan a fondo: la corrida de cada hora solo mira si el
 * bot está vivo y si está mudo (barata, sin tocar Zernio); la de cada día
 * revisa además toda la configuración y arregla lo que puede.
 */
export async function corridaVigia(
  env: Env,
  opciones: { completa?: boolean; ahora?: number } = {},
): Promise<ResultadoVigia> {
  const ahora = opciones.ahora ?? Date.now();
  const completa = opciones.completa ?? false;
  const hallazgos: Hallazgo[] = [];

  const suma = async (p: Promise<Hallazgo[]>, etiqueta: string) => {
    try {
      hallazgos.push(...(await p));
    } catch (e) {
      console.error(`[vigia] ${etiqueta}:`, e);
    }
  };

  await suma(pruebaDeVidaCerebro(env), "cerebro");
  await suma(detectaSilencio(env, ahora), "silencio");

  if (completa) {
    for (const { nombre, key } of await clavesZernio(env)) {
      await suma(revisaWebhooks(env, nombre, key), `webhooks ${nombre}`);
      try {
        const { hallazgos: hs, cuentas } = await revisaCuentas(env, nombre, key, ahora);
        hallazgos.push(...hs);
        await suma(revisaEmbudos(env, nombre, key, cuentas), `embudos ${nombre}`);
      } catch (e) {
        console.error(`[vigia] cuentas ${nombre}:`, e);
      }
    }
  }

  // Lunes: una línea aunque todo esté bien, para saber que el vigía respira.
  const esLunes = new Date(ahora).getUTCDay() === 1;
  const resumenSemanal = completa && esLunes;

  let avisados: Hallazgo[] = [];
  try {
    avisados = await filtraPorEnfriamiento(env, hallazgos, ahora);
  } catch (e) {
    console.error("[vigia] enfriamiento:", e);
    avisados = hallazgos; // mejor avisar de más que quedarse callado por un fallo de base
  }

  try {
    await avisa(env, avisados, { resumenSemanal, revisados: hallazgos.length });
  } catch (e) {
    console.error("[vigia] aviso:", e);
  }

  console.log(
    "[vigia] corrida",
    JSON.stringify({
      completa,
      hallazgos: hallazgos.length,
      avisados: avisados.length,
      arreglados: hallazgos.filter((h) => h.nivel === "arreglado").length,
    }),
  );
  return { hallazgos, avisados, resumenSemanal };
}

/** Un solo mensaje de Telegram, o ninguno. Nunca uno por hallazgo. */
async function avisa(
  env: Env,
  hallazgos: Hallazgo[],
  ctx: { resumenSemanal: boolean; revisados: number },
): Promise<void> {
  const { messageOwner } = await import("../tools/handoffHuman");
  const alertas = hallazgos.filter((h) => h.nivel === "alerta");
  const arreglados = hallazgos.filter((h) => h.nivel === "arreglado");

  if (alertas.length === 0 && arreglados.length === 0) {
    if (ctx.resumenSemanal) {
      await messageOwner(env, {
        heading: "✅ Revisión semanal del bot",
        body: "Todo en orden: el bot contesta, los webhooks están completos, las cuentas conectadas y los embudos encendidos.",
      });
    }
    return;
  }

  const lineas: string[] = [];
  if (alertas.length) lineas.push(...alertas.map((h) => `• ${h.texto}`));
  if (arreglados.length) {
    if (alertas.length) lineas.push("");
    lineas.push("Esto se arregló solo:");
    lineas.push(...arreglados.map((h) => `• ${h.texto}`));
  }
  await messageOwner(env, {
    heading: alertas.length ? "⚠️ Revisión del bot" : "🔧 El bot se arregló solo",
    body: lineas.join("\n"),
    url: env.DASHBOARD_BASE_URL ? `${env.DASHBOARD_BASE_URL}/admin` : undefined,
  });
}
