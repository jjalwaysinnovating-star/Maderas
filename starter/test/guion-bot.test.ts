/**
 * El guion del bot: reglas que el dueño aprobó y que no se pueden relajar.
 *
 * Vigila las dos capas donde vive el comportamiento:
 *   • member/config.local.ts (customFields) — va SIEMPRE en el prompt
 *   • member/kb/*.md, ya compilado a scripts/kb-fixtures.json — se recupera
 *
 * Es una prueba de CONTENIDO, no de código: si alguien edita la KB y mete
 * "plusvalía garantizada" o vuelve a ofrecer casas, esto truena antes del
 * deploy. Ese es justamente el error que un lector humano deja pasar.
 */
import { describe, it, expect } from "vitest";
import { businessConfig, memberConfig } from "../member/config.local";
import { calcularPrioridad } from "../member/tools.local";
import kbChunks from "../scripts/kb-fixtures.json";

const campos = businessConfig.customFields;
const prompt = Object.values(campos).join("\n");
const kb = (kbChunks as { id: string; content: string }[]);
const kbTexto = kb.map((c) => c.content).join("\n");
const todo = `${prompt}\n${kbTexto}`;

describe("la KB existe y está compilada", () => {
  it("hay documentos indexados", () => {
    expect(kb.length).toBeGreaterThan(10);
  });

  it("están los nueve documentos del guion", () => {
    for (const doc of [
      "01-quien-soy-y-que-vendo",
      "02-precios-y-medidas",
      "03-financiamiento",
      "04-ciudades-y-desarrollos",
      "05-el-terreno-y-amenidades",
      "06-proceso-y-tramites",
      "07-como-hablar-de-plusvalia",
      "08-guion-de-calificacion",
      "09-tono-y-cuando-pasar-a-humano",
    ]) {
      expect(kb.some((c) => c.id.startsWith(doc)), doc).toBe(true);
    }
  });
});

describe("blindaje legal", () => {
  // Una promesa de rendimiento en venta inmobiliaria es riesgosa. La regla no
  // se relaja porque la marca use la frase ni porque el cliente la diga primero.
  it("la prohibición está en el prompt, no solo en la KB", () => {
    expect(campos.blindajeLegal).toMatch(/plusvalía garantizada.*PROHIBIDA/s);
    expect(campos.blindajeLegal).toMatch(/'desde'/);
  });

  // Probando en vivo, el bot rechazó "plusvalía garantizada" pero enseguida
  // escribió "lo que sí garantizamos es el terreno, la ubicación y la calidad".
  // La palabra queda prohibida entera, no solo pegada a "plusvalía".
  it("la palabra 'garantizar' está prohibida para todo, no solo para plusvalía", () => {
    expect(campos.blindajeLegal).toMatch(/NUNCA escribas la palabra 'garantizar'/);
    expect(campos.blindajeLegal).toMatch(/ni siquiera para cosas que sí son ciertas/);
  });

  it("tampoco se afirma cómo se comportó el mercado en el pasado", () => {
    expect(campos.blindajeLegal).toMatch(/históricamente han\s+subido/);
  });

  it("ningún documento afirma plusvalía garantizada", () => {
    for (const c of kb) {
      // La frase solo puede aparecer prohibiéndola o citando al cliente, nunca
      // como afirmación del bot ("tenemos/ofrecemos/es plusvalía garantizada").
      expect(
        /(?:tenemos|ofrecemos|damos|es|hay|con)\s+plusvalía\s+garantizada/i.test(c.content),
        c.id,
      ).toBe(false);
    }
  });

  it("no se promete un porcentaje de rendimiento", () => {
    expect(todo).not.toMatch(/\d+\s?%\s*(de\s*)?(plusvalía|rendimiento|retorno)/i);
  });
});

describe("los números que más se preguntan van en el prompt", () => {
  // Sin esto, la primera prueba real del bot inventó "$180,000": el precio
  // dependía de que la búsqueda trajera el documento correcto, y no lo trajo.
  it("el precio de arranque no depende de la búsqueda", () => {
    expect(campos.preciosClave).toContain("$550,000");
    expect(campos.preciosClave).toMatch(/NUNCA inventes otra cifra/);
  });

  it("las ocho mensualidades por ciudad están en el prompt", () => {
    for (const [ciudad, precio] of [
      ["Aguascalientes", "$1,244"],
      ["León", "$1,288"],
      ["Querétaro", "$1,348"],
      ["Cancún", "$1,388"],
      ["Monterrey", "$1,474"],
      ["Mérida", "$1,683"],
    ] as const) {
      expect(campos.preciosClave, ciudad).toContain(ciudad);
      expect(campos.preciosClave, precio).toContain(precio);
    }
  });

  it("el prompt y la KB dicen el mismo precio de arranque", () => {
    expect(kbTexto).toContain("$550,000");
    // Una sola cifra de arranque: dos precios distintos es peor que ninguno.
    const otras = kbTexto.match(/desde (?:alrededor de )?\$[\d,]+ ?MXN/gi) ?? [];
    for (const m of otras) expect(m, m).toContain("550,000");
  });
});

describe("solo terrenos", () => {
  it("el prompt lo dice explícitamente", () => {
    expect(campos.queSeVende).toMatch(/ÚNICAMENTE TERRENOS/);
    expect(campos.queSeVende).toMatch(/NO vende casas/);
  });

  it("ningún documento cotiza casas", () => {
    expect(todo).not.toMatch(/\$15,220/);
    expect(todo).not.toMatch(/\bAlba\b|\bStella\b|\bAntara\b|\bLucero\b/);
  });
});

describe("el guion que eligió el dueño", () => {
  it("contesta primero y pregunta después", () => {
    expect(campos.guion).toMatch(/NUNCA arranques preguntando/);
    expect(campos.guion).toMatch(/CONTESTA primero/);
  });

  it("las tres preguntas van en el orden acordado", () => {
    const g = campos.guion;
    let desde = g.indexOf("en este orden:");
    expect(desde, "falta la lista de orden").toBeGreaterThan(-1);
    for (const paso of ["1) USO", "2) PLAZO", "3) PAGO", "4) nombre", "5) teléfono"]) {
      const i = g.indexOf(paso, desde);
      expect(i, `"${paso}" fuera de orden`).toBeGreaterThan(desde);
      desde = i;
    }
  });

  // La primera prueba en vivo hizo dos preguntas en un mensaje y luego volvió
  // a preguntar el uso, que el cliente ya había contestado.
  it("una sola pregunta por mensaje y nada de repetir lo ya contestado", () => {
    expect(campos.guion).toMatch(/UNA sola pregunta por mensaje/);
    expect(campos.guion).toMatch(/NUNCA vuelvas a preguntar algo que el cliente ya\s+contestó/);
    expect(campos.guion).toMatch(/repasa la conversación/);
  });

  it("la ciudad no se cuela en medio de los tres pasos", () => {
    expect(campos.guion).toMatch(/la ciudad se pregunta hasta el final/);
  });

  it("los botones van solo en las tres preguntas que califican", () => {
    expect(campos.dondeVanLosBotones).toMatch(/SOLO en las tres preguntas/);
    expect(campos.dondeVanLosBotones).toMatch(/NO uses botones/);
  });

  it("las etiquetas de los botones caben en un botón nativo (20 caracteres)", () => {
    // WhatsApp y Messenger truncan; una etiqueta cortada arruina la elección.
    const etiquetas = [...campos.dondeVanLosBotones.matchAll(/\[\[botones:([^\]]+)\]\]/g)]
      .flatMap((m) => m[1].split("|").map((s) => s.trim()));
    expect(etiquetas.length).toBe(9);
    for (const e of etiquetas) expect(e.length, e).toBeLessThanOrEqual(20);
  });

  it("se pide un dato a la vez", () => {
    expect(campos.capturaDeDatos).toMatch(/UN dato a la vez/);
    expect(campos.capturaDeDatos).toMatch(/Nunca los pidas\s+juntos/);
  });

  it("el bot no narra su proceso", () => {
    expect(campos.noNarresTuProceso).toMatch(/déjame buscar/i);
    expect(campos.noNarresTuProceso).toMatch(/no encontré/i);
  });

  it("el tono manda máximo un emoji", () => {
    expect(campos.tono).toMatch(/MÁXIMO UN EMOJI/);
  });

  // Probando en vivo se le salió "vos elegís qué construir".
  it("el voseo está prohibido por nombre", () => {
    expect(campos.tono).toMatch(/PROHIBIDO EL VOSEO/);
    for (const v of ["tenés", "querés", "podés", "necesitás"]) {
      expect(campos.tono, v).toContain(v);
    }
  });
});

describe("las respuestas de ejemplo de la KB no rompen sus propias reglas", () => {
  // Lo que la KB trae como respuesta modelo es lo que el bot copia. Si un
  // ejemplo usa voseo o promete, enseña justo lo contrario de la regla.
  const citas = kbTexto
    .split("\n")
    .filter((l) => l.trimStart().startsWith(">"))
    .join("\n");

  it("ninguna respuesta de ejemplo usa voseo", () => {
    expect(citas).not.toMatch(/\b(vos|tenés|querés|podés|sabés|necesitás|elegís)\b/i);
  });

  it("ninguna respuesta de ejemplo garantiza nada", () => {
    expect(citas).not.toMatch(/garantiz/i);
  });
});

describe("las etiquetas de los botones caen en la calificación correcta", () => {
  // El guion promete que "Este mes" + "De contado" es caliente y que "Solo
  // cotizando" nunca lo es. Si las reglas cambian, el guion queda mintiendo.
  it("este mes + ya sabe cómo pagar = caliente", () => {
    expect(calcularPrioridad({ plazo: "inmediato", formaPago: "contado" })).toBe("caliente");
    expect(calcularPrioridad({ plazo: "inmediato", formaPago: "financiamiento" })).toBe("caliente");
  });

  it("el inversionista de contado a 3-6 meses también es caliente", () => {
    expect(
      calcularPrioridad({ plazo: "medio_plazo", formaPago: "contado", uso: "inversion" }),
    ).toBe("caliente");
  });

  it("3 a 6 meses sin pago definido es tibio", () => {
    expect(calcularPrioridad({ plazo: "medio_plazo", formaPago: "no_definido" })).toBe("tibio");
  });

  it("solo cotizando es frío pague como pague", () => {
    for (const pago of ["contado", "credito", "financiamiento", "no_definido"] as const) {
      expect(calcularPrioridad({ plazo: "cotizando", formaPago: pago }), pago).toBe("frio");
    }
  });
});

describe("datos del negocio", () => {
  it("el nombre no menciona casas", () => {
    expect(memberConfig.businessName).toBe("Ciudad Maderas — Terrenos Premium");
  });

  it("cada ciudad conserva su propia mensualidad", () => {
    const precios = kb
      .filter((c) => c.id.startsWith("02-precios"))
      .map((c) => c.content)
      .join("\n");
    for (const [ciudad, precio] of [
      ["Querétaro", "$1,348"],
      ["Mérida", "$1,683"],
      ["Monterrey", "$1,474"],
      ["Cancún", "$1,388"],
    ] as const) {
      // La tabla pone ciudad y precio en el mismo renglón.
      const linea = precios.split("\n").find((l) => l.includes(ciudad) && l.includes("$"));
      expect(linea, ciudad).toBeTruthy();
      expect(linea, ciudad).toContain(precio);
    }
  });

  it("los desarrollos publicados son los reales de la marca", () => {
    // El markdown va con saltos de línea a los 80 caracteres, así que un nombre
    // puede quedar partido: se compara sobre el texto con espacios normalizados.
    const doc = kb
      .filter((c) => c.id.startsWith("04-ciudades"))
      .map((c) => c.content)
      .join("\n")
      .replace(/\s+/g, " ");
    for (const d of [
      "Ciudad Maderas Bosques",
      "Privada Maderas Corregidora",
      "Ciudad Maderas San Miguel de Allende",
      "Ciudad Maderas Hacienda Península",
      "Ciudad Maderas Sierra San Luis Potosí",
    ]) {
      expect(doc, d).toContain(d);
    }
  });
});
