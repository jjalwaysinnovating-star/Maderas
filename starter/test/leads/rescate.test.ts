/**
 * Red de seguridad del lead prometido.
 *
 * El caso real: en Messenger un cliente dio ciudad, forma de pago, plazo,
 * nombre y teléfono; el bot le contestó "un asesor te contactará" y no llamó a
 * ninguna herramienta. En el panel no quedó nada, el asesor no se enteró y el
 * cliente se quedó esperando. Por fuera se veía como si todo hubiera salido
 * bien — por eso hace falta que esto NO dependa del modelo.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import { LeadsRepo, leadMetadata } from "../../src/db/leads";
import { MessagesRepo } from "../../src/db/messages";
import {
  prometioContacto,
  telefonoDe,
  rescataLeadPrometido,
} from "../../src/leads/rescate";

const CONV = "conv-1";
let env: any;
let telegram: { text: string }[];

beforeEach(async () => {
  const mf = await createTestMiniflare();
  telegram = [];
  env = {
    DB: await mf.getD1Database("DB"),
    BUSINESS_NAME: "Ciudad Maderas — Terrenos Premium",
    DASHBOARD_BASE_URL: "https://ciudad-maderas.jjalwaysinnovating.workers.dev",
    TELEGRAM_BOT_TOKEN: "token",
    OWNER_TELEGRAM_CHAT_ID: "1",
  };
  vi.stubGlobal("fetch", async (_u: any, init: any) => {
    telegram.push(JSON.parse(init?.body ?? "{}"));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });

  const db = new Db(env.DB);
  const ahora = Date.now();
  await db.run(
    `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
     VALUES (?, 'zernio', 'jay', ?, ?)`,
    [CONV, ahora, ahora],
  );
  const msgs = new MessagesRepo(db);
  await msgs.append(CONV, "user", "En cancun");
  await msgs.append(CONV, "assistant", "En Cancún tenemos terrenos desde $550,000 MXN.");
  await msgs.append(CONV, "user", "Lo quiero en financiamiento");
  await msgs.append(CONV, "user", "Si este mes");
  await msgs.append(CONV, "user", "Jorge, mi tel es 686 111 2233");
});

afterEach(() => vi.unstubAllGlobals());

describe("detectar la promesa", () => {
  it("reconoce las frases con las que el bot se compromete", () => {
    for (const f of [
      "Un asesor te contactará hoy mismo.",
      "Un asesor ya fue notificado y te contacta hoy.",
      "Perfecto, un asesor se comunica contigo al 6861112233.",
      "Listo, Jorge. Ya tengo tus datos y un asesor te buscará.",
      "Te tengo registrado con interés en Puebla.",
      "Ya quedaste registrado.",
      "Te registré para que te coticen.",
    ]) {
      expect(prometioContacto(f), f).toBe(true);
    }
  });

  it("no confunde una PREGUNTA con una promesa", () => {
    // El caso de Instagram ("Jahir"): el bot iba bien, apenas pidiendo el
    // teléfono, y el rescate se disparó porque la pregunta trae las mismas
    // palabras que una promesa. El asesor recibió un "prospecto sin registrar"
    // cuando no había fallado nada.
    for (const f of [
      "¿Y tu teléfono para que un asesor te contacte?",
      "¿Me pasas tu número y un asesor se comunica contigo?",
      "Perfecto, Jahir. ¿Cuál es tu teléfono para que un asesor te busque?",
    ]) {
      expect(prometioContacto(f), f).toBe(false);
    }
  });

  it("sí se dispara cuando la promesa acompaña a una pregunta", () => {
    // Media respuesta puede ser promesa y la otra media pregunta. Basta con que
    // UNA frase afirme para que cuente.
    expect(
      prometioContacto("Listo, ya quedaste registrado. ¿Hay alguna ciudad que te interese?"),
    ).toBe(true);
  });

  it("no se dispara con información normal", () => {
    for (const f of [
      "Los terrenos arrancan desde $550,000 MXN.",
      "Un asesor te puede mostrar el plano de la zona, si quieres.",
      "¿Para qué buscas el terreno?",
      "Te comparto los desarrollos disponibles en Mérida.",
      "No se revisa buró de crédito.",
    ]) {
      expect(prometioContacto(f), f).toBe(false);
    }
  });
});

describe("leer el teléfono de lo que escribió el cliente", () => {
  it("lo saca con o sin separadores", () => {
    expect(telefonoDe(["mi tel es 6861112233"])?.replace(/\D/g, "")).toBe("6861112233");
    expect(telefonoDe(["686 111 2233"])?.replace(/\D/g, "")).toBe("6861112233");
    expect(telefonoDe(["+52 686 111 2233"])?.replace(/\D/g, "")).toBe("526861112233");
  });

  it("no confunde un precio con un teléfono", () => {
    expect(telefonoDe(["cuesta $550,000 y el enganche es 1%"])).toBeNull();
    expect(telefonoDe(["quiero en 2026"])).toBeNull();
  });
});

describe("el rescate", () => {
  it("levanta el lead cuando el bot prometió y no registró", async () => {
    const r = await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");

    expect(r.rescatado).toBe(true);
    const leads = await new LeadsRepo(new Db(env.DB)).list(10);
    expect(leads).toHaveLength(1);
    expect(leads[0].contact?.replace(/\D/g, "")).toBe("6861112233");
    expect(leadMetadata(leads[0]).origen).toBe("rescate");
    // La conversación entera va en las notas: es el contexto que el asesor no
    // tiene porque nadie lo calificó.
    expect(leads[0].notes).toContain("Lo quiero en financiamiento");
    expect(leads[0].notes).toContain("Si este mes");
  });

  it("avisa al asesor — a esa persona ya le prometieron una llamada", async () => {
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");

    expect(telegram).toHaveLength(1);
    // Antes se exigía la frase exacta "sin registrar". Eso caducó a propósito:
    // ahora el encabezado cambia cuando el prospecto califica caliente, y decir
    // "🔥 CALIENTE que el bot no registró" es mejor aviso que el genérico. Lo
    // que NO puede cambiar —y es lo que se fija aquí— es que al asesor se le
    // diga que NO quedó registrado, con qué llamarle y a dónde ir.
    expect(telegram[0].text).toMatch(/no.{0,3}registr|sin registrar/i);
    // El teléfono va tal como lo escribió el cliente, con sus espacios.
    expect(telegram[0].text.replace(/\s/g, "")).toContain("6861112233");
    expect(telegram[0].text).toContain("/admin/leads");
  });

  it("un rescate que SÍ califica se avisa como caliente, no como uno más", async () => {
    // La plática trae plazo ("Si este mes") y forma de pago ("en
    // financiamiento"): con las reglas de siempre eso es caliente. Antes la
    // ficha salía "sin_calificar" y en la lista del asesor se veía igual que un
    // tibio — un prospecto bueno escondido entre los demás.
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");

    const [lead] = await new LeadsRepo(new Db(env.DB)).list(10);
    expect(leadMetadata(lead).prioridad).toBe("caliente");
    expect(leadMetadata(lead).plazo).toBe("inmediato");
    expect(leadMetadata(lead).forma_pago).toBe("financiamiento");
    expect(telegram[0].text).toContain("CALIENTE");
  });

  it("no inventa el nombre cuando el bot nunca lo preguntó", async () => {
    // El cliente escribió "Jorge, mi tel es 686 111 2233", pero el bot jamás
    // preguntó "¿cuál es tu nombre?". Sin esa ancla no se adivina: sacar
    // "Jorge" de ahí funcionaría hoy y fallaría feo con "Hola, mi tel es…".
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");

    const [lead] = await new LeadsRepo(new Db(env.DB)).list(10);
    expect(lead.name).toBeNull();
    expect(lead.contact?.replace(/\D/g, "")).toBe("6861112233");
  });

  it("NO se mete si el bot sí registró al prospecto", async () => {
    await new LeadsRepo(new Db(env.DB)).create({
      conversationId: CONV,
      channelUserId: null,
      name: "Jorge",
      intent: "Interesado en un terreno en Cancún",
      metadata: { prioridad: "caliente" },
    });

    const r = await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");

    expect(r.rescatado).toBe(false);
    expect(await new LeadsRepo(new Db(env.DB)).list(10)).toHaveLength(1);
    expect(telegram).toHaveLength(0);
  });

  it("no duplica si el bot repite la promesa en varios turnos", async () => {
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");
    await rescataLeadPrometido(env, CONV, "Ya quedaste registrado, un asesor te busca.");

    expect(await new LeadsRepo(new Db(env.DB)).list(10)).toHaveLength(1);
    expect(telegram).toHaveLength(1);
  });

  it("no hace nada en una respuesta que solo informa", async () => {
    const r = await rescataLeadPrometido(env, CONV, "Los terrenos arrancan desde $550,000 MXN.");

    expect(r.rescatado).toBe(false);
    expect(await new LeadsRepo(new Db(env.DB)).list(10)).toHaveLength(0);
  });
});

describe("completar el rescate con lo que llega después", () => {
  // El rescate se dispara en cuanto el bot promete, y eso suele pasar ANTES de
  // que el cliente dé su teléfono. Sin completar, el asesor se quedaba con un
  // prospecto al que no puede llamar.
  it("le agrega el teléfono cuando el cliente lo da más tarde", async () => {
    const db = new Db(env.DB);
    const msgs = new MessagesRepo(db);

    // Primer rescate: todavía no hay teléfono en la conversación.
    await db.run("DELETE FROM messages WHERE conversation_id = ?", [CONV]);
    await msgs.append(CONV, "user", "En cancun, financiamiento, este mes");
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");

    let leads = await new LeadsRepo(db).list(10);
    expect(leads).toHaveLength(1);
    expect(leads[0].contact).toBeNull();

    // El cliente da su número y el bot vuelve a prometer.
    await msgs.append(CONV, "user", "Sergio, mi tel 6864445566");
    await rescataLeadPrometido(env, CONV, "Perfecto, un asesor te contactará.");

    leads = await new LeadsRepo(db).list(10);
    expect(leads, "no debe duplicar").toHaveLength(1);
    expect(leads[0].contact?.replace(/\D/g, "")).toBe("6864445566");
    expect(leads[0].notes).toContain("Sergio");
  });

  it("AVISA cuando por fin llega el teléfono", async () => {
    // El aviso del rescate sale casi siempre antes de que el cliente dé su
    // número, y dice "todavía no lo da". El momento en que llega es justo
    // cuando el asesor puede hacer algo — y era el único en que no se avisaba
    // nada: el teléfono entraba al panel en silencio. Pasó con "Jahir".
    const db = new Db(env.DB);
    const msgs = new MessagesRepo(db);

    await db.run("DELETE FROM messages WHERE conversation_id = ?", [CONV]);
    await msgs.append(CONV, "user", "En cancun, financiamiento, este mes");
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");

    expect(telegram).toHaveLength(1);
    expect(telegram[0].text).toContain("todavía no lo da");

    await msgs.append(CONV, "user", "Jahir, 676 263 5178");
    await rescataLeadPrometido(env, CONV, "Listo, Jahir. Un asesor te contactará en breve.");

    expect(telegram, "el teléfono tardío merece su propio aviso").toHaveLength(2);
    expect(telegram[1].text).toContain("teléfono");
    expect(telegram[1].text.replace(/\s/g, "")).toContain("6762635178");
    expect(telegram[1].text).toContain("/admin/leads");
  });

  it("no repite el aviso del teléfono en los turnos siguientes", async () => {
    const db = new Db(env.DB);
    const msgs = new MessagesRepo(db);

    await db.run("DELETE FROM messages WHERE conversation_id = ?", [CONV]);
    await msgs.append(CONV, "user", "En cancun, financiamiento, este mes");
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará hoy mismo.");
    await msgs.append(CONV, "user", "Jahir, 676 263 5178");
    await rescataLeadPrometido(env, CONV, "Listo, un asesor te contactará.");
    await rescataLeadPrometido(env, CONV, "Ya quedaste registrado.");
    await rescataLeadPrometido(env, CONV, "Un asesor te busca hoy.");

    expect(telegram).toHaveLength(2);
  });

  it("solo avisa la primera vez, no en cada turno", async () => {
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará.");
    await rescataLeadPrometido(env, CONV, "Un asesor te contactará.");
    await rescataLeadPrometido(env, CONV, "Ya quedaste registrado.");

    expect(telegram).toHaveLength(1);
  });
});

describe("un hilo viejo no tapa al prospecto de hoy", () => {
  // En Messenger la conversación con una persona NO se cierra nunca. Alguien
  // volvió a escribir desde un Messenger que ya había consultado la semana
  // pasada, calificó caliente, y no se registró ni se avisó — la red vio el
  // lead viejo y creyó que ya estaba hecho.
  const HACE_DOS_DIAS = Date.now() - 48 * 3600_000;

  async function leadViejo(metadata: Record<string, string>) {
    await new Db(env.DB).run(
      `INSERT INTO leads (id, conversation_id, name, intent, metadata, status, created_at, updated_at)
       VALUES ('viejo', ?, 'Consulta anterior', 'Interesado', ?, 'new', ?, ?)`,
      [CONV, JSON.stringify(metadata), HACE_DOS_DIAS, HACE_DOS_DIAS],
    );
  }

  it("rescata aunque el hilo traiga un lead de hace dos días", async () => {
    await leadViejo({ prioridad: "caliente" });

    const r = await rescataLeadPrometido(env, CONV, "Un asesor se comunica contigo al 4561347895.");

    expect(r.rescatado).toBe(true);
    expect(await new LeadsRepo(new Db(env.DB)).list(10)).toHaveLength(2);
    expect(telegram).toHaveLength(1);
  });

  it("sigue sin duplicar cuando el lead es de esta misma plática", async () => {
    await new LeadsRepo(new Db(env.DB)).create({
      conversationId: CONV,
      channelUserId: null,
      name: "Josa",
      intent: "Interesado en un terreno en Cancún",
      metadata: { prioridad: "caliente" },
    });

    const r = await rescataLeadPrometido(env, CONV, "Un asesor se comunica contigo.");

    expect(r.rescatado).toBe(false);
    expect(telegram).toHaveLength(0);
  });

  it("reconoce la promesa exacta que se le hizo a Josa", () => {
    expect(prometioContacto("Listo, Josa. Te registro con el equipo para que te cotice.")).toBe(true);
    expect(
      prometioContacto("Perfecto. Un asesor se comunica contigo al 4561347895 para mostrarte los terrenos."),
    ).toBe(true);
  });
});

describe("el hilo eterno de Messenger: qué se lee de dónde", () => {
  /**
   * El caso real que destapó esto (2026-09-20).
   *
   * En Messenger el hilo con una persona no se cierra NUNCA, así que la visita
   * de hoy y la de hace doce días viven en la misma fila. Aquel prospecto
   * contestó todo el guion el día 8 —uso, plazo, pago, nombre y teléfono—, el
   * bot dijo "ya tengo tus datos" y no llamó a la herramienta. El día 20 volvió
   * a escribir, preguntó por OTRA ciudad y pidió que lo contactaran.
   *
   * Su plática tenía 30 mensajes y el rescate solo leía los últimos 20: el
   * nombre entró por un pelo y las tres respuestas que califican quedaron
   * fuera. La ficha llegó a la asesora con teléfono pero "sin calificar", o sea
   * sin la única señal que sirve para decidir a quién llamar primero.
   */
  const CONV2 = "conv-hilo-eterno";
  const HACE_12_DIAS = -12 * 24 * 60 * 60 * 1000;

  async function siembraHiloLargo(env: any) {
    const db = new Db(env.DB);
    const ahora = Date.now();
    await db.run(
      `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
       VALUES (?, 'zernio', 'josa', ?, ?)`,
      [CONV2, ahora + HACE_12_DIAS, ahora],
    );
    // La visita VIEJA: el guion completo.
    const viejo: [string, string][] = [
      ["user", "Quiero un terreno en cancun"],
      ["assistant", "Perfecto, Cancún es una excelente opción. ¿Para qué buscas el terreno?"],
      ["user", "Invertir"],
      ["assistant", "Claro. ¿Para cuándo necesitarías avanzar?"],
      ["user", "Este mes"],
      ["assistant", "¿Cómo te gustaría pagar?"],
      ["user", "Con financiamiento"],
      ["assistant", "¿Cuál es tu nombre?"],
      ["user", "Josa"],
      ["assistant", "Gracias, Josa. ¿Y tu teléfono para que el asesor te contacte?"],
      ["user", "6645781234"],
      ["assistant", "Perfecto, Josa. Ya tengo tus datos."],
    ];
    let t = ahora + HACE_12_DIAS;
    for (const [role, content] of viejo) {
      await db.run(
        `INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
        [`v${t}-${Math.random()}`, CONV2, role, content, (t += 60_000)],
      );
    }
    // Relleno, para pasar de 20 mensajes y reproducir el corte de la ventana.
    for (let i = 0; i < 8; i++) {
      await db.run(
        `INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
        [`r${i}`, CONV2, i % 2 ? "assistant" : "user", i % 2 ? "¡Hola de nuevo!" : "Hola", (t += 60_000)],
      );
    }
    // La visita de HOY: otra ciudad, sin volver a calificar.
    const hoy: [string, string][] = [
      ["user", "Que ciudades tienes"],
      ["assistant", "Tenemos terrenos en 8 ciudades de México."],
      ["user", "Aguascalientes"],
      ["assistant", "Aguascalientes tiene buen potencial."],
      ["user", "Si, comunicame con uno"],
    ];
    let h = ahora - 5 * 60_000;
    for (const [role, content] of hoy) {
      await db.run(
        `INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
        [`h${h}-${Math.random()}`, CONV2, role, content, (h += 30_000)],
      );
    }
  }

  it("la IDENTIDAD sí se trae del hilo entero: un nombre no caduca", async () => {
    await siembraHiloLargo(env);
    await rescataLeadPrometido(env, CONV2, "El asesor te contactará pronto.");

    const lead = (await new LeadsRepo(new Db(env.DB)).list(10)).find((l) => l.conversation_id === CONV2)!;
    expect(lead.name).toBe("Josa");
    expect(lead.contact?.replace(/\D/g, "")).toBe("6645781234");
  });

  it("la CALIFICACIÓN no se hereda de una visita de hace doce días", async () => {
    // Quien dijo "este mes" hace doce días —y hoy preguntó por otra ciudad sin
    // volver a decirlo— no es un caliente de hoy. Marcarlo así mandaría al
    // asesor a una llamada urgente que nadie pidió.
    await siembraHiloLargo(env);
    await rescataLeadPrometido(env, CONV2, "El asesor te contactará pronto.");

    const lead = (await new LeadsRepo(new Db(env.DB)).list(10)).find((l) => l.conversation_id === CONV2)!;
    expect(leadMetadata(lead).prioridad).toBe("sin_calificar");
  });

  it("pero el asesor SÍ ve lo que había contestado antes, fechado y aparte", async () => {
    await siembraHiloLargo(env);
    await rescataLeadPrometido(env, CONV2, "El asesor te contactará pronto.");

    const lead = (await new LeadsRepo(new Db(env.DB)).list(10)).find((l) => l.conversation_id === CONV2)!;
    expect(lead.notes).toContain("Ya había escrito en este mismo hilo");
    expect(lead.notes).toMatch(/plazo: inmediato/);
    expect(lead.notes).toMatch(/no de hoy/i); // que nadie lo confunda con hoy
    // Y la visita de hoy va completa.
    expect(lead.notes).toContain("Aguascalientes");
  });

  it("una plática larga de UNA sola sentada sí califica entera", async () => {
    // El otro lado de la moneda: si todo pasó hoy, la ventana no debe cortar
    // nada aunque sean más de 20 mensajes. Era lo que rompía el tope viejo.
    const db = new Db(env.DB);
    const CONV3 = "conv-larga-hoy";
    const ahora = Date.now();
    await db.run(
      `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
       VALUES (?, 'zernio', 'largo', ?, ?)`,
      [CONV3, ahora, ahora],
    );
    let t = ahora - 40 * 60_000;
    const mete = (role: string, content: string) =>
      db.run(`INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
        [`L${t}-${Math.random()}`, CONV3, role, content, (t += 60_000)]);
    await mete("user", "Invertir");
    await mete("user", "Este mes");
    await mete("user", "Con financiamiento");
    for (let i = 0; i < 24; i++) await mete(i % 2 ? "assistant" : "user", "Cuéntame más del desarrollo");
    await mete("assistant", "¿Cuál es tu nombre?");
    await mete("user", "Ramiro");
    await mete("user", "Mi tel es 686 222 3344");

    await rescataLeadPrometido(env, CONV3, "Un asesor te contactará hoy mismo.");
    const lead = (await new LeadsRepo(new Db(env.DB)).list(10)).find((l) => l.conversation_id === CONV3)!;
    expect(leadMetadata(lead).prioridad).toBe("caliente");
    expect(lead.name).toBe("Ramiro");
  });
});
