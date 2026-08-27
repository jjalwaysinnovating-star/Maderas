/**
 * El aviso del lead caliente llega, y llega igual venga de donde venga.
 *
 * Es el eslabón que sostiene todo: si el aviso se pierde, el lead se muere en el
 * panel y el dueño se entera cuando el cliente ya no contesta. Se prueba que
 *   • un lead CALIENTE dispara el mensaje a Telegram,
 *   • un tibio y un frío NO lo disparan (avisar de todos entrena a ignorarlos),
 *   • el canal no cambia nada — la tool no sabe ni le importa si viene de la
 *     página o de Messenger,
 *   • un fallo de Telegram no tumba la conversación ni pierde el lead.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestMiniflare } from "./helpers/miniflareSetup";
import { Db } from "../src/db/client";
import { LeadsRepo, leadMetadata } from "../src/db/leads";
import { memberTools } from "../member/tools.local";

let env: any;
let llamadas: { url: string; body: any }[];

const telegram = () => llamadas.filter((l) => l.url.includes("api.telegram.org"));

beforeEach(async () => {
  const mf = await createTestMiniflare();
  llamadas = [];
  env = {
    DB: await mf.getD1Database("DB"),
    BUSINESS_NAME: "Ciudad Maderas — Terrenos Premium",
    DASHBOARD_BASE_URL: "https://ciudad-maderas.jjalwaysinnovating.workers.dev",
    TELEGRAM_BOT_TOKEN: "token-de-prueba",
    OWNER_TELEGRAM_CHAT_ID: "12345",
  };
  vi.stubGlobal("fetch", async (url: any, init: any) => {
    llamadas.push({ url: String(url), body: JSON.parse(init?.body ?? "{}") });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
});

afterEach(() => vi.unstubAllGlobals());

/** Corre calificarLead como lo correría el agente, en el canal que sea. */
async function califica(
  datos: any,
  conversationId = "conv-web-1",
  canal: "web" | "zernio" = "web",
) {
  // `leads.conversation_id` tiene llave foránea: la conversación va primero,
  // igual que en producción (la crea el pipeline antes de llamar a la tool).
  const ahora = Date.now();
  await new Db(env.DB).run(
    `INSERT OR IGNORE INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, canal, `usuario-${conversationId}`, ahora, ahora],
  );
  const tools = memberTools({ env, getConversationId: () => conversationId }) as any;
  return tools.calificarLead.execute(datos, {} as any);
}

const CALIENTE = {
  plazo: "inmediato",
  formaPago: "contado",
  uso: "inversion",
  nombre: "Sofía",
  contacto: "6869998877",
  ciudad: "Mérida",
};

describe("lead caliente", () => {
  it("manda el aviso a Telegram con los datos que el asesor necesita", async () => {
    await califica(CALIENTE);

    expect(telegram()).toHaveLength(1);
    const texto = telegram()[0].body.text as string;
    expect(texto).toContain("Lead caliente");
    expect(texto).toContain("Sofía");
    expect(texto).toContain("6869998877");
    expect(texto).toContain("Mérida");
    expect(texto).toContain("/admin/leads");
    expect(telegram()[0].body.chat_id).toBe("12345");
  });

  it("además queda guardado en el panel", async () => {
    await califica(CALIENTE);

    const leads = await new LeadsRepo(new Db(env.DB)).list(10);
    expect(leads).toHaveLength(1);
    expect(leadMetadata(leads[0]).prioridad).toBe("caliente");
    expect(leads[0].intent).toContain("Mérida");
  });

  it("el aviso sale igual desde la página que desde Messenger", async () => {
    // La tool solo recibe env y el id de conversación: no sabe por qué canal
    // entró el cliente, así que no puede comportarse distinto. Esta prueba
    // fija ese hecho para que nadie meta una rama por canal sin darse cuenta.
    await califica(CALIENTE, "conv-web-1", "web");
    const desdeLaPagina = telegram()[0].body.text;

    llamadas = [];
    await califica(CALIENTE, "conv-messenger-1", "zernio");
    const desdeMessenger = telegram()[0].body.text;

    expect(telegram()).toHaveLength(1);
    expect(desdeMessenger).toBe(desdeLaPagina);
  });
});

describe("tibio y frío no interrumpen", () => {
  it("un tibio se guarda sin avisar", async () => {
    const r = await califica({ plazo: "medio_plazo", formaPago: "no_definido", nombre: "Ana" });

    expect(r.prioridad).toContain("Tibio");
    expect(telegram()).toHaveLength(0);
    expect(await new LeadsRepo(new Db(env.DB)).list(10)).toHaveLength(1);
  });

  it("un frío se guarda sin avisar", async () => {
    const r = await califica({ plazo: "cotizando", formaPago: "contado", nombre: "Beto" });

    expect(r.prioridad).toContain("Frío");
    expect(telegram()).toHaveLength(0);
    expect(await new LeadsRepo(new Db(env.DB)).list(10)).toHaveLength(1);
  });
});

describe("cuando Telegram falla", () => {
  it("el lead NO se pierde y la conversación sigue", async () => {
    vi.stubGlobal("fetch", async () => new Response("chat not found", { status: 400 }));

    const r = await califica(CALIENTE);

    // El lead ya estaba guardado antes de intentar el aviso.
    expect(r.registrado).toBe(true);
    const leads = await new LeadsRepo(new Db(env.DB)).list(10);
    expect(leads).toHaveLength(1);
    expect(leadMetadata(leads[0]).prioridad).toBe("caliente");
  });

  it("un rechazo con HTTP 200 tampoco pasa desapercibido", async () => {
    // Telegram contesta 200 con {ok:false} cuando el chat_id está mal o el bot
    // fue bloqueado. Sin mirar el cuerpo, un aviso perdido se ve idéntico a uno
    // entregado — que es como se perdían antes.
    const errores: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) =>
      errores.push(a.map(String).join(" ")),
    );
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify({ ok: false, description: "chat not found" }), { status: 200 }),
    );

    await califica(CALIENTE);

    expect(errores.some((e) => e.includes("telegram rechazó"))).toBe(true);
  });

  it("un aviso entregado deja rastro en el log", async () => {
    // Sin esta línea, "no hay errores" era la única señal — y no distingue
    // entregado de nunca intentado.
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a: unknown[]) =>
      logs.push(a.map(String).join(" ")),
    );

    await califica(CALIENTE);

    expect(logs.some((l) => l.includes("[messageOwner] telegram entregado"))).toBe(true);
  });
});
