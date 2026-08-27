/**
 * El canal web y el marcador de botones.
 *
 * En Telegram/Messenger/WhatsApp el marcador [[botones: …]] lo convierte
 * sendReply ANTES de mandar. El canal web no pasa por ahí: su sendReply es
 * no-op porque el navegador lee lo que quedó guardado en D1, y ahí el texto
 * está tal cual salió del modelo. Sin convertirlo al servir, el visitante ve
 * "[[botones: Invertir | Construir mi casa | …]]" impreso en la página — que
 * fue exactamente lo que pasó la primera vez que se probó el bot en vivo.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";

vi.mock("agents", () => ({ Agent: class {} }));

import worker from "../../src/index";

const SITIO = "ciudad-maderas.jjalwaysinnovating.workers.dev";
const SESION = "sesion-de-prueba";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as any;

let env: any;

async function guardaRespuesta(contenido: string) {
  const db = new Db(env.DB);
  const ahora = Date.now();
  await db.run(
    `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
     VALUES ('conv-1', 'web', ?, ?, ?)`,
    [SESION, ahora, ahora],
  );
  await db.run(
    `INSERT INTO messages (id, conversation_id, role, content, created_at)
     VALUES ('msg-1', 'conv-1', 'assistant', ?, ?)`,
    [contenido, ahora],
  );
}

const poll = () =>
  worker.fetch(
    new Request(`https://${SITIO}/web/poll?session=${SESION}`, {
      headers: { origin: `https://${SITIO}` },
    }),
    env,
    ctx,
  );

beforeEach(async () => {
  const mf = await createTestMiniflare();
  env = {
    BOT_NAME: "Asesor",
    BUSINESS_NAME: "Ciudad Maderas — Terrenos Premium",
    BOT_LANGUAGE: "es",
    BOT_TIER: "free",
    BUFFER_SECONDS: "15",
    WEB_SITES: SITIO,
    DB: await mf.getD1Database("DB"),
  };
});

describe("GET /web/poll — marcador de botones", () => {
  it("el visitante nunca ve el marcador crudo", async () => {
    await guardaRespuesta(
      "Los terrenos arrancan desde $550,000 MXN. ¿Para qué buscas el terreno?\n" +
        "[[botones: Invertir | Construir mi casa | Solo información]]",
    );

    const { messages } = (await (await poll()).json()) as { messages: { content: string }[] };

    expect(messages).toHaveLength(1);
    expect(messages[0].content).not.toContain("[[botones");
    expect(messages[0].content).not.toContain("]]");
  });

  it("las opciones salen como lista numerada (la web no tiene botones nativos)", async () => {
    await guardaRespuesta("¿Para cuándo?\n[[botones: Este mes | 3 a 6 meses | Solo cotizando]]");

    const { messages } = (await (await poll()).json()) as { messages: { content: string }[] };

    expect(messages[0].content).toContain("1) Este mes");
    expect(messages[0].content).toContain("2) 3 a 6 meses");
    expect(messages[0].content).toContain("3) Solo cotizando");
  });

  it("el texto de arriba se conserva íntegro", async () => {
    await guardaRespuesta("Desde $550,000 MXN.\n[[botones: Invertir | Construir mi casa]]");

    const { messages } = (await (await poll()).json()) as { messages: { content: string }[] };

    expect(messages[0].content).toContain("Desde $550,000 MXN.");
  });

  it("una respuesta sin marcador sale intacta", async () => {
    await guardaRespuesta("Claro que sí, te cuento: no se revisa buró.");

    const { messages } = (await (await poll()).json()) as { messages: { content: string }[] };

    expect(messages[0].content).toBe("Claro que sí, te cuento: no se revisa buró.");
  });
});
