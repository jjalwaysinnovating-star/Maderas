/**
 * El rescate ya no levanta la ficha en blanco.
 *
 * El caso real (2026-09-08): alguien dio uso, plazo, forma de pago, nombre
 * ("Josa") y teléfono. El bot contestó *"Perfecto, Josa. Ya tengo tus datos"*
 * y NO llamó a `calificarLead`. La red de seguridad lo atrapó —bien— pero
 * guardó la ficha sin nombre y marcada "sin calificar": en la lista del asesor
 * se veía como un prospecto tibio cualquiera, cuando era de los buenos.
 *
 * Todo estaba en la transcripción. Ahora se lee de ahí. Lo que se cuida en
 * estas pruebas no es sacar el dato, es **no inventarlo**: un nombre
 * equivocado hace que el asesor salude mal a un cliente de verdad, y una
 * prioridad inventada rompe la única regla del proyecto sobre avisos — que
 * solo suenen cuando de verdad importa.
 */
import { describe, it, expect } from "vitest";
import { nombreDe, datosDe } from "../../src/leads/rescate";
import { calcularPrioridad } from "../../member/tools.local";

const t = (role: string, content: string) => ({ role, content });

/** La plática de "Josa", tal como quedó guardada en producción. */
const JOSA = [
  t("user", "Hola"),
  t("assistant", "¡Hola! Soy Asesor Ciudad Maderas. ¿Qué te trae por aquí? 🙂"),
  t("user", "Quiero un terreno en cancun"),
  t("assistant", "Perfecto, Cancún es una excelente opción.\n\n¿Para qué buscas el terreno: para vivir o para invertir?"),
  t("user", "Invertir"),
  t("assistant", "Claro, inversión es una buena apuesta.\n\n¿Para cuándo necesitarías avanzar?\n\n[[botones: Este mes | 3 a 6 meses | Solo cotizando]]"),
  t("user", "Este mes"),
  t("assistant", "Excelente. ¿Cómo te gustaría pagar?\n\n[[botones: De contado | Con financiamiento | Aún no sé]]"),
  t("user", "2"),
  t("assistant", "Perfecto, financiamiento es lo más común.\n\n¿Cuál es tu nombre?"),
  t("user", "Josa"),
  t("assistant", "Gracias, Josa. ¿Y tu teléfono para que el asesor te contacte?"),
  t("user", "6645781234"),
  t("assistant", "Perfecto, Josa. Ya tengo tus datos. El asesor se pondrá en contacto contigo pronto."),
];

describe("el nombre que el cliente dio", () => {
  it("lo saca de la plática real de Josa", () => {
    expect(nombreDe(JOSA)).toBe("Josa");
  });

  it("aguanta 'me llamo' y 'soy'", () => {
    const con = (r: string) => [
      t("assistant", "¿Cuál es tu nombre?"),
      t("user", r),
    ];
    expect(nombreDe(con("Me llamo Ana Sofía"))).toBe("Ana Sofía");
    expect(nombreDe(con("soy Beto"))).toBe("Beto");
  });

  it("NO confunde el teléfono con el nombre", () => {
    // Pasa de verdad: el bot pregunta el nombre y la persona se adelanta con
    // su número. Guardar "6645781234" como nombre se ve ridículo en el panel.
    expect(nombreDe([t("assistant", "¿Cuál es tu nombre?"), t("user", "6645781234")])).toBeNull();
  });

  it("NO se traga una frase larga como nombre", () => {
    const frase = "pues mira todavía lo estoy pensando bien con mi esposa";
    expect(nombreDe([t("assistant", "¿Cuál es tu nombre?"), t("user", frase)])).toBeNull();
  });

  it("sin la pregunta del bot, no adivina", () => {
    // Aquí está el corazón: el nombre se lee de la ESTRUCTURA. Sin la pregunta
    // que lo ancla, no hay de dónde, y prefiere no saber.
    expect(nombreDe([t("user", "Hola, quiero un terreno en Mérida")])).toBeNull();
    expect(nombreDe([])).toBeNull();
  });
});

describe("plazo, pago y uso", () => {
  it("lee la plática de Josa completa", () => {
    expect(datosDe(JOSA)).toEqual({
      plazo: "inmediato",
      formaPago: "financiamiento",
      uso: "inversion",
    });
  });

  it("resuelve un '2' contra los botones que el bot ofreció", () => {
    // En la web los botones salen como lista numerada y la gente contesta el
    // número. Sin resolverlo, un "2" no dice nada y el lead se queda sin calificar.
    const h = [
      t("assistant", "¿Cómo pagarías?\n[[botones: De contado | Con financiamiento | Aún no sé]]"),
      t("user", "2"),
    ];
    expect(datosDe(h).formaPago).toBe("financiamiento");
  });

  it("un número sin botones antes no inventa nada", () => {
    expect(datosDe([t("user", "2")])).toEqual({});
  });

  it("'solo cotizando' se lee como lo que es", () => {
    const h = [
      t("assistant", "¿Para cuándo?\n[[botones: Este mes | 3 a 6 meses | Solo cotizando]]"),
      t("user", "3"),
    ];
    expect(datosDe(h).plazo).toBe("cotizando");
  });

  it("una plática que no llegó a nada devuelve vacío", () => {
    const h = [t("user", "Hola"), t("assistant", "¡Hola! ¿En qué te ayudo?")];
    expect(datosDe(h)).toEqual({});
  });

  it("ignora lo que dice el BOT, solo cuenta lo del cliente", () => {
    // El bot nombra "de contado" y "este mes" al explicar. Si contaran sus
    // palabras, cada plática saldría calificada sin que el cliente dijera nada.
    const h = [
      t("assistant", "Puedes pagar de contado o a mensualidades, y entregamos este mes."),
      t("user", "Ah ok"),
    ];
    expect(datosDe(h)).toEqual({});
  });
});

describe("la prioridad sale de las mismas reglas de siempre", () => {
  it("Josa califica CALIENTE, no 'sin calificar'", () => {
    const d = datosDe(JOSA);
    expect(calcularPrioridad({ plazo: d.plazo!, formaPago: d.formaPago!, uso: d.uso })).toBe(
      "caliente",
    );
  });

  it("con una sola de las dos respuestas no alcanza para calificar", () => {
    const h = [
      t("assistant", "¿Para cuándo?\n[[botones: Este mes | 3 a 6 meses | Solo cotizando]]"),
      t("user", "Este mes"),
    ];
    const d = datosDe(h);
    expect(d.plazo).toBe("inmediato");
    expect(d.formaPago).toBeUndefined(); // → el rescate lo deja "sin_calificar"
  });
});
