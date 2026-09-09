/**
 * Reglas de prioridad de prospectos (member/tools.local.ts).
 *
 * Son las que deciden cuándo suena el teléfono de Joswuar, así que se prueban
 * solas: un falso caliente entrena a ignorar los avisos, y un caliente
 * clasificado como tibio es una venta que se enfría en el panel.
 */
import { describe, it, expect } from "vitest";
import { calcularPrioridad } from "../member/tools.local";

describe("calcularPrioridad", () => {
  it("lo quiere este mes y ya invierte en publicidad → caliente", () => {
    expect(calcularPrioridad({ plazo: "inmediato", pauta: "si" })).toBe("caliente");
  });

  it("lo quiere este mes y a veces pauta → caliente", () => {
    // "A veces" ya significa que entiende que un prospecto cuesta dinero.
    expect(calcularPrioridad({ plazo: "inmediato", pauta: "aveces" })).toBe("caliente");
  });

  it("lo quiere este mes pero no pauta nada → tibio", () => {
    // Con piso de $2,000 USD, la urgencia sin presupuesto no es una llamada de hoy.
    expect(calcularPrioridad({ plazo: "inmediato", pauta: "no" })).toBe("tibio");
  });

  it("de 1 a 3 meses, aunque ya pauta → tibio", () => {
    // Un plazo largo con buen presupuesto sigue sin ser urgente. Si esto
    // marcara caliente, el aviso perdería su significado.
    expect(calcularPrioridad({ plazo: "corto_plazo", pauta: "si" })).toBe("tibio");
  });

  it("de 1 a 3 meses sin publicidad → tibio", () => {
    expect(calcularPrioridad({ plazo: "corto_plazo", pauta: "no" })).toBe("tibio");
  });

  it("solo está explorando → frío, pague lo que pague", () => {
    // El plazo manda: quien está viendo no se vuelve caliente por tener dinero.
    expect(calcularPrioridad({ plazo: "explorando", pauta: "si" })).toBe("frio");
    expect(calcularPrioridad({ plazo: "explorando", pauta: "aveces" })).toBe("frio");
    expect(calcularPrioridad({ plazo: "explorando", pauta: "no" })).toBe("frio");
  });

  it("ningún caliente sale de un plazo que no sea este mes", () => {
    const plazos = ["corto_plazo", "explorando"] as const;
    const pautas = ["si", "aveces", "no"] as const;
    for (const plazo of plazos) {
      for (const pauta of pautas) {
        expect(calcularPrioridad({ plazo, pauta })).not.toBe("caliente");
      }
    }
  });
});
