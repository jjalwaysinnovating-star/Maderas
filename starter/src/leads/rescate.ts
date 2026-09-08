import type { Env } from "../env";
import { Db } from "../db/client";
import { LeadsRepo } from "../db/leads";
import { MessagesRepo } from "../db/messages";
import { messageOwner } from "../tools/handoffHuman";
// Reparto entre asesores (vive en member/, sobrevive `forjabot update`).
import { asesorDeConversacion } from "../../member/asesores.local";
import { origenDeConversacion, metadataDeOrigen } from "../../member/origen.local";
// Las MISMAS reglas de prioridad que usa `calificarLead`. Se importa la función
// en vez de copiar los umbrales: si el dueño los cambia, cambian en los dos
// lados a la vez. Dos tablas de prioridad que se separan con el tiempo hacen
// que el mismo prospecto salga caliente por una puerta y tibio por la otra.
import { calcularPrioridad } from "../../member/tools.local";
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

/**
 * Las frases del texto que AFIRMAN algo — sin las preguntas.
 *
 * "¿Y tu teléfono para que un asesor te contacte?" trae exactamente las mismas
 * palabras que una promesa, pero dice lo contrario: el bot está PIDIENDO el
 * dato, no diciendo que ya lo tiene. Sin esta distinción el rescate se
 * disparaba a media conversación — pasó en Instagram con "Jahir": el bot iba
 * bien, apenas preguntando el teléfono, y al asesor le llegó un "prospecto sin
 * registrar" como si algo hubiera fallado. Un aviso que suena cuando no pasa
 * nada malo enseña a ignorar los avisos, que es justo lo que no queremos.
 */
function afirmaciones(texto: string): string[] {
  return texto
    .split(/(?<=[.!?\n])/)
    .map((frase) => frase.trim())
    .filter((frase) => frase.length > 0 && !frase.endsWith("?"));
}

export function prometioContacto(texto: string): boolean {
  return afirmaciones(texto).some((frase) => PROMESA.test(frase));
}

/** Un turno de la plática, tal como lo guarda `messages`. */
type Turno = { role: string; content: string };

/** Lo que el bot pregunta justo antes de que la persona diga su nombre. */
const PIDE_NOMBRE = /cu[áa]l es tu nombre|c[óo]mo te llamas|tu nombre[^?]*\?/i;

/**
 * El nombre que el cliente dio, leído de la ESTRUCTURA de la plática.
 *
 * No se adivina buscando "algo que parezca nombre" en el texto: se aprovecha
 * que el guion siempre pregunta el nombre en su propio mensaje ("¿Cuál es tu
 * nombre?"), así que **lo que la persona contesta justo después es la
 * respuesta**. Eso es una señal de estructura, no una corazonada.
 *
 * Aun así se filtra lo que claramente no es un nombre: un teléfono (a veces la
 * gente se adelanta), una frase larga, o algo sin letras. Ante la duda devuelve
 * null — un lead sin nombre es molesto; uno con el nombre equivocado hace que
 * el asesor salude mal a un cliente real.
 */
export function nombreDe(historia: Turno[]): string | null {
  for (let i = 0; i < historia.length - 1; i++) {
    const m = historia[i];
    if (m.role === "user" || !PIDE_NOMBRE.test(m.content)) continue;
    const respuesta = historia.slice(i + 1).find((t) => t.role === "user");
    if (!respuesta) continue;
    const crudo = respuesta.content.trim().replace(/^(me llamo|soy)\s+/i, "");
    if (!crudo || crudo.length > 40) continue;
    if (!/[a-záéíóúñ]/i.test(crudo)) continue; // puros dígitos: es el teléfono
    if (telefonoDe([crudo])) continue;
    if (crudo.split(/\s+/).length > 4) continue; // una frase, no un nombre
    return crudo;
  }
  return null;
}

/**
 * Plazo, forma de pago y uso, leídos de lo que la persona ya contestó.
 *
 * Se apoya en que las tres preguntas del guion salen con botones de texto FIJO
 * (`member/config.local.ts`): "Este mes | 3 a 6 meses | Solo cotizando" y
 * "De contado | Con financiamiento | Aún no sé". Cuando el canal no soporta
 * botones salen como lista numerada, y la gente contesta "2" — por eso también
 * se resuelve el número contra los botones del mensaje anterior.
 *
 * Devuelve solo lo que aparece de verdad. Lo que no se encuentra se queda sin
 * definir, y quien llama decide si con eso alcanza para calificar.
 */
export function datosDe(historia: Turno[]): {
  plazo?: "inmediato" | "medio_plazo" | "cotizando";
  formaPago?: "contado" | "financiamiento" | "no_definido";
  uso?: "vivienda" | "inversion";
} {
  const out: ReturnType<typeof datosDe> = {};
  const lee = (t: string) => {
    const s = t.toLowerCase();
    if (!out.plazo) {
      if (/este mes|inmediat|ya mismo|cuanto antes/.test(s)) out.plazo = "inmediato";
      else if (/3 a 6|tres a seis|pr[óo]ximos meses/.test(s)) out.plazo = "medio_plazo";
      else if (/solo cotiz|s[óo]lo cotiz|nada m[áa]s viendo|preguntando/.test(s)) out.plazo = "cotizando";
    }
    if (!out.formaPago) {
      if (/de contado|al contado/.test(s)) out.formaPago = "contado";
      else if (/financiamiento|cr[ée]dito|mensualidad/.test(s)) out.formaPago = "financiamiento";
      else if (/a[úu]n no s[ée]|no lo tengo claro|todav[íi]a no s[ée]/.test(s)) out.formaPago = "no_definido";
    }
    if (!out.uso) {
      if (/invertir|inversi[óo]n|plusval/.test(s)) out.uso = "inversion";
      else if (/vivir|vivienda|construir|mi casa/.test(s)) out.uso = "vivienda";
    }
  };

  for (let i = 0; i < historia.length; i++) {
    const t = historia[i];
    if (t.role !== "user") continue;
    const texto = t.content.trim();
    // Respuesta numérica: se resuelve contra los botones que el bot acababa de
    // ofrecer. Sin esto, un "2" en la web no dice absolutamente nada.
    const n = /^([1-9])$/.exec(texto);
    if (n) {
      const anterior = historia.slice(0, i).reverse().find((x) => x.role !== "user");
      const botones = /\[\[botones:([^\]]+)\]\]/i.exec(anterior?.content ?? "");
      const opciones = botones?.[1].split("|").map((o) => o.trim()) ?? [];
      const elegida = opciones[Number(n[1]) - 1];
      if (elegida) lee(elegida);
      continue;
    }
    lee(texto);
  }
  return out;
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
  const existente = await db.first<{ id: string; contact: string | null; metadata: string | null }>(
    `SELECT id, contact, metadata FROM leads
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
  // El bot ya oyó el nombre y las respuestas que califican — solo no las
  // guardó. Están en la transcripción, así que se leen de ahí en vez de dejar
  // la ficha en blanco. Pasó en vivo el 2026-09-08: "Josa" dio uso, plazo,
  // pago, nombre y teléfono, el bot contestó "ya tengo tus datos" y no llamó a
  // la herramienta; la ficha salió sin nombre y marcada "sin calificar", o sea
  // un prospecto caliente disfrazado de frío en la lista del asesor.
  const nombre = nombreDe(historia);
  const datos = datosDe(historia);
  // Solo se califica con las DOS respuestas que mandan. Con una sola, la ficha
  // se queda "sin calificar" a propósito: inventar una prioridad a medias es
  // peor que decir que no se sabe.
  const prioridad =
    datos.plazo && datos.formaPago
      ? calcularPrioridad({ plazo: datos.plazo, formaPago: datos.formaPago, uso: datos.uso })
      : null;

  // De quién es este prospecto. El rescate hereda el mismo reparto que
  // calificarLead: se deduce de la cuenta de Zernio por la que entró. Sin esto,
  // el aviso de un lead perdido le llegaría al asesor equivocado — que es peor
  // que no avisar, porque el dueño real nunca se entera.
  const asesor = await asesorDeConversacion(env, conversationId);
  const origen = await origenDeConversacion(env, conversationId);

  // Ya lo habíamos rescatado: la promesa se repite en cada turno, pero el
  // cliente sigue soltando datos. Se COMPLETA la ficha en vez de duplicarla —
  // el rescate suele dispararse antes de que dé su teléfono, y sin esto el
  // asesor se quedaba con un lead sin forma de llamarle.
  if (existente && esRescate) {
    const yaTeniaTelefono = (existente.contact ?? "").trim().length > 0;
    await repo.enrich(existente.id, {
      contact: telefono,
      name: nombre,
      notes: `El bot le dijo que un asesor lo contactaría, pero no lo registró. Aquí va la conversación completa:\n\n${transcripcion}`.slice(0, 4000),
    });

    // El aviso del rescate casi siempre sale ANTES de que el cliente suelte su
    // teléfono, y decía "Contacto detectado: todavía no lo da". Cuando el
    // teléfono llega después, ese es EL momento en que el asesor por fin puede
    // hacer algo — y hasta ahora era el único momento en que no se le avisaba
    // nada. Pasó en Instagram con "Jahir": el asesor supo que había un
    // prospecto sin datos, el cliente dejó su número tres minutos después, y
    // el teléfono se guardó en el panel en silencio.
    if (telefono && !yaTeniaTelefono) {
      try {
        await messageOwner(env, {
          heading: "📞 Ya dio su teléfono — el prospecto del aviso anterior",
          body:
            `Es el mismo prospecto que el bot no había registrado. Ya se le puede llamar.\n` +
            `Teléfono: ${telefono}\n\n` +
            `Últimas frases del cliente:\n${delCliente.slice(-3).join("\n")}`,
          url: `${await selfOrigin(env)}/admin/leads`,
          chatId: asesor?.telegramChatId,
        });
      } catch (e) {
        console.error("[rescate] aviso de teléfono tardío falló:", e);
      }
    }
    return { rescatado: false };
  }

  const leadId = await repo.create({
    conversationId,
    channelUserId: null,
    name: nombre ?? undefined,
    contact: telefono ?? undefined,
    intent: "Prospecto rescatado — el bot prometió contacto sin registrarlo",
    notes: `El bot le dijo que un asesor lo contactaría, pero no lo registró. Aquí va la conversación completa:\n\n${transcripcion}`.slice(0, 4000),
    // La prioridad sale de las MISMAS reglas que `calificarLead` — se importa
    // la función, no se copian los umbrales: dos tablas de prioridad que se
    // separan con el tiempo es peor que no tener la segunda.
    // Se queda en "sin_calificar" cuando la plática no alcanzó a dar plazo Y
    // forma de pago, que es la verdad y hay que decirla.
    metadata: {
      origen: "rescate",
      prioridad: prioridad ?? "sin_calificar",
      asesor: asesor?.slug ?? null,
      ...(datos.plazo ? { plazo: datos.plazo } : {}),
      ...(datos.formaPago ? { forma_pago: datos.formaPago } : {}),
      ...(datos.uso ? { uso: datos.uso } : {}),
      ...metadataDeOrigen(origen),
    },
  });

  // Siempre avisa: a esta persona ya le prometieron una llamada.
  try {
    await messageOwner(env, {
      heading:
        prioridad === "caliente"
          ? "🔥 Prospecto CALIENTE que el bot no registró"
          : "⚠️ Prospecto sin registrar — el bot le prometió llamada",
      body:
        `El bot le dijo a alguien que un asesor lo contactaría, pero no lo registró.\n` +
        `Nombre: ${nombre ?? "no lo dio"}\n` +
        `Contacto detectado: ${telefono ?? "todavía no lo da"}\n` +
        `Cómo calificó: ${prioridad ?? "sin datos suficientes"}\n\n` +
        `Últimas frases del cliente:\n${delCliente.slice(-3).join("\n")}`,
      url: `${await selfOrigin(env)}/admin/leads`,
      chatId: asesor?.telegramChatId,
    });
  } catch (e) {
    console.error("[rescate] aviso al asesor falló:", e);
  }

  console.log(`[rescate] lead ${leadId} levantado en conversación ${conversationId}`);
  return { rescatado: true };
}
