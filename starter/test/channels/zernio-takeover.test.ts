/**
 * El asesor contesta a mano y el bot se calla.
 *
 * Sin esto el bot sigue respondiendo encima del asesor y el cliente ve dos
 * voces que se contradicen — pasó en vivo el 2026-09-08. WhatsApp ya lo tenía
 * resuelto por su lado (`whatsapp.smb.message.echoes`); por Zernio el aviso
 * equivalente es `message.sent`, y el bot lo estaba tirando a la basura.
 *
 * Lo que se vigila aquí no es solo que pause: es que pause con QUIÉN escribió.
 * Pausar de más es tan malo como no pausar — si el bot se callara con sus
 * propios mensajes, dejaría de contestarle a todo el mundo desde el primer
 * turno, y por fuera se vería igual que "el cliente no escribió".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { zernioAsesorTakeover } from "../../src/channels/zernio";

const pausas: Array<{ id: string; until: number | null }> = [];

vi.mock("../../src/db/conversations", () => ({
  ConversationsRepo: class {
    async getOrCreate(_ch: string, userId: string) { return { id: `conv-${userId}` }; }
    async setPausedUntil(id: string, until: number | null) { pausas.push({ id, until }); }
  },
}));
vi.mock("../../src/db/settings", () => ({ resolveTakeoverMs: async () => 3_600_000 }));

const env = { DB: {} } as never;

function evento(sentVia: string | null, participantId = "cliente-1") {
  return {
    id: "ev-1",
    event: "message.sent",
    message: { conversationId: "zconv-1", sentVia },
    conversation: { participantId },
  } as never;
}

beforeEach(() => { pausas.length = 0; });

describe("takeover del asesor por Zernio", () => {
  it("un humano en la bandeja de Zernio PAUSA el bot", async () => {
    expect(await zernioAsesorTakeover(evento("human"), env)).toBe(true);
    expect(pausas).toHaveLength(1);
    expect(pausas[0].id).toBe("conv-cliente-1");
    expect(pausas[0].until).toBeGreaterThan(Date.now());
  });

  it("el bot NO se pausa a sí mismo (sentVia=api)", async () => {
    expect(await zernioAsesorTakeover(evento("api"), env)).toBe(false);
    expect(pausas).toHaveLength(0);
  });

  it("el DM del embudo NO pausa — existe para que el bot tome la plática", async () => {
    expect(await zernioAsesorTakeover(evento("comment_automation"), env)).toBe(false);
    expect(pausas).toHaveLength(0);
  });

  it("broadcast y sequence tampoco pausan", async () => {
    for (const v of ["broadcast", "sequence", "workflow", "bulk-api"]) {
      expect(await zernioAsesorTakeover(evento(v), env)).toBe(false);
    }
    expect(pausas).toHaveLength(0);
  });

  it("sentVia null (contestó desde la app de Facebook) SÍ pausa", async () => {
    expect(await zernioAsesorTakeover(evento(null), env)).toBe(true);
    expect(pausas).toHaveLength(1);
  });

  it("un mensaje ENTRANTE nunca dispara el takeover", async () => {
    const entrante = { event: "message.received", message: { sentVia: null } } as never;
    expect(await zernioAsesorTakeover(entrante, env)).toBe(false);
    expect(pausas).toHaveLength(0);
  });

  it("sin forma de saber a quién se le contestó, no pausa a ciegas", async () => {
    const sinNadie = { event: "message.sent", message: { sentVia: "human" } } as never;
    expect(await zernioAsesorTakeover(sinNadie, env)).toBe(false);
    expect(pausas).toHaveLength(0);
  });
});

/**
 * La carrera contra el buffer.
 *
 * El bot espera unos segundos antes de contestar (junta los mensajes sueltos).
 * La pausa se revisaba SOLO al recibir, así que un takeover que caía dentro de
 * esa ventana llegaba tarde: el turno ya había cruzado la puerta y la respuesta
 * salía igual. Y esa ventana es justo cuando el asesor contesta — es cuando
 * está leyendo el mensaje.
 *
 * Pasó en vivo el 2026-09-08 con la conversación 28508082808823310:
 *   07:07:39  el cliente escribe   → no pausada, empieza el buffer
 *   07:07:52  el asesor contesta   → pausa puesta
 *   07:07:55  el bot responde igual
 *
 * Por eso ahora se revisa DOS veces: al recibir y otra vez con la respuesta ya
 * escrita, antes de soltarla.
 */
describe("la pausa que llega durante el buffer", () => {
  it("processBuffer vuelve a revisar la pausa ANTES de enviar", async () => {
    // Se mira el código de verdad, no una simulación: el invariante es de
    // ORDEN y una prueba con mocks no lo protege — un refactor que quite la
    // segunda revisión, o que la deje después del envío, pasaría igual.
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../../src/agent.ts", import.meta.url), "utf8");

    const iBuffer = src.indexOf("async processBuffer(");
    expect(iBuffer).toBeGreaterThan(-1);
    const cuerpo = src.slice(iBuffer);

    const iRevision = cuerpo.indexOf("isPaused(convId)");
    const iEnvio = cuerpo.indexOf("sendChunkedReply(");
    expect(iRevision).toBeGreaterThan(-1);   // existe la segunda revisión
    expect(iEnvio).toBeGreaterThan(-1);
    expect(iRevision).toBeLessThan(iEnvio);  // y va ANTES de soltar la respuesta
  });

  it("la pausa dura mucho más que el buffer", async () => {
    // Si el default del takeover bajara por debajo del buffer, el takeover
    // volvería a llegar tarde y nadie lo notaría hasta ver a un cliente con dos
    // voces. Se lee del código y no se importa: la constante no está exportada
    // y exportarla sería otro parche que `forjabot update` borra.
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../../src/db/settings.ts", import.meta.url), "utf8");
    const m = src.match(/DEFAULT_TAKEOVER_MIN\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1]) * 60_000).toBeGreaterThan(60_000);
  });
});
