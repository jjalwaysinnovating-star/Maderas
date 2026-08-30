/**
 * El panel respeta el reparto entre asesores.
 *
 * Las pruebas de member/asesores.local.ts comprueban la REGLA; estas comprueban
 * que la pantalla y el CSV de verdad la usan. Se separan porque es fácil que la
 * regla quede perfecta y alguien se olvide de enchufarla en una de las dos
 * salidas — y el CSV es justo la que dolería: un botón "Exportar" que ignore el
 * filtro se baja los prospectos del otro asesor completos, con teléfono.
 *
 * El reparto real del bot tiene UN solo asesor, así que `filtroDeLeads`
 * devolvería "todo" y no se vería nada. Por eso aquí se sustituye por uno de
 * dos asesores.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import { LeadsRepo } from "../../src/db/leads";

const filtroFalso = vi.hoisted(() => ({
  valor: { modo: "todo" } as
    | { modo: "todo" }
    | { modo: "asesor"; slug: string; nombre: string; esPorDefecto: boolean }
    | { modo: "ninguno"; motivo: string },
}));

vi.mock("../../member/asesores.local", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  filtroDeLeads: () => filtroFalso.valor,
}));

const { renderLeads, exportLeadsCsv } = await import("../../src/admin/views/leads");

let env: any;

beforeEach(async () => {
  const mf = await createTestMiniflare();
  env = {
    DB: await mf.getD1Database("DB"),
    BUSINESS_NAME: "Ciudad Maderas — Terrenos Premium",
    BOT_LANGUAGE: "es-MX",
  };
  const repo = new LeadsRepo(new Db(env.DB));
  await repo.create({ conversationId: null, channelUserId: null, name: "Cliente de Ana", intent: "quiere en Cancún", metadata: { asesor: "ana" } });
  await repo.create({ conversationId: null, channelUserId: null, name: "Cliente de Beto", intent: "quiere en León", metadata: { asesor: "beto" } });
  await repo.create({ conversationId: null, channelUserId: null, name: "Lead viejo", intent: "sin dueño", metadata: {} });
  filtroFalso.valor = { modo: "todo" };
});

describe("la pantalla de leads", () => {
  it("sin reparto los enseña todos", async () => {
    const html = await renderLeads(env);
    expect(html).toContain("Cliente de Ana");
    expect(html).toContain("Cliente de Beto");
    expect(html).toContain("Lead viejo");
  });

  it("un asesor NO ve los del otro", async () => {
    filtroFalso.valor = { modo: "asesor", slug: "beto", nombre: "Beto", esPorDefecto: false };
    const html = await renderLeads(env);
    expect(html).toContain("Cliente de Beto");
    expect(html).not.toContain("Cliente de Ana");
    expect(html).not.toContain("Lead viejo");
  });

  it("el asesor por defecto se lleva los que no tienen dueño", async () => {
    filtroFalso.valor = { modo: "asesor", slug: "ana", nombre: "Ana", esPorDefecto: true };
    const html = await renderLeads(env);
    expect(html).toContain("Cliente de Ana");
    expect(html).toContain("Lead viejo");
    expect(html).not.toContain("Cliente de Beto");
  });

  it("deja ver de quién es la lista", async () => {
    // Sin esto, el que ve pocos leads cree que el bot dejó de funcionar.
    filtroFalso.valor = { modo: "asesor", slug: "beto", nombre: "Beto", esPorDefecto: false };
    expect(await renderLeads(env)).toContain("Beto");
  });

  it("un correo sin asesor no ve NADA y se le explica", async () => {
    filtroFalso.valor = { modo: "ninguno", motivo: "Tu correo no está asignado a ningún asesor." };
    const html = await renderLeads(env);
    expect(html).not.toContain("Cliente de Ana");
    expect(html).not.toContain("Cliente de Beto");
    expect(html).not.toContain("Lead viejo");
    expect(html).toContain("no está asignado");
  });
});

describe("el CSV", () => {
  it("respeta el mismo filtro que la pantalla", async () => {
    filtroFalso.valor = { modo: "asesor", slug: "beto", nombre: "Beto", esPorDefecto: false };
    const csv = await exportLeadsCsv(env);
    expect(csv).toContain("Cliente de Beto");
    expect(csv).not.toContain("Cliente de Ana");
    expect(csv).not.toContain("Lead viejo");
  });

  it("un correo sin asesor se baja un CSV vacío", async () => {
    filtroFalso.valor = { modo: "ninguno", motivo: "x" };
    const csv = await exportLeadsCsv(env);
    expect(csv).not.toContain("Cliente");
    expect(csv.trim()).toBe("fecha,nombre,contacto,intent,status,notas,metadata");
  });
});
