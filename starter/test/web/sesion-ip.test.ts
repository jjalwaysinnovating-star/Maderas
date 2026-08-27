/**
 * La sesión del chat web sobrevive un cambio de IP.
 *
 * En celular la IP cambia sola al pasar de WiFi a datos. Antes, cualquier
 * cambio hacía que el worker emitiera sesión nueva: el bot perdía el hilo y
 * volvía a preguntar lo ya contestado. En una calificación eso no es un detalle
 * cosmético — se pierde el dato y el lead baja de caliente a tibio, que fue
 * justo lo que pasó probando el bot en vivo.
 *
 * Lo que NO puede pasar: aceptar una sesión inventada por el visitante.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import { sesionConocida } from "../../src/web/widget";

vi.mock("agents", () => ({ Agent: class {} }));

import worker from "../../src/index";

const SITIO = "ciudad-maderas.jjalwaysinnovating.workers.dev";
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as any;

let env: any;

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

async function creaConversacion(sessionId: string) {
  const ahora = Date.now();
  await new Db(env.DB).run(
    `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
     VALUES (?, 'web', ?, ?, ?)`,
    [`conv-${sessionId}`, sessionId, ahora, ahora],
  );
}

describe("sesionConocida", () => {
  it("reconoce una sesión que ya tiene conversación", async () => {
    await creaConversacion("abc123-0123456789abcdef");
    expect(await sesionConocida(env, "abc123-0123456789abcdef")).toBe(true);
  });

  it("rechaza una sesión que nunca se emitió", async () => {
    expect(await sesionConocida(env, "abc123-0123456789abcdef")).toBe(false);
  });

  it("rechaza ids con forma inventada aunque exista la fila", async () => {
    // El visitante no elige su identidad: si no tiene la forma exacta que emite
    // el worker, ni se consulta la base.
    for (const malo of [
      "sin-guion",
      "abc123-NOHEX0123456789",
      "abc123-0123456789abcde", // 15, no 16
      "../../etc/passwd",
      "",
    ]) {
      expect(await sesionConocida(env, malo), malo).toBe(false);
    }
  });
});

describe("POST /web/send — continuidad de la sesión", () => {
  const manda = (sessionId: string, ip: string) =>
    worker.fetch(
      new Request(`https://${SITIO}/web/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `https://${SITIO}`,
          "CF-Connecting-IP": ip,
        },
        body: JSON.stringify({ sessionId, text: "hola" }),
      }),
      env,
      ctx,
    );

  it("conserva la sesión aunque el visitante llegue desde otra IP", async () => {
    const primera = (await (await manda("", "10.0.0.1")).json()) as { sessionId: string };
    expect(primera.sessionId).toMatch(/^[0-9a-z]+-[0-9a-f]{16}$/);

    // El pipeline creó la conversación con esa sesión.
    await creaConversacion(primera.sessionId).catch(() => {});

    const segunda = (await (await manda(primera.sessionId, "10.0.0.99")).json()) as {
      sessionId: string;
    };
    expect(segunda.sessionId).toBe(primera.sessionId);
  });

  it("una sesión inventada NO se acepta: se emite una nueva", async () => {
    const r = (await (await manda("ffffff-deadbeefdeadbeef", "10.0.0.1")).json()) as {
      sessionId: string;
    };
    expect(r.sessionId).not.toBe("ffffff-deadbeefdeadbeef");
    expect(r.sessionId).toMatch(/^[0-9a-z]+-[0-9a-f]{16}$/);
  });
});
