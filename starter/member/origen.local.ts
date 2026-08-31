// member/origen.local.ts — de dónde vino cada prospecto.
//
// Vive en member/ a propósito: `forjabot update` reemplaza src/ pero nunca
// toca esta carpeta.
//
// ── PARA QUÉ ────────────────────────────────────────────────────────────────
// Sin esto, un lead en el panel no dice de dónde salió. Da igual mientras todo
// sea orgánico; en cuanto se gasta dinero en anuncios, es la diferencia entre
// optimizar y adivinar: cuál ciudad, cuál gancho y cuál red traen CALIENTES, y
// cuáles solo traen curiosos.
//
// Se guardan tres cosas, de la más segura a la menos:
//
//   canal   — instagram / facebook / whatsapp / telegram / web / formulario_web.
//             Siempre se sabe. Sale de la conversación, sin depender de nadie.
//   ref     — la etiqueta de campaña. En la web viene del `?ref=` de la URL
//             (lo que él pone en su bio de Instagram, en un anuncio, en un
//             volante con QR). En un anuncio de Meta, del referral.
//   ad      — el id del anuncio de Meta que abrió la conversación.
//
// ── POR QUÉ SE GUARDA EL PAYLOAD CRUDO ──────────────────────────────────────
// La forma exacta del evento `referral.received` NO está documentada en
// docs.zernio.com — se confirmó que el evento existe (está en el enum de
// webhooks de su OpenAPI), pero no sus campos. En vez de inventar nombres, se
// intentan varias rutas conocidas de Meta Y se guarda el objeto completo en
// `crudo`. El primer anuncio real nos dice la forma verdadera; si `ad` sale
// vacío y `crudo` trae datos, ahí está la respuesta y se ajusta la extracción.

import { Db } from "../src/db/client";
import type { Env } from "../src/env";

export interface Origen {
  canal: string;
  ref?: string | null;
  ad?: string | null;
  adTitulo?: string | null;
}

/**
 * Limpia una etiqueta de campaña. Viene de una URL pública, así que se trata
 * como texto hostil: minúsculas, solo caracteres seguros y corta. Sin esto, un
 * `?ref=` con comillas o HTML acabaría pintado en el panel.
 */
export function limpiaRef(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  const limpio = s.replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return limpio ? limpio.slice(0, 60) : null;
}

/**
 * La etiqueta de campaña de una URL. Acepta `ref` (lo corto, para poner a mano
 * en una bio o un QR) y los `utm_*` de siempre, que es lo que pegan las
 * herramientas de anuncios.
 */
export function refDeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const q = new URL(url).searchParams;
    for (const k of ["ref", "utm_source", "utm_campaign", "utm_medium"]) {
      const v = limpiaRef(q.get(k));
      if (v) return v;
    }
  } catch {
    // URL basura: no es motivo para tirar un lead.
  }
  return null;
}

/**
 * La tabla se asegura en CADA escritura, sin caché.
 *
 * Tentador guardarse un `let yaEstá = true` a nivel de módulo —así lo hace
 * `zernio_ctx`—, pero esa bandera vive en el módulo, no en la base: si la base
 * cambia por debajo, la bandera sigue diciendo que la tabla existe y todas las
 * escrituras fallan en silencio. Se destapó en las pruebas, donde cada caso
 * levanta una base nueva: la primera creaba la tabla y las siguientes perdían
 * la atribución sin un solo error visible. Un CREATE TABLE IF NOT EXISTS por
 * lead no se nota; perder de dónde vino un prospecto, sí.
 */
async function tabla(db: Db): Promise<void> {
  await db.run(
    `CREATE TABLE IF NOT EXISTS lead_origen (
       channel_user_id TEXT PRIMARY KEY,
       ref TEXT, ad_id TEXT, ad_titulo TEXT, crudo TEXT,
       updated_at INTEGER NOT NULL)`,
  );
}

/** Deja lo que sepamos del origen de una persona. Nunca lanza. */
export async function guardaOrigen(
  env: Env,
  channelUserId: string,
  datos: { ref?: string | null; adId?: string | null; adTitulo?: string | null; crudo?: unknown },
): Promise<void> {
  if (!channelUserId) return;
  try {
    const db = new Db(env.DB);
    await tabla(db);
    // Se conserva lo que ya había si lo nuevo viene vacío: el primer toque es
    // el que trae la campaña, y los mensajes siguientes no deben borrarla.
    await db.run(
      `INSERT INTO lead_origen (channel_user_id, ref, ad_id, ad_titulo, crudo, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(channel_user_id) DO UPDATE SET
         ref = COALESCE(excluded.ref, lead_origen.ref),
         ad_id = COALESCE(excluded.ad_id, lead_origen.ad_id),
         ad_titulo = COALESCE(excluded.ad_titulo, lead_origen.ad_titulo),
         crudo = COALESCE(excluded.crudo, lead_origen.crudo),
         updated_at = excluded.updated_at`,
      [
        channelUserId,
        limpiaRef(datos.ref),
        datos.adId ? String(datos.adId).slice(0, 64) : null,
        datos.adTitulo ? String(datos.adTitulo).slice(0, 200) : null,
        datos.crudo ? JSON.stringify(datos.crudo).slice(0, 2000) : null,
        Date.now(),
      ],
    );
  } catch (e) {
    console.error("[origen] guardar:", e);
  }
}

/** Busca en un objeto anidado la primera ruta que traiga algo. */
function primera(obj: unknown, rutas: string[][]): string | null {
  for (const ruta of rutas) {
    let v: any = obj;
    for (const k of ruta) v = v?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/**
 * Saca la atribución de un evento de referral, probando las rutas que Meta usa
 * para Click-to-Message. Devuelve `null` si el evento no trae nada útil, pero
 * el crudo SIEMPRE se conserva: es lo que nos va a decir la forma real la
 * primera vez que corra un anuncio de verdad.
 */
export function extraeAnuncio(ev: unknown): {
  adId: string | null;
  adTitulo: string | null;
  ref: string | null;
  crudo: unknown;
} {
  const e = ev as Record<string, any>;
  const r = e?.referral ?? e?.message?.referral ?? e?.data?.referral ?? e;
  return {
    adId: primera(r, [["adId"], ["ad_id"], ["ad", "id"], ["adID"], ["sourceId"], ["source_id"]]),
    adTitulo: primera(r, [["adTitle"], ["ad_title"], ["ad", "title"], ["headline"]]),
    ref: limpiaRef(primera(r, [["ref"], ["refParam"], ["ref_param"], ["source"], ["type"]])),
    crudo: r ?? null,
  };
}

/**
 * El canal legible de una conversación. `zernio` no dice nada por sí solo —
 * puede ser Instagram o Messenger—, así que se afina con la plataforma que el
 * adapter guardó en `zernio_ctx`.
 */
async function canalDe(db: Db, conversationId: string): Promise<{ canal: string; usuario: string | null }> {
  const conv = await db
    .first<{ channel: string; channel_user_id: string }>(
      "SELECT channel, channel_user_id FROM conversations WHERE id = ?",
      [conversationId],
    )
    .catch(() => null);
  if (!conv) return { canal: "desconocido", usuario: null };
  if (conv.channel !== "zernio") return { canal: conv.channel, usuario: conv.channel_user_id };
  const ctx = await db
    .first<{ platform: string | null }>(
      "SELECT platform FROM zernio_ctx WHERE conversation_id = ? ORDER BY updated_at DESC LIMIT 1",
      [conversationId],
    )
    .catch(() => null);
  return { canal: (ctx?.platform || "zernio").toLowerCase(), usuario: conv.channel_user_id };
}

/**
 * El origen completo de una conversación, listo para meter en la metadata del
 * lead. **Nunca lanza**: un fallo de atribución jamás debe costar un lead.
 */
export async function origenDeConversacion(
  env: Env,
  conversationId: string | null,
): Promise<Origen> {
  if (!conversationId) return { canal: "desconocido" };
  try {
    const db = new Db(env.DB);
    const { canal, usuario } = await canalDe(db, conversationId);
    if (!usuario) return { canal };
    await tabla(db).catch(() => {});
    const o = await db
      .first<{ ref: string | null; ad_id: string | null; ad_titulo: string | null }>(
        "SELECT ref, ad_id, ad_titulo FROM lead_origen WHERE channel_user_id = ?",
        [usuario],
      )
      .catch(() => null);
    return { canal, ref: o?.ref ?? null, ad: o?.ad_id ?? null, adTitulo: o?.ad_titulo ?? null };
  } catch (e) {
    console.error("[origen] resolver:", e);
    return { canal: "desconocido" };
  }
}

/** Los campos del origen, sin los vacíos, para no ensuciar la metadata. */
export function metadataDeOrigen(o: Origen): Record<string, string> {
  const m: Record<string, string> = { canal: o.canal };
  if (o.ref) m.campana = o.ref;
  if (o.ad) m.anuncio = o.ad;
  if (o.adTitulo) m.anuncio_titulo = o.adTitulo;
  return m;
}
