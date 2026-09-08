// Canal ZERNIO — proveedor UNIFICADO (zernio.com): un solo webhook + una sola
// API para Instagram, Messenger, WhatsApp, Telegram, X DMs, Discord… Se agrega
// como canal ADICIONAL (no reemplaza los directos). Contrato verificado en vivo
// por Santi (2026-08-07).
//
//  • Recibir: webhook `message.received` (message.direction="incoming"). El texto
//    vive en message.text, el media en message.attachments[], la plataforma en
//    message.platform, el remitente en sender.id (estable por persona → el mejor
//    channelUserId) con sender.username legible. Dedup por el id del evento
//    (payload.id, también header X-Zernio-Event-Id).
//  • Firma:  X-Zernio-Signature = HMAC-SHA256(ZERNIO_WEBHOOK_SECRET, rawBody) hex
//    (alias legacy X-Late-Signature). Fail-closed.
//  • Responder: POST /inbox/conversations/{conversationId}/messages con Bearer y
//    body { accountId, message } — el campo es `message` (con `text` lo rechaza),
//    y accountId es OBLIGATORIO. Ambos (conversationId + accountId) llegan en el
//    webhook y son POR CONVERSACIÓN, así que se guardan en `zernio_ctx` al recibir
//    para poder responder después.
import type { ChannelAdapter, IncomingMessage, OutgoingReply } from "./shared";
import type { Env } from "../env";
import { Db } from "../db/client";

const DEFAULT_BASE = "https://zernio.com/api/v1";
function zernioBase(env: Env): string {
  return (env.ZERNIO_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
}

interface ZernioSender {
  id?: string;
  name?: string;
  username?: string;
  contactId?: string;
}
interface ZernioAttachment {
  type?: string;
  url?: string;
  contentType?: string;
  mimeType?: string;
}
interface ZernioMessage {
  id?: string;
  conversationId?: string;
  platform?: string;
  direction?: "incoming" | "outgoing";
  text?: string;
  attachments?: ZernioAttachment[];
  sender?: ZernioSender;
  // Taps de mensajes interactivos (botones): WhatsApp trae interactiveId/Type,
  // Telegram trae callbackData. En Meta el chip manda su texto como text normal.
  metadata?: {
    interactiveType?: string;
    interactiveId?: string;
    callbackData?: string;
  };
}
interface ZernioAccount {
  id?: string;
  accountId?: string;
  platform?: string;
  username?: string;
}
interface ZernioEvent {
  id?: string;
  event?: string;
  message?: ZernioMessage;
  account?: ZernioAccount;
  /** Solo en message.sent: la otra parte (el cliente), en ambas direcciones. */
  conversation?: { participantId?: string; participantName?: string };
}

// ── firma ────────────────────────────────────────────────────────────────────
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
/** HMAC-SHA256(secret, rawBody) hex contra X-Zernio-Signature. Fail-closed. */
export async function verifyZernioSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret || !signature) return false;
  const expected = await hmacHex(secret, rawBody);
  return timingSafeEqual(expected, signature.trim());
}

/**
 * Igual que la de arriba, pero contra VARIOS secrets: uno por cuenta de Zernio.
 *
 * Cuando un asesor tiene su propia cuenta de Zernio, su webhook firma con SU
 * clave, no con la del dueño. La firma es lo único que se puede mirar antes de
 * confiar en el cuerpo, así que no hay manera de saber de qué cuenta viene sin
 * probarlas todas.
 *
 * Sigue siendo fail-closed en los dos casos que importan: sin firma, y sin
 * ningún secret configurado. Un secreto de más en la lista no abre nada — cada
 * uno se compara igual de estricto que antes.
 */
export async function verificaFirmaZernio(
  rawBody: string,
  signature: string | null | undefined,
  secrets: string[],
): Promise<boolean> {
  if (!signature || secrets.length === 0) return false;
  for (const s of secrets) {
    if (await verifyZernioSignature(rawBody, signature, s)) return true;
  }
  return false;
}

// ── normalización ─────────────────────────────────────────────────────────────
/** Tolera un evento suelto o un batch (array / {items|events:[]}). */
export function normalizeZernioEvents(body: unknown): ZernioEvent[] {
  if (Array.isArray(body)) return body as ZernioEvent[];
  const o = (body ?? {}) as { items?: unknown; events?: unknown };
  if (Array.isArray(o.items)) return o.items as ZernioEvent[];
  if (Array.isArray(o.events)) return o.events as ZernioEvent[];
  return [body as ZernioEvent];
}

function pickMedia(atts: ZernioAttachment[] | undefined): { imageUrl?: string; audioUrl?: string } {
  const out: { imageUrl?: string; audioUrl?: string } = {};
  for (const a of atts ?? []) {
    if (!a?.url) continue;
    const kind = `${a.type ?? ""} ${a.contentType ?? ""} ${a.mimeType ?? ""}`.toLowerCase();
    if (!out.imageUrl && /image|photo/.test(kind)) out.imageUrl = a.url;
    else if (!out.audioUrl && /audio|voice/.test(kind)) out.audioUrl = a.url;
    // Nota: el shape exacto de attachments se confirma con un payload de media real.
  }
  return out;
}

/**
 * Un evento Zernio → 0/1 IncomingMessage. Solo procesa `message.received`
 * entrante (los `message.sent` / eco no entran al pipeline). channelUserId =
 * sender.id (estable por persona).
 */
export function parseZernioEvents(ev: ZernioEvent): IncomingMessage[] {
  if (ev?.event !== "message.received") return [];
  const m = ev.message;
  if (!m || m.direction === "outgoing") return [];
  const channelUserId = m.sender?.id?.trim();
  if (!channelUserId) return [];
  const { imageUrl, audioUrl } = pickMedia(m.attachments);
  return [
    {
      channel: "zernio",
      channelUserId,
      displayName: m.sender?.username || m.sender?.name || undefined,
      // Tap de botón sin texto (algunas plataformas mandan solo el payload):
      // se usa el payload/callback como texto para que el cerebro lo entienda.
      text: m.text || m.metadata?.interactiveId || m.metadata?.callbackData || undefined,
      imageUrl,
      audioUrl,
      receivedAt: Date.now(),
      rawPayload: ev,
      providerMessageId: ev.id || m.id || undefined,
    },
  ];
}

/**
 * El ASESOR contestó a mano y el bot se calla (takeover).
 *
 * Sin esto el bot sigue hablando encima de la persona y el cliente ve dos
 * voces que se contradicen — pasó en vivo. Es el mismo comportamiento que ya
 * tenía WhatsApp con `whatsapp.smb.message.echoes` (ver ycloudOwnerTakeover):
 * aquí el aviso equivalente es `message.sent`.
 *
 * `sentVia` dice QUIÉN produjo el mensaje saliente:
 *   • "human"             → un operador escribiendo en la bandeja de Zernio.
 *   • "api"               → NOSOTROS. El bot no se pausa a sí mismo.
 *   • "comment_automation"→ el DM del embudo. Tampoco pausa: ese mensaje
 *                           existe justamente para que el bot tome la plática.
 *   • null                → lo mandaron desde la app de la plataforma
 *                           (la bandeja de Facebook/Instagram). La doc pide
 *                           tratarlo como "desconocido", y aun así aquí SÍ
 *                           pausa: en este bot toda salida automática viene
 *                           atribuida ("api" o "comment_automation"), así que
 *                           un null en vivo es una persona escribiendo. Se
 *                           registra distinto para poder revisarlo si algún
 *                           día aparece un null que no sea humano.
 *
 * Devuelve true si pausó.
 */
export async function zernioAsesorTakeover(ev: ZernioEvent, env: Env): Promise<boolean> {
  if (ev?.event !== "message.sent") return false;
  const via = (ev.message as unknown as { sentVia?: string | null })?.sentVia ?? null;
  if (via !== "human" && via !== null) return false;

  // A quién se le contestó. `participantId` es la otra parte y viaja en ambas
  // direcciones; si no viniera, se traduce el conversationId de Zernio con el
  // contexto que ya guardamos al recibir.
  let channelUserId = ev.conversation?.participantId?.trim();
  if (!channelUserId) {
    const convZernio = ev.message?.conversationId;
    if (!convZernio) return false;
    try {
      const db = new Db(env.DB);
      await ensureCtx(db);
      const fila = await db.first<{ channel_user_id: string }>(
        "SELECT channel_user_id FROM zernio_ctx WHERE conversation_id = ? ORDER BY updated_at DESC LIMIT 1",
        [convZernio],
      );
      channelUserId = fila?.channel_user_id;
    } catch (e) {
      console.error("[zernio] takeover: no se pudo traducir la conversación:", e);
      return false;
    }
  }
  if (!channelUserId) return false;

  const { ConversationsRepo } = await import("../db/conversations");
  const { resolveTakeoverMs } = await import("../db/settings");
  const convs = new ConversationsRepo(new Db(env.DB));
  // getOrCreate y no getById: si por lo que sea no existiera la conversación,
  // dejarla creada y pausada es más seguro que no pausar nada.
  const conv = await convs.getOrCreate("zernio", channelUserId, ev.conversation?.participantName);
  await convs.setPausedUntil(conv.id, Date.now() + (await resolveTakeoverMs(env)));
  console.log(
    `[zernio] takeover: el asesor contestó a mano (sentVia=${via ?? "null/app"}) → bot pausado`,
    JSON.stringify({ channelUserId }),
  );
  return true;
}

// ── contexto de envío (conversationId + accountId por persona) ─────────────────
// Zernio responde por conversationId (URL) + accountId (body), ambos por
// conversación. Se guardan al recibir, keyeados por channelUserId (=sender.id),
// para poder responder después. Tabla auto-creada (patrón dedup) — sin migración.
let ctxEnsured = false;
async function ensureCtx(db: Db): Promise<void> {
  if (ctxEnsured) return;
  await db.run(
    `CREATE TABLE IF NOT EXISTS zernio_ctx (
       channel_user_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL,
       account_id TEXT NOT NULL, platform TEXT, updated_at INTEGER NOT NULL)`,
  );
  ctxEnsured = true;
}
export interface ZernioCtx {
  conversation_id: string;
  account_id: string;
  platform: string | null;
}
/** Contexto de envío guardado al recibir (conversationId + accountId + plataforma
 *  subyacente). null si esa persona nunca escribió por Zernio. */
export async function getZernioCtx(env: Env, channelUserId: string): Promise<ZernioCtx | null> {
  try {
    const db = new Db(env.DB);
    await ensureCtx(db);
    return await db.first<ZernioCtx>(
      "SELECT conversation_id, account_id, platform FROM zernio_ctx WHERE channel_user_id = ?",
      [channelUserId],
    );
  } catch (e) {
    console.error("[zernio] getCtx:", e);
    return null;
  }
}
export async function rememberZernioCtx(
  env: Env,
  channelUserId: string,
  conversationId: string,
  accountId: string,
  platform?: string,
): Promise<void> {
  try {
    const db = new Db(env.DB);
    await ensureCtx(db);
    await db.run(
      `INSERT INTO zernio_ctx (channel_user_id, conversation_id, account_id, platform, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(channel_user_id) DO UPDATE SET
         conversation_id = excluded.conversation_id,
         account_id = excluded.account_id,
         platform = excluded.platform,
         updated_at = excluded.updated_at`,
      [channelUserId, conversationId, accountId, platform ?? null, Date.now()],
    );
  } catch (e) {
    console.error("[zernio] rememberCtx:", e);
  }
}

/**
 * La clave con la que se contesta por una cuenta de Zernio, ya resuelta y con
 * el fallo dicho en voz alta.
 *
 * El reparto vive en `member/asesores.local.ts` (sobrevive `forjabot update`);
 * aquí solo se traduce a un log útil. Se importa en caliente para no arrastrar
 * `member/` dentro de las pruebas del adapter que no lo necesitan.
 *
 * Los dos fallos posibles se ven idénticos desde fuera —el bot no contesta— y
 * tienen arreglos distintos, así que se distinguen en el log: falta la clave
 * del dueño, o falta el secret que un asesor declaró y nadie guardó.
 */
async function claveDeEnvio(
  env: Env,
  accountId: string | null | undefined,
  accion: string,
): Promise<string | undefined> {
  let r: { apiKey?: string; asesor?: { nombre: string }; faltaSecret?: string };
  try {
    const { claveZernioDeCuenta } = await import("../../member/asesores.local");
    r = claveZernioDeCuenta(env, accountId);
  } catch {
    r = { apiKey: env.ZERNIO_API_KEY }; // sin reparto configurado: como siempre
  }
  if (r.apiKey) return r.apiKey;
  if (r.faltaSecret) {
    console.error(
      `[zernio] falta el secret ${r.faltaSecret} de ${r.asesor?.nombre ?? "un asesor"} — ` +
        `no se puede ${accion} por la cuenta ${accountId}. Guárdalo con ` +
        `\`wrangler secret put ${r.faltaSecret}\` y vuelve a desplegar.`,
    );
    return undefined;
  }
  console.error(`[zernio] falta ZERNIO_API_KEY — no se puede ${accion}`);
  return undefined;
}

/**
 * Manda una PLANTILLA aprobada de WhatsApp a una conversación EXISTENTE por Zernio.
 * Es la vía para re-enganchar fuera de la ventana de 24h (WhatsApp no permite
 * texto libre para reabrir). Va por el MISMO endpoint que el texto libre
 * (POST /inbox/conversations/{conversationId}/messages) pero con el campo
 * `template.elements` en vez de `message` — así lo documenta Zernio. `templateParams`
 * llena las variables {{1}}, {{2}}… del body de la plantilla, en orden. Solo aplica a
 * conversaciones cuyo platform sea "whatsapp". (Para abrir una conversación con un
 * número con el que aún NO hay hilo, Zernio usa POST /inbox/conversations; aquí
 * siempre hay hilo previo porque el contacto ya nos escribió.)
 */
export async function sendZernioTemplate(
  env: Env,
  conversationId: string,
  accountId: string,
  templateName: string,
  templateLanguage: string,
  templateParams: string[],
): Promise<void> {
  const apiKey = await claveDeEnvio(env, accountId, "enviar plantilla");
  if (!apiKey) return;
  const element: Record<string, unknown> = { name: templateName, language: templateLanguage };
  if (templateParams.length) {
    element.components = [
      { type: "body", parameters: templateParams.map((text) => ({ type: "text", text })) },
    ];
  }
  const url = `${zernioBase(env)}/inbox/conversations/${encodeURIComponent(conversationId)}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ accountId, template: { elements: [element] } }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[zernio] sendTemplate ${res.status}: ${errBody.slice(0, 300)}`);
  }
}

/**
 * Cuánto texto cabe en un mensaje CON BOTONES antes de que Meta lo corte.
 *
 * Messenger e Instagram truncan el texto del button_template a los 80
 * caracteres y le pegan "…". Le pasó al bot con un cliente real: el mensaje
 * llegó como *"…terrenos premium con excelente ubicación y potencial de
 * crecim…"* y la persona se quedó sin la frase.
 *
 * WhatsApp ya estaba protegido (el tope de 1024 de su body interactivo); estas
 * dos no lo estaban, y su tope es DOCE veces más chico. Telegram no trunca.
 */
export const TOPE_TEXTO_CON_BOTONES = 80;

/**
 * Parte un texto en [cuerpo, última frase] cuando no cabe con botones.
 *
 * No recorta: el cuerpo largo sale como su propio mensaje y los botones viajan
 * con la última frase — que en este guion es siempre la pregunta, y es corta
 * por diseño ("¿Para qué estás buscando el terreno?" son 36 caracteres).
 *
 * Devuelve null si no se puede partir bien; ahí el llamador cae a lista
 * numerada, que es preferible: mejor el texto completo sin botones que una
 * frase mutilada.
 */
export function separaPregunta(
  texto: string,
  tope = TOPE_TEXTO_CON_BOTONES,
): [string, string] | null {
  const t = texto.trim();
  if (t.length <= tope) return null; // ya cabe entero, no hay nada que partir
  const frases = t.match(/[^.!?\n]+[.!?]*\s*/g);
  if (!frases || frases.length < 2) return null;
  const ultima = frases[frases.length - 1].trim();
  const cuerpo = frases.slice(0, -1).join("").trim();
  if (!ultima || !cuerpo || ultima.length > tope) return null;
  return [cuerpo, ultima];
}

// ── adapter ───────────────────────────────────────────────────────────────────
export const zernioAdapter: ChannelAdapter = {
  // Existe por la interfaz; la ruta /webhooks/zernio usa parseZernioEvents directo.
  async parseIncoming(request: Request): Promise<IncomingMessage> {
    const body = (await request.json()) as ZernioEvent;
    const [first] = parseZernioEvents(body);
    if (!first) throw new Error("zernio webhook sin mensaje procesable");
    return first;
  },

  async sendReply(reply: OutgoingReply, env: Env): Promise<void> {
    const ctx = await getZernioCtx(env, reply.channelUserId);
    if (!ctx) {
      console.error(`[zernio] sin contexto de envío para ${reply.channelUserId} — no se responde`);
      return;
    }
    // La clave depende de la CUENTA por la que entró el mensaje, no del bot:
    // con dos asesores hay dos cuentas de Zernio y contestar con la del otro
    // le escribiría a su cliente desde la cuenta equivocada.
    const apiKey = await claveDeEnvio(env, ctx.account_id, "responder");
    if (!apiKey) return;
    const url = `${zernioBase(env)}/inbox/conversations/${encodeURIComponent(ctx.conversation_id)}/messages`;
    const plataforma = (ctx.platform ?? "").toLowerCase();
    // Meta trunca a 80 el texto de un mensaje con botones. Si el último chunk
    // no cabe, se parte AQUÍ —cuerpo por un lado, pregunta con los botones por
    // el otro— en vez de dejar que llegue cortado. Puede sumar un mensaje por
    // encima del tope de chunks del panel: es una necesidad de la plataforma,
    // no una decisión de estilo.
    let chunks = reply.chunks;
    if (reply.buttons?.length && ["instagram", "facebook", "messenger"].includes(plataforma)) {
      const partido = separaPregunta(chunks[chunks.length - 1] ?? "");
      if (partido) chunks = [...chunks.slice(0, -1), partido[0], partido[1]];
    }

    for (let i = 0; i < chunks.length; i++) {
      const delay = i === 0 ? 0 : reply.interChunkDelayMs ?? 1000;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      // El campo es `message` (con `text` Zernio lo rechaza); accountId obligatorio.
      const body: Record<string, unknown> = { accountId: ctx.account_id, message: chunks[i] };
      // Botones (opt-in) en el ÚLTIMO chunk. `buttons` postback funciona en
      // WhatsApp (reply buttons), IG/FB (button_template, visible en Message
      // Requests — mejor que chips para leads fríos) y Telegram (inline). En
      // plataformas SIN soporte (X, SMS, Slack…) van como lista numerada.
      if (reply.buttons?.length && i === chunks.length - 1) {
        // Cada plataforma tiene su tope, y pasarse NO da error: entrega el
        // mensaje cortado, que es peor. Si no cabe, lista numerada — el texto
        // llega completo aunque se pierda el toque.
        const soporta =
          plataforma === "telegram" ||
          (["instagram", "facebook", "messenger"].includes(plataforma) &&
            chunks[i].length <= TOPE_TEXTO_CON_BOTONES) ||
          (plataforma === "whatsapp" && chunks[i].length <= 1024);
        if (soporta) {
          body.buttons = reply.buttons.map((b) => ({
            type: "postback",
            title: b.title,
            payload: b.payload,
          }));
        } else {
          body.message = `${chunks[i]}\n\n${reply.buttons.map((b, n) => `${n + 1}) ${b.title}`).join("\n")}`;
        }
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`[zernio] sendReply ${res.status}: ${errBody.slice(0, 300)}`);
      }
    }
    // Galería: cada archivo va como mensaje propio DESPUÉS del texto —
    // attachmentUrl + attachmentType (spec de Zernio). voiceNote=true manda el
    // audio como NOTA DE VOZ en WhatsApp (solo válido con ogg/opus; sender.ts
    // ya marca voice únicamente en audio/ogg).
    for (const m of reply.media ?? []) {
      const body: Record<string, unknown> = {
        accountId: ctx.account_id,
        attachmentUrl: m.url,
        attachmentType: m.kind,
        // El caption viaja como `message` en el MISMO send (Zernio lo soporta).
        ...(m.caption ? { message: m.caption } : {}),
      };
      if (m.kind === "audio" && m.voice && (ctx.platform ?? "").toLowerCase() === "whatsapp") {
        body.voiceNote = true;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`[zernio] media send ${res.status}: ${errBody.slice(0, 300)}`);
      }
    }
  },
};
