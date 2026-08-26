/**
 * Reglas de prioridad de prospectos (member/tools.local.ts).
 *
 * Son las que deciden a quién se le interrumpe el día al asesor, así que se
 * prueban solas: un falso caliente entrena a ignorar los avisos, y un caliente
 * clasificado como tibio es una venta que se enfría en el panel.
 */
import { describe, it, expect } from "vitest";
import { calcularPrioridad } from "../member/tools.local";

describe("calcularPrioridad", () => {
  it("compra este mes y paga de contado → caliente", () => {
    expect(calcularPrioridad({ plazo: "inmediato", formaPago: "contado" })).toBe("caliente");
  });

  it("compra este mes con crédito → caliente", () => {
    expect(calcularPrioridad({ plazo: "inmediato", formaPago: "credito" })).toBe("caliente");
  });

  it("compra este mes con financiamiento directo → caliente", () => {
    // El financiamiento propio es nuestro mejor gancho: quien lo elige y compra
    // este mes es tan valioso como el de contado.
    expect(calcularPrioridad({ plazo: "inmediato", formaPago: "financiamiento" })).toBe("caliente");
  });

  it("compra este mes pero no sabe cómo pagar → tibio, no caliente", () => {
    expect(calcularPrioridad({ plazo: "inmediato", formaPago: "no_definido" })).toBe("tibio");
  });

  it("3-6 meses con crédito → tibio", () => {
    expect(calcularPrioridad({ plazo: "medio_plazo", formaPago: "credito" })).toBe("tibio");
  });

  it("3-6 meses, contado y para inversión → sube a caliente", () => {
    // El inversionista con dinero listo no espera: si no le hablamos, compra en otro lado.
    expect(
      calcularPrioridad({ plazo: "medio_plazo", formaPago: "contado", uso: "inversion" }),
    ).toBe("caliente");
  });

  it("3-6 meses, contado y para vivir → se queda tibio", () => {
    expect(calcularPrioridad({ plazo: "medio_plazo", formaPago: "contado", uso: "vivienda" })).toBe(
      "tibio",
    );
  });

  it("solo cotizando siempre es frío, aunque pague de contado y sea inversión", () => {
    // El plazo manda: sin intención de comprar no hay urgencia que valga.
    expect(
      calcularPrioridad({ plazo: "cotizando", formaPago: "contado", uso: "inversion" }),
    ).toBe("frio");
    expect(calcularPrioridad({ plazo: "cotizando", formaPago: "no_definido" })).toBe("frio");
  });

  it("valores desconocidos no truenan ni inflan la prioridad", () => {
    const raro = { plazo: "medio_plazo", formaPago: "xyz" } as never;
    expect(["frio", "tibio"]).toContain(calcularPrioridad(raro));
  });
});
