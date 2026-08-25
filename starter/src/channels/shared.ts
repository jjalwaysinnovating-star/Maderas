export type ChannelId = "manychat" | "telegram" | "twilio" | "messenger" | "instagram" | "whatsapp" | "kapso" | "ycloud" | "web" | "zernio";

// El proveedor mandó un update que NO es un mensaje procesable (Telegram:
// edited_message, callback_query, my_chat_member…). NO es un error de infra:
// hay que responder 200 para que el canal no lo reintente en loop. parseIncoming
// la lanza; routeToAgent la traduce a un 200 "ignorado".
export class IgnoredUpdate extends Error {
  constructor(reason = "update ignorado") {
    super(reason);
    this.name = "IgnoredUpdate";
  }
}

export interface IncomingMessage {
  channel: ChannelId;
  channelUserId: string;
  displayName?: string;
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
  isOwnerMessage?: boolean;
  receivedAt: number;
  rawPayload: unknown;
  /** id del mensaje en el proveedor (Meta mid / WhatsApp id) — dedup de
   *  reenvíos del webhook. Opcional: canales sin id no deduplican. */
  providerMessageId?: string;
}

// Botón tocable (opt-in, ver skill/botones.md). El tap regresa como mensaje de
// texto normal (el título o el payload), así el cerebro no cambia.
export interface ReplyButton {
  title: string; // lo que ve el cliente (≤20 chars — límite de WhatsApp)
  payload: string; // id que regresa en el tap donde la plataforma lo soporta
}

// Canales que renderizan botones NATIVOS. El resto recibe el fallback numerado
// en texto (sender.ts) — nada se rompe, nadie ve el marcador crudo.
export const BUTTON_CHANNELS: ReadonlySet<ChannelId> = new Set([
  "telegram", "whatsapp", "zernio", "messenger", "instagram",
]);

// Archivo de la Galería (superpoder, ver skill/galeria.md) que el bot manda en
// la respuesta. `url` es pública (GET /media/:id del propio worker) — todos los
// proveedores descargan por link. `voice` = mandarlo como NOTA DE VOZ (PTT)
// donde el canal lo distingue (solo audio ogg/opus).
export interface ReplyMedia {
  kind: "image" | "audio" | "video";
  url: string;
  voice?: boolean;
  /** Caption opcional ([[media: id | texto]]). Nativo en WhatsApp/Telegram/
   *  Twilio/Zernio; en IG/Messenger/ManyChat va como mensaje de texto justo
   *  ANTES del archivo (sus APIs no soportan caption en attachments). */
  caption?: string;
}

// Canales que mandan media NATIVA (foto/audio como archivo). El resto recibe el
// link en texto (sender.ts) — nada se rompe, nadie ve el marcador crudo.
// manychat: imagen nativa, audio como link (IG vía ManyChat no acepta audio).
export const MEDIA_CHANNELS: ReadonlySet<ChannelId> = new Set([
  "telegram", "whatsapp", "twilio", "kapso", "ycloud", "zernio", "messenger", "instagram", "manychat",
]);

export interface OutgoingReply {
  channel: ChannelId;
  channelUserId: string;
  chunks: string[];
  interChunkDelayMs?: number;
  // Botones para el ÚLTIMO chunk (máx 3). Solo lo puebla sender.ts cuando el
  // modelo emite el marcador [[botones: …]] y el canal está en BUTTON_CHANNELS.
  buttons?: ReplyButton[];
  // Media de la Galería (máx 2). Solo lo puebla sender.ts cuando el modelo
  // emite [[media: id]] y el canal está en MEDIA_CHANNELS. Se manda DESPUÉS de
  // los chunks de texto, un mensaje por archivo.
  media?: ReplyMedia[];
}

export interface ChannelAdapter {
  parseIncoming(request: Request, env: any): Promise<IncomingMessage>;
  sendReply(reply: OutgoingReply, env: any): Promise<void>;
  showTyping?(channelUserId: string, env: any): Promise<void>;
}
