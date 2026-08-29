import { describe, it, expect, beforeEach } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import { LeadsRepo } from "../../src/db/leads";

let repo: LeadsRepo;

beforeEach(async () => {
  const mf = await createTestMiniflare();
  const d1 = await mf.getD1Database("DB");
  repo = new LeadsRepo(new Db(d1 as any));
});

describe("LeadsRepo", () => {
  it("creates a lead and lists it", async () => {
    const id = await repo.create({
      name: "María",
      contact: "+5215512345",
      intent: "Corte+barba 5pm",
      conversationId: null,
      channelUserId: "5512345",
    });
    expect(id).toBeTruthy();
    const list = await repo.list(10);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("María");
    expect(list[0].status).toBe("new");
  });

  it("setStatus updates the row", async () => {
    const id = await repo.create({
      name: "Pedro",
      contact: "pedro@x.com",
      intent: "tinte",
      conversationId: null,
      channelUserId: null,
    });
    await repo.setStatus(id, "sold");
    const list = await repo.list(10);
    expect(list[0].status).toBe("sold");
  });

  it("delete quita solo el lead pedido", async () => {
    const borrar = await repo.create({
      name: "Lead de prueba",
      contact: "555",
      intent: "prueba",
      conversationId: null,
      channelUserId: null,
    });
    await repo.create({
      name: "Cliente real",
      contact: "686",
      intent: "terreno en Querétaro",
      conversationId: null,
      channelUserId: null,
    });

    await repo.delete(borrar);

    const list = await repo.list(10);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Cliente real");
  });

  it("delete con un id que no existe no truena ni borra de más", async () => {
    await repo.create({
      name: "Cliente real",
      contact: "686",
      intent: "terreno en Querétaro",
      conversationId: null,
      channelUserId: null,
    });

    await repo.delete("no-existe");

    expect(await repo.list(10)).toHaveLength(1);
  });
});
