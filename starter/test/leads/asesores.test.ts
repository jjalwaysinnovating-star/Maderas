/**
 * Reparto de leads entre dos asesores del MISMO negocio, compartiendo un solo
 * bot (una licencia, un Worker, una base de datos).
 *
 * Lo que se prueba aquí no es cosmético: si el filtro falla, un asesor ve —o
 * borra— los prospectos del otro. Por eso se cubren los tres caminos que
 * importan: la lista, el CSV y las rutas que modifican (estado y borrar).
 *
 * El reparto vive en member/asesores.local.ts a propósito, para que
 * `forjabot update` no se lo lleve.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import { LeadsRepo } from "../../src/db/leads";
import {
  type Asesor,
  asesorDeCuenta,
  asesorDeEmail,
  asesorDeConversacion,
  filtroDeLeads,
  hayVariosAsesores,
  puedeTocarLead,
  ASESORES,
  ASESOR_POR_DEFECTO,
} from "../../member/asesores.local";

// Roster de prueba. Las funciones aceptan la lista por parámetro justo para
// esto: probar el caso de DOS asesores sin tener que tocar la configuración
// real del bot, que hoy solo tiene uno.
const ANA: Asesor = {
  slug: "ana",
  nombre: "Ana",
  telegramChatId: "111",
  emails: ["ana@ejemplo.com"],
  cuentasZernio: ["fb-ana", "ig-ana"],
};
const BETO: Asesor = {
  slug: "beto",
  nombre: "Beto",
  telegramChatId: "222",
  emails: ["Beto@Ejemplo.com "], // con mayúsculas y espacio a propósito
  cuentasZernio: ["fb-beto"],
};
const DOS = [ANA, BETO];

describe("de quién es cada cuenta y cada correo", () => {
  it("traduce la cuenta de Zernio al asesor dueño", () => {
    expect(asesorDeCuenta("ig-ana", DOS)?.slug).toBe("ana");
    expect(asesorDeCuenta("fb-beto", DOS)?.slug).toBe("beto");
    expect(asesorDeCuenta("cuenta-de-nadie", DOS)).toBeNull();
    expect(asesorDeCuenta(null, DOS)).toBeNull();
  });

  it("el correo del panel no distingue mayúsculas ni espacios", () => {
    // Lo teclea una persona al aceptar la invitación: si el reparto dependiera
    // de que lo escriba idéntico, fallaría el primer día.
    expect(asesorDeEmail("beto@ejemplo.com", DOS)?.slug).toBe("beto");
    expect(asesorDeEmail("  BETO@EJEMPLO.COM  ", DOS)?.slug).toBe("beto");
    expect(asesorDeEmail("otro@ejemplo.com", DOS)).toBeNull();
    expect(asesorDeEmail("", DOS)).toBeNull();
  });
});

describe("qué ve cada quien en el panel", () => {
  it("con un solo asesor no filtra nada", () => {
    // Es el estado de hoy: mientras el segundo asesor no exista, el panel se
    // comporta exactamente igual que antes de que esto existiera.
    expect(hayVariosAsesores([ANA])).toBe(false);
    expect(filtroDeLeads({ PANEL_EMAIL: "quien@sea.com" }, [ANA], "ana")).toEqual({ modo: "todo" });
  });

  it("la contraseña maestra siempre ve todo", () => {
    expect(filtroDeLeads({ PANEL_ROLE: "master" }, DOS, "ana")).toEqual({ modo: "todo" });
  });

  it("cada asesor ve solo lo suyo", () => {
    expect(filtroDeLeads({ PANEL_EMAIL: "ana@ejemplo.com" }, DOS, "ana")).toEqual({
      modo: "asesor",
      slug: "ana",
      nombre: "Ana",
      esPorDefecto: true,
    });
    expect(filtroDeLeads({ PANEL_EMAIL: "beto@ejemplo.com" }, DOS, "ana")).toMatchObject({
      modo: "asesor",
      slug: "beto",
      esPorDefecto: false,
    });
  });

  it("un correo que no está en la lista no ve NADA, y se le dice por qué", () => {
    // Falla ruidoso a propósito. Enseñarle todo a un correo desconocido
    // convertiría un dedazo al capturarlo en una fuga silenciosa de los
    // prospectos del otro asesor.
    const f = filtroDeLeads({ PANEL_EMAIL: "intruso@ejemplo.com" }, DOS, "ana");
    expect(f.modo).toBe("ninguno");
    if (f.modo === "ninguno") expect(f.motivo).toMatch(/no está asignado/i);
  });
});

describe("quién puede cambiar el estado o borrar", () => {
  const deAna = filtroDeLeads({ PANEL_EMAIL: "ana@ejemplo.com" }, DOS, "ana");
  const deBeto = filtroDeLeads({ PANEL_EMAIL: "beto@ejemplo.com" }, DOS, "ana");

  it("nadie toca los leads del otro", () => {
    expect(puedeTocarLead(deAna, "beto")).toBe(false);
    expect(puedeTocarLead(deBeto, "ana")).toBe(false);
    expect(puedeTocarLead(deAna, "ana")).toBe(true);
  });

  it("los leads sin dueño son del asesor por defecto", () => {
    // Los de antes del reparto y los del sitio web, que no traen cuenta de
    // Zernio. Si no fueran de nadie, quedarían invisibles para todos.
    expect(puedeTocarLead(deAna, null)).toBe(true);
    expect(puedeTocarLead(deBeto, null)).toBe(false);
  });

  it("un correo sin asesor no toca nada", () => {
    const nadie = filtroDeLeads({ PANEL_EMAIL: "intruso@ejemplo.com" }, DOS, "ana");
    expect(puedeTocarLead(nadie, "ana")).toBe(false);
    expect(puedeTocarLead(nadie, null)).toBe(false);
  });

  it("la maestra sí", () => {
    expect(puedeTocarLead({ modo: "todo" }, "beto")).toBe(true);
  });
});

describe("la consulta de la base filtra de verdad", () => {
  let env: any;
  let repo: LeadsRepo;

  beforeEach(async () => {
    const mf = await createTestMiniflare();
    env = { DB: await mf.getD1Database("DB") };
    repo = new LeadsRepo(new Db(env.DB));
    await repo.create({ conversationId: null, channelUserId: null, intent: "de Ana", metadata: { asesor: "ana" } });
    await repo.create({ conversationId: null, channelUserId: null, intent: "de Beto", metadata: { asesor: "beto" } });
    await repo.create({ conversationId: null, channelUserId: null, intent: "viejo, sin dueño", metadata: { prioridad: "caliente" } });
  });

  it("el asesor por defecto también se lleva los que no tienen dueño", () => {
    return repo.list(50, undefined, { slug: "ana", esPorDefecto: true }).then((l) => {
      expect(l.map((x) => x.intent).sort()).toEqual(["de Ana", "viejo, sin dueño"]);
    });
  });

  it("el otro asesor SOLO ve los suyos", async () => {
    const l = await repo.list(50, undefined, { slug: "beto", esPorDefecto: false });
    expect(l.map((x) => x.intent)).toEqual(["de Beto"]);
  });

  it("sin filtro salen los tres", async () => {
    expect((await repo.list(50)).length).toBe(3);
  });

  it("el filtro convive con el de estado", async () => {
    const todos = await repo.list(50);
    await repo.setStatus(todos.find((l) => l.intent === "de Beto")!.id, "sold");
    const vendidosDeBeto = await repo.list(50, "sold", { slug: "beto", esPorDefecto: false });
    expect(vendidosDeBeto.map((x) => x.intent)).toEqual(["de Beto"]);
    const vendidosDeAna = await repo.list(50, "sold", { slug: "ana", esPorDefecto: true });
    expect(vendidosDeAna).toEqual([]);
  });
});

describe("de quién es una conversación", () => {
  let env: any;

  beforeEach(async () => {
    const mf = await createTestMiniflare();
    env = { DB: await mf.getD1Database("DB") };
    const db = new Db(env.DB);
    await db.run(
      `CREATE TABLE IF NOT EXISTS zernio_ctx (
         channel_user_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL,
         account_id TEXT NOT NULL, platform TEXT, updated_at INTEGER NOT NULL)`,
    );
    await db.run(
      "INSERT INTO zernio_ctx VALUES ('u1','conv-real','6a91166377555aae013db017','instagram',?)",
      [Date.now()],
    );
  });

  it("saca el asesor de la cuenta de Zernio guardada", async () => {
    // Usa el roster REAL: la cuenta de Instagram del bot es de él.
    const a = await asesorDeConversacion(env, "conv-real");
    expect(a?.slug).toBe(ASESOR_POR_DEFECTO);
  });

  it("una conversación sin contexto de Zernio cae en el asesor por defecto", async () => {
    // Web, formulario del sitio, Telegram y WhatsApp no traen accountId.
    expect((await asesorDeConversacion(env, "conv-que-no-existe"))?.slug).toBe(ASESOR_POR_DEFECTO);
    expect((await asesorDeConversacion(env, null))?.slug).toBe(ASESOR_POR_DEFECTO);
  });

  it("si la tabla no existe NO revienta — cae en el por defecto", async () => {
    const mf = await createTestMiniflare();
    const vacio: any = { DB: await mf.getD1Database("DB") };
    expect((await asesorDeConversacion(vacio, "conv-1"))?.slug).toBe(ASESOR_POR_DEFECTO);
  });
});

describe("la configuración real del bot", () => {
  it("el asesor por defecto existe en la lista", () => {
    // Un slug mal escrito dejaría a los leads del sitio web sin dueño.
    expect(ASESORES.some((a) => a.slug === ASESOR_POR_DEFECTO)).toBe(true);
  });

  it("ningún slug ni cuenta de Zernio se repite", () => {
    const slugs = ASESORES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const cuentas = ASESORES.flatMap((a) => a.cuentasZernio);
    expect(new Set(cuentas).size).toBe(cuentas.length);
  });
});
