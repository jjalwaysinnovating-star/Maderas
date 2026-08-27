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
    expect(telegram[0].text).toContain("sin registrar");
    // El teléfono va tal como lo escribió el cliente, con sus espacios.
    expect(telegram[0].text.replace(/\s/g, "")).toContain("6861112233");
    expect(telegram[0].text).toContain("/admin/leads");
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
