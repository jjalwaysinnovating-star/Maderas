import type { Env } from "../env";
import { Db } from "../db/client";
import { LeadsRepo } from "../db/leads";
import { MessagesRepo } from "../db/messages";
import { messageOwner } from "../tools/handoffHuman";
import { selfOrigin } from "../lib/self-origin";

/**
 * Red de seguridad: rescata al prospecto al que el bot le PROMETIÓ contacto
 * pero nunca registró.
 *
 * El modelo tiene la herramienta para registrar y calificar, y el prompt le
 * dice —por escrito y en mayúsculas— que la llame antes de prometer nada. Aun
 * así, en conversaciones de varios turnos a veces contesta "un asesor te
 * contactará" sin haber llamado a ninguna herramienta. Pasó en Messenger con un
 * cliente real: dio ciudad, forma de pago, plazo, nombre y teléfono, el bot le
 * dijo que lo buscarían, y en el panel no quedó absolutamente nada. El asesor
 * no se enteró y el cliente se quedó esperando una llamada.
 *
 * Es el peor fallo posible porque por fuera se ve como si todo hubiera salido
 * bien: nadie tiene motivo para ir a revisar. Dos rondas de instrucciones no lo
 * evitaron, así que aquí deja de depender del modelo — si prometió y no hay
 * lead, lo levantamos nosotros con lo que se pueda leer de la conversación.
 *
 * Es una RED, no un sustituto: el lead rescatado no trae calificación (no la
 * hay), va marcado para que el asesor sepa que le falta contexto, y siempre
 * avisa — a alguien ya le prometieron una llamada.
 */

/** Frases con las que el bot se compromete a que alguien va a contactar. */
const PROMESA =
  /(asesor|equipo)[^.!?\n]{0,60}(contact|comunic|notific|busc|llam)|(?:te|ya|quedaste|lo)\s*(?:tengo\s+)?registrad|te\s+registr[éo]|ya\s+tengo\s+tus\s+datos/i;

/** Un teléfono mexicano tal como lo escribe la gente: 10 dígitos, con o sin separadores. */
const TELEFONO = /(?:\+?52\s?)?(?:\d[\s.-]?){10}/;

export function prometioContacto(texto: string): boolean {
  return PROMESA.test(texto);
}

/** Primer teléfono que aparezca en lo que escribió el cliente. */
export function telefonoDe(textos: string[]): string | null {
  for (const t of textos) {
    const m = t.match(TELEFONO);
    if (!m) continue;
    const digitos = m[0].replace(/\D/g, "");
    // Descarta precios y años: un teléfono mexicano trae 10 dígitos (12 con +52).
    if (digitos.length === 10 || (digitos.length === 12 && digitos.startsWith("52"))) {
      return m[0].trim();
    }
  }
  return null;
}

export async function rescataLeadPrometido(
  env: Env,
  conversationId: string,
  respuestaDelBot: string,
): Promise<{ rescatado: boolean }> {
  if (!prometioContacto(respuestaDelBot)) return { rescatado: false };

  const db = new Db(env.DB);
  const repo = new LeadsRepo(db);

  // Solo cuentan los leads RECIENTES: en Messenger el hilo con una persona no
  // se cierra nunca, y un lead de la semana pasada hacía creer que el de hoy ya
  // estaba registrado. Pasó de verdad — alguien volvió a escribir desde un
  // Messenger que ya había consultado, calificó caliente, y ni se registró ni
  // se avisó porque "esa conversación ya tenía lead".
  const existente = await db.first<{ id: string; metadata: string | null }>(
    `SELECT id, metadata FROM leads
      WHERE conversation_id = ? AND created_at > ?
      ORDER BY created_at DESC LIMIT 1`,
    [conversationId, Date.now() - LeadsRepo.VENTANA_MISMA_PLATICA_MS],
  );
  // Si el bot sí registró al prospecto, aquí no hay nada que hacer.
  const esRescate = (existente?.metadata ?? "").includes('"origen":"rescate"');
  if (existente && !esRescate) return { rescatado: false };

  const historia = await new MessagesRepo(db).lastN(conversationId, 20);
  const delCliente = historia.filter((m) => m.role === "user").map((m) => m.content);
  const transcripcion = historia
    .map((m) => `${m.role === "user" ? "Cliente" : "Bot"}: ${m.content}`)
    .join("\n");
  const telefono = telefonoDe(delCliente);

  // Ya lo habíamos rescatado: la promesa se repite en cada turno, pero el
  // cliente sigue soltando datos. Se COMPLETA la ficha en vez de duplicarla —
  // el rescate suele dispararse antes de que dé su teléfono, y sin esto el
  // asesor se quedaba con un lead sin forma de llamarle.
  if (existente && esRescate) {
    await repo.enrich(existente.id, {
      contact: telefono,
      notes: `El bot le dijo que un asesor lo contactaría, pero no lo registró. Aquí va la conversación completa:\n\n${transcripcion}`.slice(0, 4000),
    });
    return { rescatado: false };
  }

  const leadId = await repo.create({
    conversationId,
    channelUserId: null,
    contact: telefono ?? undefined,
    intent: "Prospecto rescatado — el bot prometió contacto sin registrarlo",
    notes: `El bot le dijo que un asesor lo contactaría, pero no lo registró. Aquí va la conversación completa:\n\n${transcripcion}`.slice(0, 4000),
    // Sin calificación a propósito: no la hay. Que el asesor lo vea distinto de
    // un lead normal es parte del punto.
    metadata: { origen: "rescate", prioridad: "sin_calificar" },
  });

  // Siempre avisa: a esta persona ya le prometieron una llamada.
  try {
    await messageOwner(env, {
      heading: "⚠️ Prospecto sin registrar — el bot le prometió llamada",
      body:
        `El bot le dijo a alguien que un asesor lo contactaría, pero no lo registró.\n` +
        `Contacto detectado: ${telefono ?? "todavía no lo da"}\n\n` +
        `Últimas frases del cliente:\n${delCliente.slice(-3).join("\n")}`,
      url: `${await selfOrigin(env)}/admin/leads`,
    });
  } catch (e) {
    console.error("[rescate] aviso al asesor falló:", e);
  }

  console.log(`[rescate] lead ${leadId} levantado en conversación ${conversationId}`);
  return { rescatado: true };
}
