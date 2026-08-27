import { Db } from "./client";

export interface Lead {
  id: string;
  conversation_id: string | null;
  name: string | null;
  contact: string | null;
  channel_user_id: string | null;
  intent: string;
  notes: string | null;
  status: "new" | "contacted" | "sold" | "lost";
  exported_to: string | null;
  external_id: string | null;
  /** JSON con los campos propios del nicho (o null). Ver leadMetadata(). */
  metadata: string | null;
  created_at: number;
  updated_at: number;
}

export interface CreateLeadInput {
  conversationId: string | null;
  channelUserId: string | null;
  name?: string;
  contact?: string;
  intent: string;
  notes?: string;
  /** Campos propios del nicho; se serializan a JSON en la columna metadata. */
  metadata?: Record<string, string | number | null>;
}

/** Parsea el JSON de metadata de un lead a un objeto plano (vacío si no hay/está roto). */
export function leadMetadata(lead: Pick<Lead, "metadata">): Record<string, string> {
  if (!lead.metadata) return {};
  try {
    const o = JSON.parse(lead.metadata);
    if (!o || typeof o !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      if (v !== null && v !== undefined) out[k] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

export class LeadsRepo {
  constructor(private readonly db: Db) {}

  async create(input: CreateLeadInput): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const metadata =
      input.metadata && Object.keys(input.metadata).length > 0
        ? JSON.stringify(input.metadata)
        : null;
    await this.db.run(
      `INSERT INTO leads (id, conversation_id, name, contact, channel_user_id, intent, notes, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.conversationId,
        input.name ?? null,
        input.contact ?? null,
        input.channelUserId,
        input.intent,
        input.notes ?? null,
        metadata,
        now,
        now,
      ],
    );
    return id;
  }

  async list(limit: number, status?: string): Promise<Lead[]> {
    if (status) {
      return this.db.all<Lead>(
        "SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT ?",
        [status, limit],
      );
    }
    return this.db.all<Lead>(
      "SELECT * FROM leads ORDER BY created_at DESC LIMIT ?",
      [limit],
    );
  }

  async setStatus(id: string, status: Lead["status"]): Promise<void> {
    await this.db.run(
      "UPDATE leads SET status = ?, updated_at = ? WHERE id = ?",
      [status, Date.now(), id],
    );
  }

  /** Borra un lead para siempre. Sin papelera: el panel confirma antes de llamar. */
  async delete(id: string): Promise<void> {
    await this.db.run("DELETE FROM leads WHERE id = ?", [id]);
  }

  /**
   * Cuánto dura "la misma plática" para efectos de no duplicar al prospecto.
   *
   * En Messenger y WhatsApp el hilo con una persona NO se cierra nunca: la
   * misma conversación puede tener meses. Sin ventana de tiempo, un lead de la
   * semana pasada hacía creer que el de hoy ya estaba registrado — pasó de
   * verdad: alguien escribió desde un Messenger que ya había consultado antes,
   * calificó como caliente, y ni se registró ni se avisó porque "esa
   * conversación ya tenía lead".
   *
   * Seis horas: una calificación se resuelve en minutos, y quien vuelve al día
   * siguiente es una consulta nueva que el asesor sí quiere ver.
   */
  static readonly VENTANA_MISMA_PLATICA_MS = 6 * 3600_000;

  /**
   * El lead RECIENTE de esta conversación que el asesor todavía NO ha tocado.
   *
   * Sirve para no acumular filas de una misma plática: el bot puede registrar
   * al prospecto y volver a hacerlo cuando dé su teléfono, y la red de
   * seguridad puede haber levantado uno antes. Todos son la misma persona.
   * Se limita a `status = 'new'` a propósito: si el asesor ya lo movió a
   * contactado o vendido, ese trabajo no se pisa.
   */
  async pendienteDeConversacion(conversationId: string): Promise<Lead | null> {
    return this.db.first<Lead>(
      `SELECT * FROM leads
        WHERE conversation_id = ? AND status = 'new' AND created_at > ?
        ORDER BY created_at ASC LIMIT 1`,
      [conversationId, Date.now() - LeadsRepo.VENTANA_MISMA_PLATICA_MS],
    );
  }

  /** Completa un lead con lo que se supo después (teléfono, contexto nuevo). */
  async enrich(id: string, campos: { contact?: string | null; notes?: string | null }): Promise<void> {
    await this.db.run(
      "UPDATE leads SET contact = COALESCE(?, contact), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?",
      [campos.contact ?? null, campos.notes ?? null, Date.now(), id],
    );
  }

  async setExported(id: string, target: string, externalId: string): Promise<void> {
    await this.db.run(
      "UPDATE leads SET exported_to = ?, external_id = ?, updated_at = ? WHERE id = ?",
      [target, externalId, Date.now(), id],
    );
  }
}
