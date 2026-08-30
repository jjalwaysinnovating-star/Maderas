// member/asesores.local.ts — quién es quién cuando hay más de un asesor.
//
// Vive en member/ A PROPÓSITO: `forjabot update` reemplaza src/ pero NUNCA toca
// esta carpeta. El día de una actualización, el reparto de leads sobrevive solo;
// lo único que hay que re-aplicar son los enganches en src/ (ver el README del
// proyecto).
//
// ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
// Dos asesores autorizados del MISMO negocio comparten un solo bot: una
// licencia, un Worker, una base de datos. Lo que NO comparten son los
// prospectos. Este archivo es el que decide de quién es cada lead.
//
// La pista viene de Zernio: cada mensaje llega con el `accountId` de la cuenta
// por la que entró (la página de Facebook o el Instagram de UNO de los dos), y
// ese id se guarda en `zernio_ctx` junto con la conversación. De ahí se deduce
// el asesor, sin preguntarle nada al cliente y sin tocar el esquema de la base.
//
// ── LO QUE NO CUBRE ─────────────────────────────────────────────────────────
// El sitio web, el chat de la página, Telegram y WhatsApp NO traen accountId:
// esos caen en ASESOR_POR_DEFECTO. Es lo correcto hoy, porque el sitio y el
// número son de él. Si el segundo asesor quiere sus propios leads de web,
// necesita su propio sitio — eso ya es otro bot.

import { Db } from "../src/db/client";
import type { Env } from "../src/env";

export interface Asesor {
  /** Identificador corto y estable. Es lo que se guarda en cada lead. */
  slug: string;
  nombre: string;
  /**
   * Chat de Telegram donde recibe SUS avisos de lead caliente. Si se deja
   * vacío, el aviso cae en `OWNER_TELEGRAM_CHAT_ID` — o sea, en el dueño.
   * Es el mismo bot de Telegram para todos: solo cambia el destinatario.
   */
  telegramChatId?: string;
  /**
   * Correos con los que entra al panel. Con cualquiera de ellos ve SOLO sus
   * leads. La contraseña maestra sigue viendo todo, siempre.
   */
  emails: string[];
  /**
   * Los `_id` de sus cuentas en Zernio (`GET /api/v1/accounts` — el campo es
   * `_id`, no `id`). Una por red: Facebook, Instagram…
   */
  cuentasZernio: string[];
}

export const ASESORES: Asesor[] = [
  {
    slug: "joswuar",
    nombre: "Joswuar",
    emails: [],
    cuentasZernio: [
      "6a8e644777555aae018b7c37", // Facebook · Ciudad Maderas
      "6a91166377555aae013db017", // Instagram · ciudadmaderaswoodcity
    ],
  },
  // ── Segundo asesor ────────────────────────────────────────────────────────
  // Se agrega cuando conecte sus redes a la misma cuenta de Zernio. Necesita
  // tres cosas: sus `_id` de Zernio, su chat de Telegram (que le escriba
  // /start al bot de avisos) y el correo con el que entrará al panel.
  //
  // {
  //   slug: "segundo",
  //   nombre: "Nombre del asesor",
  //   telegramChatId: "123456789",
  //   emails: ["correo@ejemplo.com"],
  //   cuentasZernio: ["...", "..."],
  // },
];

/**
 * A quién pertenece lo que no trae cuenta de Zernio: el sitio web, su
 * formulario, el chat de la página, Telegram y WhatsApp. También los leads
 * viejos, de antes de que existiera este reparto.
 */
export const ASESOR_POR_DEFECTO = "joswuar";

/** El asesor por defecto, ya resuelto. `null` si el slug no existe. */
export function asesorPorDefecto(): Asesor | null {
  return ASESORES.find((a) => a.slug === ASESOR_POR_DEFECTO) ?? null;
}

export function asesorPorSlug(slug: string | null | undefined, lista: Asesor[] = ASESORES): Asesor | null {
  if (!slug) return null;
  return lista.find((a) => a.slug === slug) ?? null;
}

/** El asesor dueño de una cuenta de Zernio (Facebook o Instagram). */
export function asesorDeCuenta(accountId: string | null | undefined, lista: Asesor[] = ASESORES): Asesor | null {
  if (!accountId) return null;
  return lista.find((a) => a.cuentasZernio.includes(accountId)) ?? null;
}

/**
 * El asesor que corresponde a un correo del panel. Se compara en minúsculas y
 * sin espacios: el correo lo teclea una persona al aceptar la invitación.
 */
export function asesorDeEmail(email: string | null | undefined, lista: Asesor[] = ASESORES): Asesor | null {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return null;
  return lista.find((a) => a.emails.some((x) => x.trim().toLowerCase() === e)) ?? null;
}

/**
 * El asesor dueño de una conversación. Busca el `accountId` que el adapter de
 * Zernio guardó en `zernio_ctx` y lo traduce.
 *
 * **Nunca lanza.** Si la tabla no existe todavía (bot sin Zernio) o la consulta
 * falla, cae en el asesor por defecto: es preferible que un lead aparezca en la
 * lista equivocada a que se pierda el registro por un error de reparto.
 */
export async function asesorDeConversacion(
  env: Env,
  conversationId: string | null,
): Promise<Asesor | null> {
  if (!conversationId) return asesorPorDefecto();
  try {
    const fila = await new Db(env.DB).first<{ account_id: string }>(
      "SELECT account_id FROM zernio_ctx WHERE conversation_id = ? ORDER BY updated_at DESC LIMIT 1",
      [conversationId],
    );
    return asesorDeCuenta(fila?.account_id) ?? asesorPorDefecto();
  } catch {
    return asesorPorDefecto();
  }
}

/**
 * Con un solo asesor configurado no hay nada que repartir: el panel enseña
 * todo y el aviso va al dueño. Sirve para que el filtro del panel no aparezca
 * —ni pueda esconder nada— mientras el segundo asesor no exista.
 */
export function hayVariosAsesores(lista: Asesor[] = ASESORES): boolean {
  return lista.length > 1;
}

/** Qué leads puede ver quien está viendo el panel ahora mismo. */
export type FiltroLeads =
  | { modo: "todo" }
  | { modo: "asesor"; slug: string; nombre: string; esPorDefecto: boolean }
  | { modo: "ninguno"; motivo: string };

/**
 * Decide qué lista de leads le toca a la sesión abierta.
 *
 * El middleware del panel ya dejó `PANEL_ROLE` y `PANEL_EMAIL` en `env` (ver
 * src/admin/routes.ts), así que aquí solo hay que traducirlos.
 *
 * Reglas, en orden:
 *   1. Un solo asesor configurado → TODO. Nada que repartir; el panel se
 *      comporta exactamente igual que antes de que esto existiera.
 *   2. Contraseña maestra (`master`) → TODO. Es el rescate del dueño y nunca
 *      se le esconde nada.
 *   3. El correo está en la lista → solo los leads de ESE asesor.
 *   4. El correo NO está en la lista → NINGUNO, con el motivo a la vista.
 *
 * El paso 4 es a propósito el que falla ruidoso. La alternativa —enseñarle
 * todo a un correo desconocido— convierte un dedazo al escribir el correo en
 * una fuga de los prospectos del otro asesor, y nadie se enteraría. Una lista
 * vacía que dice por qué está vacía se arregla en un minuto.
 */
export function filtroDeLeads(
  env: { PANEL_ROLE?: string; PANEL_EMAIL?: string },
  lista: Asesor[] = ASESORES,
  porDefecto: string = ASESOR_POR_DEFECTO,
): FiltroLeads {
  if (!hayVariosAsesores(lista)) return { modo: "todo" };
  if (env.PANEL_ROLE === "master") return { modo: "todo" };

  const asesor = asesorDeEmail(env.PANEL_EMAIL, lista);
  if (asesor) {
    return {
      modo: "asesor",
      slug: asesor.slug,
      nombre: asesor.nombre,
      esPorDefecto: asesor.slug === porDefecto,
    };
  }
  return {
    modo: "ninguno",
    motivo:
      "Tu correo no está asignado a ningún asesor. Pídele al administrador que " +
      "lo agregue en la lista de asesores del bot.",
  };
}

/** ¿Este lead es de quien lo está mirando? Gobierna cambiar estado y borrar. */
export function puedeTocarLead(filtro: FiltroLeads, asesorDelLead: string | null): boolean {
  if (filtro.modo === "todo") return true;
  if (filtro.modo === "ninguno") return false;
  // Sin dueño = del asesor por defecto (leads viejos y los del sitio web).
  if (!asesorDelLead) return filtro.esPorDefecto;
  return asesorDelLead === filtro.slug;
}
