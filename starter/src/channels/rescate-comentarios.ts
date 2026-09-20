/**
 * RED DE SEGURIDAD DEL EMBUDO DE COMENTARIOS.
 *
 * El embudo (comentario → DM automático → el bot toma la plática) lo hace
 * Zernio, no este Worker. Funciona — pero tiene una regla que no se puede
 * apagar desde su API:
 *
 *   **una automatización manda UN SOLO DM por persona, para siempre.**
 *
 * La segunda vez que alguien comenta —aunque sea semanas después y en OTRA
 * publicación— Zernio anota `status: "skipped"` con
 * `error: "Already sent DM to this commenter"` y no manda nada. Ni el privado,
 * ni la respuesta pública: la publicación se queda sin contestar y la persona
 * sin mensaje.
 *
 * Eso es lo que el dueño reportó el 2026-09-20 ("alguien comentó y no salió el
 * privado"), y estaba pasando en las dos cuentas. No era un permiso, ni una
 * automatización apagada, ni un webhook: era esta regla.
 *
 * Aquí el Worker se para donde Zernio se calla. Con `comment.received`:
 *   1. lee la automatización viva de esa cuenta — de ahí saca el texto, así
 *      que el guion sigue teniendo UN solo dueño (el panel de Zernio) y esto
 *      no es una segunda copia que se desincroniza;
 *   2. vuelve a aplicar sus `excludeKeywords` — un reclamo NUNCA recibe un DM
 *      de venta, lo atiende el asesor a mano;
 *   3. intenta la respuesta privada.
 *
 * **Meta es el árbitro, no nosotros.** Un comentario admite EXACTAMENTE UNA
 * respuesta privada. Si Zernio ya mandó la suya, nuestra llamada vuelve con
 * 400 y `details.privateReplyConsumed` y aquí no pasa nada; si Zernio se saltó
 * el comentario, la nuestra entra. Por eso no hay que adivinar quién va
 * primero ni consultar la bitácora: la plataforma no deja que salgan dos.
 * Es la misma idea de `src/leads/rescate.ts` — cubrir el hueco sin duplicar
 * lo que ya funcionó.
 *
 * Y por eso mismo la respuesta pública va DESPUÉS y solo si el privado fue
 * nuestro: quien gana el privado es quien contesta en público, así nunca
 * quedan dos respuestas colgando del mismo comentario. El lío de ManyChat
 * —dos voces contestándole a la misma persona— no se vuelve a sembrar.
 *
 * **Vive en `src/`: `forjabot update` lo borra.**
 */
import type { Env } from "../env";
import { Db } from "../db/client";

const DEFAULT_BASE = "https://zernio.com/api/v1";
function zernioBase(env: Env): string {
  return (env.ZERNIO_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
}

/**
 * Cuánto se espera antes de intentar el privado.
 *
 * Zernio decide en milisegundos, por dentro; nuestro webhook da la vuelta por
 * internet. En la práctica Zernio siempre llega primero, pero si alguna vez no
 * fuera así, ganarle la carrera dejaría su bitácora en `failed` y sus números
 * mintiendo. Esta pausa deja que el dueño del embudo actúe primero y nos deja
 * a nosotros el papel que queremos: el de red, no el de competencia.
 */
export const ESPERA_ANTES_DEL_RESCATE_MS = 15_000;

/**
 * Ventana en la que no se le vuelve a escribir a la misma persona.
 *
 * Meta ya impide dos privados por comentario, pero no impide dos comentarios.
 * El 2026-09-20 alguien comentó "Infi" y se corrigió con "Info" tres segundos
 * después: son dos comentarios distintos, dos privados permitidos, y la
 * persona recibiría el mismo mensaje dos veces. Seis horas es la misma ventana
 * que `LeadsRepo.VENTANA_MISMA_PLATICA_MS` usa para "esto sigue siendo la
 * misma plática".
 */
export const VENTANA_MISMO_COMENTARISTA_MS = 6 * 60 * 60 * 1000;

interface AutorComentario {
  id?: string;
  username?: string;
  name?: string;
  isOwnAccount?: boolean;
}
interface ComentarioZernio {
  id?: string;
  postId?: string | null;
  platformPostId?: string;
  platform?: string;
  text?: string;
  author?: AutorComentario;
  isReply?: boolean;
  parentCommentId?: string | null;
}
interface EventoComentario {
  event?: string;
  comment?: ComentarioZernio;
  account?: { id?: string; accountId?: string };
}

interface AutomatizacionZernio {
  id?: string;
  accountId?: string;
  isActive?: boolean;
  trigger?: string;
  keywords?: string[];
  matchMode?: string;
  excludeKeywords?: string[];
  dmMessage?: string;
  dmMessageVariations?: string[];
  commentReply?: string;
  commentReplyVariations?: string[];
}

/** Normaliza para comparar: minúsculas y sin acentos, como compara Zernio. */
function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * ¿Este comentario debe recibir DM según la automatización?
 *
 * Reproduce lo que Zernio ya decidió, con la config que él mismo nos dio.
 * `keywords: []` significa "cualquier comentario" (así lo pidió el dueño: quien
 * comenta "🔥" también se detuvo en la publicación). Las `excludeKeywords` son
 * la parte que NO se puede equivocar: *estafa, fraude, denuncia…* mandan a la
 * persona con el asesor, nunca con el guion de venta.
 */
export function comentarioCalifica(texto: string, auto: AutomatizacionZernio): boolean {
  const t = normaliza(texto ?? "");
  const modo = auto.matchMode ?? "contains";
  const pega = (k: string): boolean => {
    const n = normaliza(k);
    if (!n) return false;
    if (modo === "exact") return t.trim() === n;
    if (modo === "word") return new RegExp(`(^|\\W)${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`).test(t);
    return t.includes(n);
  };
  // Las exclusiones vetan incluso cuando una palabra clave también pega.
  for (const k of auto.excludeKeywords ?? []) if (pega(k)) return false;
  const claves = auto.keywords ?? [];
  if (claves.length === 0) return true; // "cualquier comentario"
  return claves.some(pega);
}

/**
 * La tabla se asegura en CADA escritura, a propósito: sin bandera de módulo.
 *
 * `zernio_ctx` cachea el "ya existe" con un `let`, y esa bandera vive en el
 * módulo, no en la base — si la base cambia por debajo (un redeploy con la
 * tabla recién borrada, por ejemplo) todas las escrituras fallan EN SILENCIO.
 * Ese patrón ya mordió una vez con `lead_origen`.
 */
async function aseguraTabla(db: Db): Promise<void> {
  await db.run(
    `CREATE TABLE IF NOT EXISTS comentarios_rescatados (
       comentarista TEXT NOT NULL, cuenta TEXT NOT NULL, comentario_id TEXT,
       enviado_en INTEGER NOT NULL, PRIMARY KEY (comentarista, cuenta))`,
  );
}

/** ¿Ya le escribimos a esta persona hace poco por esta cuenta? */
async function escritoHacePoco(
  env: Env,
  comentarista: string,
  cuenta: string,
  ahora: number,
): Promise<boolean> {
  const db = new Db(env.DB);
  await aseguraTabla(db);
  const fila = await db.first<{ enviado_en: number }>(
    "SELECT enviado_en FROM comentarios_rescatados WHERE comentarista = ? AND cuenta = ?",
    [comentarista, cuenta],
  );
  return !!fila && ahora - fila.enviado_en < VENTANA_MISMO_COMENTARISTA_MS;
}

async function anotaEnviado(
  env: Env,
  comentarista: string,
  cuenta: string,
  comentarioId: string,
  ahora: number,
): Promise<void> {
  const db = new Db(env.DB);
  await aseguraTabla(db);
  await db.run(
    `INSERT INTO comentarios_rescatados (comentarista, cuenta, comentario_id, enviado_en)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(comentarista, cuenta) DO UPDATE SET
       comentario_id = excluded.comentario_id, enviado_en = excluded.enviado_en`,
    [comentarista, cuenta, comentarioId, ahora],
  );
}

/** Una de las variantes del texto, al azar — igual que las rota Zernio. */
function alAzar(base: string, variantes?: string[]): string {
  const todas = [base, ...(variantes ?? [])].filter((t) => !!t && t.trim().length > 0);
  if (todas.length === 0) return base;
  return todas[Math.floor(Math.random() * todas.length)];
}

async function traeAutomatizacion(
  env: Env,
  apiKey: string,
  accountId: string,
): Promise<AutomatizacionZernio | null> {
  const res = await fetch(`${zernioBase(env)}/comment-automations`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error(`[rescate-comentarios] no se pudo leer las automatizaciones (${res.status})`);
    return null;
  }
  const body = (await res.json()) as { automations?: AutomatizacionZernio[] };
  const viva = (body.automations ?? []).find(
    (a) => a.accountId === accountId && a.isActive !== false && (a.trigger ?? "comment") === "comment",
  );
  return viva ?? null;
}

/**
 * Cubre un comentario que el embudo de Zernio dejó sin contestar.
 *
 * **Nunca lanza.** Zernio reintenta el evento si no le contestamos 200, y un
 * error aquí no debe convertirse en un bucle de entregas.
 *
 * Devuelve true solo si ESTE Worker mandó el privado.
 */
export async function rescataComentario(
  ev: unknown,
  env: Env,
  opciones: { esperaMs?: number } = {},
): Promise<boolean> {
  const e = ev as EventoComentario;
  if (e?.event !== "comment.received") return false;
  const c = e.comment;
  if (!c?.id || !c.platformPostId) return false;

  // La respuesta privada es solo de Meta. En el resto de plataformas no existe.
  if (c.platform !== "instagram" && c.platform !== "facebook") return false;

  // Nuestras propias respuestas públicas vuelven como comentarios. Contestarnos
  // a nosotros mismos sería un bucle.
  if (c.author?.isOwnAccount) return false;

  // Una respuesta DENTRO de un hilo no se rescata: el privado de Meta cuelga
  // del comentario de primer nivel, y el hilo de abajo suele ser la plática que
  // el asesor ya está llevando a mano.
  if (c.isReply) return false;

  const comentarista = c.author?.id?.trim();
  if (!comentarista) return false;
  const accountId = e.account?.accountId || e.account?.id;
  if (!accountId) return false;

  try {
    // El reparto por asesor vive en `member/` (sobrevive `forjabot update`); se
    // importa en caliente para no arrastrarlo a pruebas que no lo necesitan.
    let apiKey: string | undefined;
    try {
      const { claveZernioDeCuenta } = await import("../../member/asesores.local");
      apiKey = claveZernioDeCuenta(env, accountId).apiKey;
    } catch {
      apiKey = env.ZERNIO_API_KEY; // sin reparto configurado: la clave de siempre
    }
    if (!apiKey) {
      console.error(
        `[rescate-comentarios] sin clave para la cuenta ${accountId} — no se puede rescatar`,
      );
      return false;
    }

    const auto = await traeAutomatizacion(env, apiKey, accountId);
    if (!auto?.dmMessage) return false; // esa cuenta no tiene embudo: nada que cubrir

    if (!comentarioCalifica(c.text ?? "", auto)) {
      console.log(
        "[rescate-comentarios] comentario excluido (lo atiende el asesor)",
        JSON.stringify({ comentario: c.id }),
      );
      return false;
    }

    const ahora = Date.now();
    if (await escritoHacePoco(env, comentarista, accountId, ahora)) {
      console.log(
        "[rescate-comentarios] ya le escribimos hace poco a esta persona",
        JSON.stringify({ comentarista }),
      );
      return false;
    }

    // Que Zernio tenga su turno primero (ver ESPERA_ANTES_DEL_RESCATE_MS).
    const espera = opciones.esperaMs ?? ESPERA_ANTES_DEL_RESCATE_MS;
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));

    const post = encodeURIComponent(c.platformPostId);
    const com = encodeURIComponent(c.id);
    const res = await fetch(`${zernioBase(env)}/inbox/comments/${post}/${com}/private-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      // Sin botones a propósito: los de Zernio son de enlace, y un enlace NO
      // abre la ventana de 24h de Instagram — solo la abre un mensaje de la
      // persona. Por eso el DM termina pidiendo respuesta, no un toque.
      body: JSON.stringify({ accountId, message: alAzar(auto.dmMessage, auto.dmMessageVariations) }),
    });

    if (!res.ok) {
      const cuerpo = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: { privateReplyConsumed?: boolean };
      };
      if (cuerpo?.details?.privateReplyConsumed) {
        // Zernio llegó primero. Es el caso bueno: el embudo funcionó solo.
        console.log(
          "[rescate-comentarios] el privado ya lo mandó Zernio — nada que hacer",
          JSON.stringify({ comentario: c.id }),
        );
        return false;
      }
      console.error(
        `[rescate-comentarios] privado rechazado (${res.status}): ${String(cuerpo?.error ?? "").slice(0, 200)}`,
      );
      return false;
    }

    await anotaEnviado(env, comentarista, accountId, c.id, ahora);
    console.log(
      "[rescate-comentarios] privado rescatado — Zernio se lo había saltado",
      JSON.stringify({ comentario: c.id, plataforma: c.platform, cuenta: accountId }),
    );

    // El privado fue nuestro, así que la respuesta pública también nos toca: si
    // no, la publicación se queda sin contestar a la vista de todos.
    const publica = auto.commentReply
      ? alAzar(auto.commentReply, auto.commentReplyVariations)
      : "";
    if (publica) {
      const r2 = await fetch(`${zernioBase(env)}/inbox/comments/${post}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          // Si el 200 se pierde de vuelta, el reintento no publica dos veces.
          "Idempotency-Key": `rescate-${c.id}`,
        },
        body: JSON.stringify({ accountId, message: publica, commentId: c.id }),
      });
      if (!r2.ok) {
        console.error(`[rescate-comentarios] respuesta pública rechazada (${r2.status})`);
      }
    }
    return true;
  } catch (err) {
    console.error("[rescate-comentarios]", err);
    return false;
  }
}
