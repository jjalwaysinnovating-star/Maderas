import type { Env } from "../env";
import { Db } from "../db/client";

// Bóveda (superpoder Forja+): archiva las imágenes/documentos que mandan los
// clientes. Las URLs que dan los proveedores (WhatsApp/Telegram/Twilio) EXPIRAN
// o van con auth, así que para que el dueño las vea después hay que copiarlas al
// R2 del miembro (binding MEDIA). El panel las sirve tras su auth.

export type MediaKind = "image" | "document";

export interface MediaRow {
  id: string;
  conversation_id: string | null;
  r2_key: string;
  kind: MediaKind;
  mime: string | null;
  filename: string | null;
  caption: string | null;
  bytes: number | null;
  created_at: number;
}

/** ¿La Bóveda puede archivar? Necesita el superpoder ON (Pro, lo resuelve
 *  settings-loader) Y el bucket MEDIA provisionado (skill /boveda). Sin binding
 *  no hay dónde guardar → no-op silencioso. */
export function bovedaReady(env: Env, bovedaEnabled: boolean): boolean {
  return bovedaEnabled && !!env.MEDIA;
}

// Tabla auto-creada (mismo patrón que dedup/processed_messages): así funciona en
// bots ya instalados sin migración de schema.sql. Idempotente, una vez por isolate.
let ensured = false;
export async function ensureMediaTable(db: Db): Promise<void> {
  if (ensured) return;
  await db.run(
    `CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY, conversation_id TEXT, r2_key TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'image', mime TEXT, filename TEXT, caption TEXT,
      bytes INTEGER, created_at INTEGER NOT NULL)`,
  );
  await db.run("CREATE INDEX IF NOT EXISTS idx_media_conv ON media(conversation_id, created_at)");
  await db.run("CREATE INDEX IF NOT EXISTS idx_media_time ON media(created_at)");
  ensured = true;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

// Tope de tamaño: no vaciar el R2 del miembro con un archivo gigante. 20 MB
// cubre fotos y PDFs de cotización de sobra.
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Baja el archivo entrante desde la URL del proveedor (mientras aún sirve) y lo
 * copia al R2 del miembro, con su fila en `media`. FAIL-OPEN: cualquier falla
 * (URL muerta, R2 caído, archivo enorme) se traga — NUNCA rompe el turno del
 * bot; solo no se archiva. Devuelve el id de la fila o null.
 */
export async function captureIncomingMedia(
  env: Env,
  db: Db,
  opts: {
    conversationId: string;
    url: string;
    mime?: string;
    caption?: string;
    kind?: MediaKind;
  },
): Promise<string | null> {
  if (!env.MEDIA) return null;
  try {
    const res = await fetch(opts.url);
    if (!res.ok) return null;
    const mime = opts.mime || res.headers.get("content-type") || "application/octet-stream";
    const kind: MediaKind = opts.kind || (mime.startsWith("image/") ? "image" : "document");
    const body = await res.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return null;

    const id = crypto.randomUUID();
    const ext = EXT_BY_MIME[mime.toLowerCase()] || "bin";
    const key = `media/${opts.conversationId}/${id}.${ext}`;
    await env.MEDIA.put(key, body, { httpMetadata: { contentType: mime } });

    await ensureMediaTable(db);
    await db.run(
      `INSERT INTO media (id, conversation_id, r2_key, kind, mime, caption, bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, opts.conversationId, key, kind, mime, opts.caption ?? null, body.byteLength, Date.now()],
    );
    return id;
  } catch (e) {
    console.warn("[boveda] no se pudo archivar el media (se ignora):", e);
    return null;
  }
}
