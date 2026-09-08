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
