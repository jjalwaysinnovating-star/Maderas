// member/tools.local.ts — las funciones extra de este bot.
//
// Esta carpeta es TUYA: `forjabot update` NUNCA la toca. En el bot de Ciudad
// Maderas la misma pieza necesitó parches en src/ que el update borra; aquí
// todo —incluido el des-duplicado— vive dentro de este archivo a propósito.
import { tool } from "ai";
import { z } from "zod";
import { Db } from "../src/db/client";
import { LeadsRepo } from "../src/db/leads";
import { messageOwner } from "../src/tools/handoffHuman";
import { selfOrigin } from "../src/lib/self-origin";
import type { MemberToolCtx } from "../src/tools/member";

/** Las dos respuestas que deciden qué tan bueno es el prospecto. */
const PLAZO = { inmediato: 3, corto_plazo: 2, explorando: 1 } as const;
// Si ya invierte en publicidad. Es la pregunta de presupuesto SIN preguntar el
// presupuesto: en un producto con piso de $2,000 USD, preguntar "¿cuánto puedes
// invertir?" espanta, y quien ya paga anuncios ya sabe que un prospecto cuesta.
const PAUTA = { si: 3, aveces: 2, no: 1 } as const;

export type Prioridad = "caliente" | "tibio" | "frio";

/**
 * Reglas de prioridad. Función pura y exportada a propósito: se lee, se cambia
 * y se prueba sola.
 *
 *   🔥 caliente — lo quiere este mes Y ya invierte en publicidad (o a veces)
 *   🟡 tibio    — de 1 a 3 meses, o lo quiere ya pero no pauta todavía
 *   ❄️ frío     — solo está explorando
 *
 * Que solo el "este mes" pueda ser caliente es deliberado: en Maderas se probó
 * que un plazo largo con buen presupuesto sigue sin ser una llamada de hoy, y
 * avisar de lo que no es urgente entrena a ignorar los avisos.
 */
export function calcularPrioridad(input: {
  plazo: keyof typeof PLAZO;
  pauta: keyof typeof PAUTA;
}): Prioridad {
  const p = PLAZO[input.plazo] ?? 1;
  const f = PAUTA[input.pauta] ?? 1;
  if (p === 1) return "frio"; // solo explorando: nunca es caliente, pague lo que pague
  if (p === 3 && f >= 2) return "caliente";
  return "tibio";
}

const ETIQUETA: Record<Prioridad, string> = {
  caliente: "🔥 CALIENTE",
  tibio: "🟡 Tibio",
  frio: "❄️ Frío",
};

/**
 * Una conversación = un prospecto, pero solo dentro de 6 horas.
 *
 * El modelo llama a esta tool más de una vez (registra al saber el plazo, y
 * otra vez cuando el cliente da su teléfono): sin esto la misma persona entra
 * dos veces al panel. La VENTANA es igual de imprescindible — en Messenger el
 * hilo con una persona no se cierra nunca, así que sin ella un prospecto de
 * hace un mes taparía al de hoy. Y solo se reemplaza el que sigue en `new`:
 * uno que ya se movió a contactado o vendido no se toca jamás.
 */
const VENTANA_MISMA_PLATICA_MS = 6 * 60 * 60 * 1000;

async function borraPendienteDeEstaPlatica(db: Db, convId: string): Promise<void> {
  const previo = await db.first<{ id: string }>(
    "SELECT id FROM leads WHERE conversation_id = ? AND status = 'new' AND created_at >= ? " +
      "ORDER BY created_at DESC LIMIT 1",
    [convId, Date.now() - VENTANA_MISMA_PLATICA_MS],
  );
  if (previo) await db.run("DELETE FROM leads WHERE id = ?", [previo.id]);
}

export function memberTools(ctx: MemberToolCtx): Record<string, unknown> {
  return {
    calificarLead: tool({
      description:
        "Registra y CALIFICA a un prospecto. Llámala EN CUANTO sepas su PLAZO y si YA INVIERTE " +
        "EN PUBLICIDAD — esos dos bastan; lo demás es opcional y no esperes a tenerlo. " +
        "OBLIGATORIA antes de decirle al cliente cualquier frase del tipo 'Joswuar te contacta', " +
        "'ya quedaste registrado' o 'te buscamos': si prometes eso sin llamarla, Joswuar NUNCA se " +
        "entera y el cliente se queda esperando una llamada que no llega. " +
        "Llámala también antes de despedirte de alguien interesado, con lo que tengas. " +
        "Si ya la llamaste y después el cliente da su nombre o su teléfono, vuelve a llamarla con " +
        "los datos completos. " +
        "No anuncies al cliente que lo estás registrando ni menciones esta herramienta: " +
        "simplemente continúa la conversación.",
      inputSchema: z.object({
        plazo: z
          .enum(["inmediato", "corto_plazo", "explorando"])
          .describe("inmediato = este mes · corto_plazo = 1 a 3 meses · explorando = solo está viendo"),
        pauta: z
          .enum(["si", "aveces", "no"])
          .describe("Si ya invierte en publicidad para que le lleguen clientes"),
        necesidad: z
          .enum(["mensajes", "citas", "seguimiento"])
          .optional()
          .describe("Qué es lo que más se le está cayendo hoy"),
        negocio: z.string().optional().describe("A qué se dedica, o el nombre de su negocio"),
        nombre: z.string().optional(),
        contacto: z.string().optional().describe("Teléfono o correo, si lo dio"),
        notas: z.string().optional().describe("Cualquier detalle útil para Joswuar"),
      }),
      execute: async ({ plazo, pauta, necesidad, negocio, nombre, contacto, notas }) => {
        const prioridad = calcularPrioridad({ plazo, pauta });
        const db = new Db(ctx.env.DB);

        const QUE = {
          mensajes: "contestar mensajes",
          citas: "agendar citas",
          seguimiento: "dar seguimiento",
        } as const;
        const intent = [
          negocio ? `Quiere un bot para ${negocio}` : "Quiere un bot para su negocio",
          necesidad ? `— sobre todo para ${QUE[necesidad]}` : null,
        ]
          .filter(Boolean)
          .join(" ");

        const convId = ctx.getConversationId();
        if (convId) await borraPendienteDeEstaPlatica(db, convId);

        const leads = new LeadsRepo(db, ctx.env);
        const leadId = await leads.create({
          conversationId: convId,
          channelUserId: null,
          name: nombre,
          contact: contacto,
          intent,
          notes: notas,
          // El panel de Leads y /exportar leen metadata: aquí viaja la
          // calificación completa, sin necesitar una tabla aparte.
          metadata: {
            prioridad,
            plazo,
            pauta,
            necesidad: necesidad ?? null,
            negocio: negocio ?? null,
          },
        });

        // Solo los calientes interrumpen. Avisar de TODOS entrena a ignorar los
        // avisos, que es peor que no tenerlos.
        if (prioridad === "caliente") {
          const detalle = [
            nombre ? `Nombre: ${nombre}` : null,
            contacto ? `Contacto: ${contacto}` : "Contacto: no lo dio todavía",
            negocio ? `Negocio: ${negocio}` : null,
            "Plazo: este mes",
            `Publicidad: ${pauta === "si" ? "ya invierte" : "a veces"}`,
            necesidad ? `Necesita: ${QUE[necesidad]}` : null,
            notas ? `Notas: ${notas}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          try {
            await messageOwner(ctx.env, {
              heading: "🔥 Prospecto caliente — contáctalo hoy",
              body: detalle,
              url: `${await selfOrigin(ctx.env)}/admin/leads`,
            });
          } catch (e) {
            // Que falle el aviso NUNCA debe tumbar la conversación: el
            // prospecto ya quedó guardado y visible en el panel.
            console.error("[calificarLead] aviso falló:", e);
          }
        }

        // Lo que regresa lo lee el modelo, no el cliente.
        return {
          leadId,
          prioridad: ETIQUETA[prioridad],
          registrado: true,
          siguiente:
            prioridad === "caliente"
              ? "Joswuar ya fue notificado. Dile que te contacta hoy mismo."
              : "Queda registrado. Despídete con calidez y deja la puerta abierta.",
        };
      },
    }),
  };
}
