// member/tools.local.ts — TUS funciones extra del bot ("tools").
//
// Esta carpeta (member/) es TUYA: las actualizaciones (`forjabot update`) NUNCA
// la tocan. Todo lo que definas aquí SOBREVIVE cada actualización, ya conectado
// (a diferencia de editar src/, que el update reemplaza).
import { tool } from "ai";
import { z } from "zod";
import { Db } from "../src/db/client";
import { LeadsRepo } from "../src/db/leads";
import { messageOwner } from "../src/tools/handoffHuman";
import { selfOrigin } from "../src/lib/self-origin";
import type { MemberToolCtx } from "../src/tools/member";
import { asesorDeConversacion } from "./asesores.local";
import { origenDeConversacion, metadataDeOrigen } from "./origen.local";

/** Las tres respuestas que deciden qué tan bueno es el lead. */
const PLAZO = { inmediato: 3, medio_plazo: 2, cotizando: 1 } as const;
const PAGO = { contado: 3, credito: 2, financiamiento: 2, no_definido: 1 } as const;

export type Prioridad = "caliente" | "tibio" | "frio";

/**
 * Reglas de prioridad. Se mantienen como función pura y exportada a propósito:
 * así se pueden leer (y cambiar) sin tocar el resto, y se prueban solas.
 *
 *   🔥 caliente — compra este mes Y ya sabe cómo va a pagar
 *   🟡 tibio    — plazo de 3-6 meses, o compra pronto sin forma de pago clara
 *   ❄️ frío     — solo está cotizando
 *
 * "Inversión" no sube de nivel por sí sola, pero desempata: un inversionista a
 * 3-6 meses con pago de contado vale más que quien apenas está viendo.
 */
export function calcularPrioridad(input: {
  plazo: keyof typeof PLAZO;
  formaPago: keyof typeof PAGO;
  uso?: "vivienda" | "inversion";
}): Prioridad {
  const p = PLAZO[input.plazo] ?? 1;
  const f = PAGO[input.formaPago] ?? 1;
  if (p === 1) return "frio"; // solo cotizando: nunca es caliente, pague como pague
  if (p === 3 && f >= 2) return "caliente";
  // Umbral 6, no 5: con 5 bastaba plazo medio + contado para marcar caliente, y
  // entonces el bonus de inversionista no decidía nada. Ahora medio+contado (5)
  // se queda tibio y solo el inversionista con dinero listo (5+1) sube.
  const bonus = input.uso === "inversion" && f === 3 ? 1 : 0;
  return p + f + bonus >= 6 ? "caliente" : "tibio";
}

const ETIQUETA: Record<Prioridad, string> = {
  caliente: "🔥 CALIENTE",
  tibio: "🟡 Tibio",
  frio: "❄️ Frío",
};

export function memberTools(ctx: MemberToolCtx): Record<string, unknown> {
  return {
    calificarLead: tool({
      description:
        "Registra y CALIFICA a un prospecto. Llámala EN CUANTO sepas su PLAZO de compra y CÓMO " +
        "piensa pagar — esos dos bastan; `uso` es opcional y no esperes a tenerlo. " +
        "OBLIGATORIA antes de decirle al cliente cualquier frase del tipo 'un asesor te contacta', " +
        "'ya quedaste registrado' o 'te buscamos': si prometes eso sin llamarla, el asesor NUNCA " +
        "se entera y el cliente se queda esperando una llamada que no llega. " +
        "Llámala también antes de despedirte de alguien interesado, con lo que tengas. " +
        "Si ya la llamaste y después el cliente da su nombre, teléfono o cambia de forma de pago, " +
        "vuelve a llamarla con los datos completos. " +
        "No anuncies al cliente que lo estás registrando ni menciones esta herramienta: " +
        "simplemente continúa la conversación.",
      inputSchema: z.object({
        plazo: z
          .enum(["inmediato", "medio_plazo", "cotizando"])
          .describe("inmediato = este mes · medio_plazo = 3 a 6 meses · cotizando = solo está viendo"),
        formaPago: z
          .enum(["contado", "credito", "financiamiento", "no_definido"])
          .describe("financiamiento = crédito directo con la desarrolladora"),
        uso: z.enum(["vivienda", "inversion"]).optional(),
        nombre: z.string().optional(),
        contacto: z.string().optional().describe("Teléfono o correo, si lo dio"),
        ciudad: z.string().optional().describe("Ciudad o desarrollo de interés"),
        notas: z.string().optional().describe("Cualquier detalle útil para el asesor"),
      }),
      execute: async ({ plazo, formaPago, uso, nombre, contacto, ciudad, notas }) => {
        const prioridad = calcularPrioridad({ plazo, formaPago, uso });
        const db = new Db(ctx.env.DB);

        const intent = [
          ciudad ? `Interesado en un terreno en ${ciudad}` : "Interesado en un terreno",
          uso === "inversion" ? "para inversión" : uso === "vivienda" ? "para vivir" : null,
        ]
          .filter(Boolean)
          .join(", ");

        // Una conversación = un prospecto. El bot puede llamar a esta tool más
        // de una vez (registra, y vuelve a registrar cuando el cliente da su
        // teléfono), y la red de seguridad pudo haber levantado uno antes de
        // que él reaccionara. Sin esto, el asesor abre el panel y ve a la misma
        // persona tres veces sin saber cuál está completa. Se reemplaza el
        // pendiente por el nuevo, que siempre trae más información.
        const leads = new LeadsRepo(db);
        const convId = ctx.getConversationId();
        if (convId) {
          const previo = await leads.pendienteDeConversacion(convId);
          if (previo) await leads.delete(previo.id);
        }

        // De quién es este prospecto. Se deduce de la cuenta de Zernio por la
        // que entró el mensaje (ver member/asesores.local.ts). Con un solo
        // asesor configurado siempre sale el mismo y no cambia nada.
        const asesor = await asesorDeConversacion(ctx.env, convId);

        // De dónde salió. Sin esto, gastar en anuncios es adivinar: no hay
        // forma de saber qué campaña trae CALIENTES y cuál solo curiosos.
        const origen = await origenDeConversacion(ctx.env, convId);

        const leadId = await leads.create({
          conversationId: convId,
          name: nombre,
          contact: contacto,
          channelUserId: null,
          intent,
          notes: notas,
          // El panel de Leads y /exportar leen metadata: aquí viaja la
          // calificación completa, sin necesitar una tabla aparte. `asesor` es
          // lo que hace que cada quien vea SU lista.
          metadata: {
            prioridad,
            plazo,
            forma_pago: formaPago,
            uso: uso ?? null,
            ciudad: ciudad ?? null,
            asesor: asesor?.slug ?? null,
            ...metadataDeOrigen(origen),
          },
        });

        // Solo los calientes interrumpen al asesor. Avisar de TODOS entrena a
        // ignorar los avisos, que es peor que no tenerlos.
        if (prioridad === "caliente") {
          const detalle = [
            nombre ? `Nombre: ${nombre}` : null,
            contacto ? `Contacto: ${contacto}` : "Contacto: no lo dio todavía",
            ciudad ? `Ciudad: ${ciudad}` : null,
            `Plazo: ${plazo === "inmediato" ? "este mes" : plazo}`,
            `Pago: ${formaPago}`,
            `Vino de: ${origen.canal}${origen.ref ? ` · ${origen.ref}` : ""}`,
            uso ? `Uso: ${uso === "inversion" ? "inversión" : "vivienda"}` : null,
            notas ? `Notas: ${notas}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          try {
            await messageOwner(ctx.env, {
              heading: "🔥 Lead caliente — contáctalo hoy",
              body: detalle,
              url: `${await selfOrigin(ctx.env)}/admin/leads`,
              // Cada asesor recibe los avisos de SUS prospectos. Sin chat
              // propio configurado cae en el del dueño, como siempre.
              chatId: asesor?.telegramChatId,
            });
          } catch (e) {
            // Que falle el aviso NUNCA debe tumbar la conversación con el
            // cliente: el lead ya quedó guardado y visible en el panel.
            console.error("[calificarLead] aviso al asesor falló:", e);
          }
        }

        // Lo que regresa lo lee el modelo, no el cliente: le confirma que ya
        // quedó registrado para que no lo intente de nuevo.
        return {
          leadId,
          prioridad: ETIQUETA[prioridad],
          registrado: true,
          siguiente:
            prioridad === "caliente"
              ? "Un asesor ya fue notificado. Dile que lo contactarán hoy mismo."
              : "Queda registrado. Despídete con calidez y deja la puerta abierta.",
        };
      },
    }),
  };
}
