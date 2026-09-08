// member/asesores.local.ts — quién es quién cuando hay más de un asesor.
//
// Vive en member/ A PROPÓSITO: `forjabot update` reemplaza src/ pero NUNCA toca
// esta carpeta. El día de una actualización, el reparto de leads sobrevive solo;
// lo único que hay que re-aplicar son los enganches en src/ (ver el README del
// proyecto).
//
// ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
// Dos asesores autorizados del MISMO negocio comparten un solo bot: una
// licencia, un Worker, una base de datos. Lo que NO comparten son los
// prospectos. Este archivo es el que decide de quién es cada lead.
//
// La pista viene de Zernio: cada mensaje llega con el `accountId` de la cuenta
// por la que entró (la página de Facebook o el Instagram de UNO de los dos), y
// ese id se guarda en `zernio_ctx` junto con la conversación. De ahí se deduce
// el asesor, sin preguntarle nada al cliente y sin tocar el esquema de la base.
//
// ── LO QUE NO CUBRE ─────────────────────────────────────────────────────────
// El sitio web, el chat de la página, Telegram y WhatsApp NO traen accountId:
// esos caen en ASESOR_POR_DEFECTO. Es lo correcto hoy, porque el sitio y el
// número son de él. Si el segundo asesor quiere sus propios leads de web,
// necesita su propio sitio — eso ya es otro bot.

import { Db } from "../src/db/client";
import type { Env } from "../src/env";

export interface Asesor {
  /** Identificador corto y estable. Es lo que se guarda en cada lead. */
  slug: string;
  nombre: string;
  /**
   * Chat de Telegram donde recibe SUS avisos de lead caliente. Si se deja
   * vacío, el aviso cae en `OWNER_TELEGRAM_CHAT_ID` — o sea, en el dueño.
   * Es el mismo bot de Telegram para todos: solo cambia el destinatario.
   */
  telegramChatId?: string;
  /**
   * Correos con los que entra al panel. Con cualquiera de ellos ve SOLO sus
   * leads. La contraseña maestra sigue viendo todo, siempre.
   */
  emails: string[];
  /**
   * Los `_id` de sus cuentas en Zernio (`GET /api/v1/accounts` — el campo es
   * `_id`, no `id`). Una por red: Facebook, Instagram…
   */
  cuentasZernio: string[];
  /**
   * Solo si el asesor tiene su PROPIA cuenta de Zernio (no las redes colgadas
   * de la del dueño). Aquí van los NOMBRES de los secrets, jamás las claves:
   * este archivo está en git y una clave escrita aquí queda en el historial
   * para siempre. Las claves se guardan con `wrangler secret put <NOMBRE>`.
   *
   * Omitirlo = usa las del dueño (`ZERNIO_API_KEY` / `ZERNIO_WEBHOOK_SECRET`),
   * que es el caso cuando sus redes cuelgan de la cuenta del dueño.
   */
  zernio?: {
    /** Secret con el Bearer de SU cuenta. Ej: "ZERNIO_API_KEY_SEGUNDO". */
    apiKeyVar: string;
    /** Secret con el que SU Zernio firma el webhook. */
    webhookSecretVar: string;
  };
}

/**
 * Nombres de secret aceptados. Restringirlo no es paranoia de más: el nombre
 * sale de este archivo y se usa para leer `env` por índice, así que una entrada
 * rara (`"__proto__"`, algo con espacios) devolvería basura en vez de una clave
 * y el fallo se vería como "Zernio no contesta", que es de lo más caro de
 * diagnosticar.
 */
const NOMBRE_SECRET = /^[A-Z][A-Z0-9_]*$/;

/** Lee un secret por nombre. `undefined` si no existe o el nombre no es válido. */
function secret(env: Env, nombre: string | undefined): string | undefined {
  if (!nombre || !NOMBRE_SECRET.test(nombre)) return undefined;
  const v = (env as unknown as Record<string, unknown>)[nombre];
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/**
 * La clave con la que hay que CONTESTAR por una cuenta de Zernio.
 *
 * Si la cuenta es de un asesor con Zernio propio, su clave. Si no —cuenta del
 * dueño, o una cuenta que todavía no está en esta lista— la del dueño, que es
 * exactamente como se comportaba el bot antes de que existiera esto.
 *
 * Contestar con la clave equivocada no es un error silencioso cualquiera: le
 * respondería al cliente de alguien más desde la cuenta de otro. Por eso el
 * caso "el asesor declaró Zernio propio pero su secret no está puesto" NO cae
 * a la del dueño: se queda sin clave y quien llama lo reporta.
 */
export function claveZernioDeCuenta(
  env: Env,
  accountId: string | null | undefined,
  lista: Asesor[] = ASESORES,
): { apiKey?: string; asesor?: Asesor; faltaSecret?: string } {
  const asesor = asesorDeCuenta(accountId, lista);
  if (asesor?.zernio) {
    const apiKey = secret(env, asesor.zernio.apiKeyVar);
    return apiKey ? { apiKey, asesor } : { asesor, faltaSecret: asesor.zernio.apiKeyVar };
  }
  return { apiKey: env.ZERNIO_API_KEY, asesor: asesor ?? undefined };
}

/**
 * Todos los secrets con los que puede venir firmado un webhook de Zernio: el
 * del dueño más el de cada asesor con cuenta propia.
 *
 * Se prueban todos porque la firma es lo ÚNICO que llega antes de poder leer
 * el cuerpo — no hay forma de saber de qué cuenta viene sin verificarla
 * primero. Con dos o seis asesores son dos o seis HMAC de un cuerpo chico;
 * si algún día fueran cientos, habría que cambiar de enfoque.
 *
 * Sin duplicados: dos asesores apuntando al mismo secret no lo prueban dos
 * veces.
 */
export function secretosWebhookZernio(env: Env, lista: Asesor[] = ASESORES): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  const mete = (s: string | undefined) => {
    if (s && !vistos.has(s)) { vistos.add(s); salida.push(s); }
  };
  mete(env.ZERNIO_WEBHOOK_SECRET);
  for (const a of lista) mete(secret(env, a.zernio?.webhookSecretVar));
  return salida;
}

export const ASESORES: Asesor[] = [
  {
    slug: "joswuar",
    nombre: "Joswuar",
    emails: [],
    cuentasZernio: [
      "6a8e644777555aae018b7c37", // Facebook · Ciudad Maderas
      "6a91166377555aae013db017", // Instagram · ciudadmaderaswoodcity
    ],
  },
  {
    slug: "paula",
    nombre: "Paula Amador",
    // Su chat con @ciudadmaderas_avisos_bot. Mismo bot que el del dueño, otro
    // destinatario: sus leads calientes le suenan a ELLA y al dueño no.
    telegramChatId: "8693208995",
    // Con ESTE correo entra al panel y ve SOLO sus prospectos. El usuario de
    // la pestaña Equipo tiene que llevar el mismo, letra por letra: si no
    // coincide, no ve nada y el panel le dice por qué (preferimos eso a
    // enseñarle los prospectos de todos por un dedazo).
    emails: ["paula.amador.cdmaderas@gmail.com"],
    cuentasZernio: [
      "6a9f52f177555aae01ef1b70", // Facebook · Paula y Ciudad Maderas
      "6a9f5d9c77555aae01ef51b1", // Instagram · c.maderaspaula
    ],
    zernio: {
      apiKeyVar: "ZERNIO_API_KEY_PAULA",
      webhookSecretVar: "ZERNIO_WEBHOOK_SECRET_PAULA",
    },
  },
  // ── Tercer asesor ─────────────────────────────────────────────────────────
  // Necesita cuatro cosas suyas: sus `_id` de Zernio, su chat de Telegram (que
  // le escriba /start al bot de avisos), el correo con el que entrará al panel
  // y —si tiene cuenta de Zernio propia— sus dos claves.
  //
  // Las claves NO se escriben aquí. Aquí van los NOMBRES; las claves se guardan
  // aparte y él las pega en la terminal, en campo oculto:
  //
  //   wrangler secret put ZERNIO_API_KEY_SEGUNDO
  //   wrangler secret put ZERNIO_WEBHOOK_SECRET_SEGUNDO
  //
  // {
  //   slug: "segundo",
  //   nombre: "Nombre del asesor",
  //   telegramChatId: "123456789",
  //   emails: ["correo@ejemplo.com"],
  //   cuentasZernio: ["...", "..."],
  //   zernio: {
  //     apiKeyVar: "ZERNIO_API_KEY_SEGUNDO",
  //     webhookSecretVar: "ZERNIO_WEBHOOK_SECRET_SEGUNDO",
  //   },
  // },
];

/**
 * A quién pertenece lo que no trae cuenta de Zernio: el sitio web, su
 * formulario, el chat de la página, Telegram y WhatsApp. También los leads
 * viejos, de antes de que existiera este reparto.
 */
export const ASESOR_POR_DEFECTO = "joswuar";

/** El asesor por defecto, ya resuelto. `null` si el slug no existe. */
export function asesorPorDefecto(): Asesor | null {
  return ASESORES.find((a) => a.slug === ASESOR_POR_DEFECTO) ?? null;
}

export function asesorPorSlug(slug: string | null | undefined, lista: Asesor[] = ASESORES): Asesor | null {
  if (!slug) return null;
  return lista.find((a) => a.slug === slug) ?? null;
}

/** El asesor dueño de una cuenta de Zernio (Facebook o Instagram). */
export function asesorDeCuenta(accountId: string | null | undefined, lista: Asesor[] = ASESORES): Asesor | null {
  if (!accountId) return null;
  return lista.find((a) => a.cuentasZernio.includes(accountId)) ?? null;
}

/**
 * El asesor que corresponde a un correo del panel. Se compara en minúsculas y
 * sin espacios: el correo lo teclea una persona al aceptar la invitación.
 */
export function asesorDeEmail(email: string | null | undefined, lista: Asesor[] = ASESORES): Asesor | null {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return null;
  return lista.find((a) => a.emails.some((x) => x.trim().toLowerCase() === e)) ?? null;
}

/**
 * El asesor dueño de una conversación. Busca el `accountId` que el adapter de
 * Zernio guardó en `zernio_ctx` y lo traduce.
 *
 * **Nunca lanza.** Si la tabla no existe todavía (bot sin Zernio) o la consulta
 * falla, cae en el asesor por defecto: es preferible que un lead aparezca en la
 * lista equivocada a que se pierda el registro por un error de reparto.
 */
export async function asesorDeConversacion(
  env: Env,
  conversationId: string | null,
): Promise<Asesor | null> {
  if (!conversationId) return asesorPorDefecto();
  try {
    const fila = await new Db(env.DB).first<{ account_id: string }>(
      "SELECT account_id FROM zernio_ctx WHERE conversation_id = ? ORDER BY updated_at DESC LIMIT 1",
      [conversationId],
    );
    return asesorDeCuenta(fila?.account_id) ?? asesorPorDefecto();
  } catch {
    return asesorPorDefecto();
  }
}

/**
 * Con un solo asesor configurado no hay nada que repartir: el panel enseña
 * todo y el aviso va al dueño. Sirve para que el filtro del panel no aparezca
 * —ni pueda esconder nada— mientras el segundo asesor no exista.
 */
export function hayVariosAsesores(lista: Asesor[] = ASESORES): boolean {
  return lista.length > 1;
}

/** Qué leads puede ver quien está viendo el panel ahora mismo. */
export type FiltroLeads =
  | { modo: "todo" }
  | { modo: "asesor"; slug: string; nombre: string; esPorDefecto: boolean }
  | { modo: "ninguno"; motivo: string };

/**
 * Decide qué lista de leads le toca a la sesión abierta.
 *
 * El middleware del panel ya dejó `PANEL_ROLE` y `PANEL_EMAIL` en `env` (ver
 * src/admin/routes.ts), así que aquí solo hay que traducirlos.
 *
 * Reglas, en orden:
 *   1. Un solo asesor configurado → TODO. Nada que repartir; el panel se
 *      comporta exactamente igual que antes de que esto existiera.
 *   2. Contraseña maestra (`master`) → TODO. Es el rescate del dueño y nunca
 *      se le esconde nada.
 *   3. El correo está en la lista → solo los leads de ESE asesor.
 *   4. El correo NO está en la lista → NINGUNO, con el motivo a la vista.
 *
 * El paso 4 es a propósito el que falla ruidoso. La alternativa —enseñarle
 * todo a un correo desconocido— convierte un dedazo al escribir el correo en
 * una fuga de los prospectos del otro asesor, y nadie se enteraría. Una lista
 * vacía que dice por qué está vacía se arregla en un minuto.
 */
export function filtroDeLeads(
  env: { PANEL_ROLE?: string; PANEL_EMAIL?: string },
  lista: Asesor[] = ASESORES,
  porDefecto: string = ASESOR_POR_DEFECTO,
): FiltroLeads {
  if (!hayVariosAsesores(lista)) return { modo: "todo" };
  if (env.PANEL_ROLE === "master") return { modo: "todo" };

  const asesor = asesorDeEmail(env.PANEL_EMAIL, lista);
  if (asesor) {
    return {
      modo: "asesor",
      slug: asesor.slug,
      nombre: asesor.nombre,
      esPorDefecto: asesor.slug === porDefecto,
    };
  }
  return {
    modo: "ninguno",
    motivo:
      "Tu correo no está asignado a ningún asesor. Pídele al administrador que " +
      "lo agregue en la lista de asesores del bot.",
  };
}

/** ¿Este lead es de quien lo está mirando? Gobierna cambiar estado y borrar. */
export function puedeTocarLead(filtro: FiltroLeads, asesorDelLead: string | null): boolean {
  if (filtro.modo === "todo") return true;
  if (filtro.modo === "ninguno") return false;
  // Sin dueño = del asesor por defecto (leads viejos y los del sitio web).
  if (!asesorDelLead) return filtro.esPorDefecto;
  return asesorDelLead === filtro.slug;
}
