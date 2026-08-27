// member/config.local.ts — datos y reglas del negocio.
// NUNCA se sobrescribe al actualizar el bot.
//
// ESTADO: vaciado a propósito para rediseñar el guion desde cero (flujo por
// botones para calificar prospectos). Los datos duros del negocio y el blindaje
// legal se conservan; todo lo demás —tono, guion, preguntas, reglas de
// conversación— se reconstruye cuando el dueño autorice el nuevo flujo.
// El contenido anterior vive en el historial de git si hace falta recuperarlo.

export const memberConfig = {
  businessName: "Ciudad Maderas — Terrenos y Casas Premium",
  botName: "Asesor Ciudad Maderas",
  language: "es" as "es" | "en" | "pt",
  tier: "free" as "free" | "pro",
  timezone: "America/Mexico_City",
  // Moneda con la que el bot habla de precios ($ | € | R$). El bot la lee de
  // aquí si no la cambiaste en el panel (setting bot_currency manda si existe).
  currency: "$",
  contactEmail: "",
};
export type MemberConfig = typeof memberConfig;

export const businessConfig = {
  hours: "Lunes a domingo de 8:00 a.m. a 6:00 p.m.",
  services: [] as { name: string; price: number }[],
  location: "Presencia en Querétaro, León, Mérida, Aguascalientes, Monterrey, San Luis Potosí, Cancún y Puebla — 28 desarrollos en 20 ciudades de México y 4 en EE.UU.",
  paymentMethods: [
    "Crédito directo con la desarrolladora (desde 1% de enganche, sin aval y sin revisión de buró)",
    "Transferencia bancaria",
    "Pago de contado",
  ] as string[],
  contactPhone: "686 606 6613",
  customFields: {
    // ── LO ÚNICO QUE SOBREVIVE AL VACIADO ────────────────────────────────
    // El bot sigue vivo en la web y en Messenger mientras se rediseña el
    // guion. Sin esta regla, un cliente real puede sacarle una promesa de
    // rendimiento —legalmente riesgosa en venta inmobiliaria— en el hueco
    // entre vaciar y reconstruir. Es un freno, no un guion: no le dice al bot
    // qué vender, solo qué no puede afirmar.
    "blindajeLegal":
      "REGLA ABSOLUTA: NUNCA escribas 'garantizada', 'garantizado', 'garantía' ni " +
      "'garantizamos' referidas a plusvalía, valor, rendimiento o retorno de la inversión. " +
      "La frase 'plusvalía garantizada' está PROHIBIDA aunque aparezca en materiales de la " +
      "marca y aunque el cliente la use primero. Tampoco uses equivalentes: 'inversión segura', " +
      "'no pierdes', 'seguro que sube', 'retorno asegurado'. Di 'fuerte potencial de plusvalía' " +
      "o 'zonas de alto crecimiento'. Los precios son SIEMPRE montos 'desde', nunca un total " +
      "cerrado: los confirma un asesor. No prometas rendimientos ni descuentos. No pidas datos " +
      "bancarios, tarjetas ni documentos por el chat. Eres un ASESOR AUTORIZADO, no la " +
      "desarrolladora.",
  } as Record<string, string>,
};

import type { CommentFunnel } from "../src/channels/comment-funnel";
export const commentFunnels: CommentFunnel[] = [];

export const catalog: { name: string; price: number; description?: string; sku?: string }[] = [];
