/**
 * Cuando un asesor contesta a mano, el bot se hace a un lado.
 *
 * Con dos asesores atendiendo de verdad, el riesgo deja de ser teórico: Paula
 * contesta desde la bandeja de Zernio, el cliente responde, y el bot le
 * contesta encima. Dos voces al mismo cliente — el mismo lío que causó ManyChat
 * en agosto, y que costó días encontrar.
 *
 * Lo que decide es `message.sentVia`, y el caso peligroso NO es el que falta:
 * es pausar de más. Si el bot se pausara con su propio eco (`api`), se apagaría
 * solo después de cada respuesta y el cliente se quedaría hablando con nadie.
 * Por eso la mitad de estas pruebas comprueban lo que NO debe pausar.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import { zernioOwnerTakeover } from "../../src/channels/zernio";
import { ConversationsRepo } from "../../src/db/conversations";

let env: any;
let db: Db;

const USUARIO = "28808479245454320";
const CONV_ZERNIO = "6a9f84c877555aae01efddfa"; // el id que usa Zernio
const CONV_NUESTRA = `zernio:${USUARIO}`;

/** Deja la fila de contexto tal como la escribe el adapter al recibir. */
async function siembraCtx() {
  await db.run(
    `CREATE TABLE IF NOT EXISTS zernio_ctx (
       channel_user_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL,
       account_id TEXT NOT NULL, platform TEXT, updated_at INTEGER NOT NULL)`,
  );
  await db.run(
    `INSERT OR REPLACE INTO zernio_ctx (channel_user_id, conversation_id, account_id, platform, updated_at)
     VALUES (?, ?, 'cuenta-de-paula', 'facebook', ?)`,
    [USUARIO, CONV_ZERNIO, Date.now()],
  );
  const ahora = Date.now();
  await db.run(
    `INSERT OR REPLACE INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
     VALUES (?, 'zernio', ?, ?, ?)`,
    [CONV_NUESTRA, USUARIO, ahora, ahora],
  );
}

const evento = (sentVia: string | null, event = "message.sent") => ({
  event,
  message: { conversationId: CONV_ZERNIO, direction: "outgoing", sentVia },
});

async function estaPausada(): Promise<boolean> {
  return await new ConversationsRepo(db).isPaused(CONV_NUESTRA);
}

beforeEach(async () => {
  const mf = await createTestMiniflare();
  env = { DB: await mf.getD1Database("DB") };
  db = new Db(env.DB);
  await siembraCtx();
});

afterEach(() => vi.restoreAllMocks());

describe("un asesor toma la conversación", () => {
  it("escribir a mano en Zernio pausa el bot", async () => {
    expect(await estaPausada()).toBe(false);

    expect(await zernioOwnerTakeover(evento("human"), env)).toBe(true);

    expect(await estaPausada()).toBe(true);
  });
});

describe("lo que NO debe pausar", () => {
  it("el propio bot contestando (api) no se pausa a sí mismo", async () => {
    // El fallo más caro posible: el bot contesta, oye su propio eco, se apaga.
    // El cliente se queda hablando solo y nadie se entera.
    expect(await zernioOwnerTakeover(evento("api"), env)).toBe(false);
    expect(await estaPausada()).toBe(false);
  });

  it("las automatizaciones de Zernio tampoco", async () => {
    for (const via of ["broadcast", "sequence", "workflow", "comment_automation", "bulk-api"]) {
      expect(await zernioOwnerTakeover(evento(via), env)).toBe(false);
    }
    expect(await estaPausada()).toBe(false);
  });

  it("sentVia desconocido (null) NO pausa", async () => {
    // La documentación de Zernio es explícita: null significa "no se sabe",
    // NUNCA "lo mandó una persona". Pasa con envíos desde la app de Facebook y
    // con mensajes viejos. Pausar aquí apagaría el bot por ecos y backfills.
    expect(await zernioOwnerTakeover(evento(null), env)).toBe(false);
    expect(await zernioOwnerTakeover({ event: "message.sent", message: {} }, env)).toBe(false);
    expect(await estaPausada()).toBe(false);
  });

  it("un mensaje ENTRANTE del cliente no pausa nada", async () => {
    expect(await zernioOwnerTakeover(evento("human", "message.received"), env)).toBe(false);
    expect(await estaPausada()).toBe(false);
  });

  it("otros eventos del ciclo de vida se ignoran", async () => {
    for (const ev of ["message.delivered", "message.read", "conversation.started"]) {
      expect(await zernioOwnerTakeover(evento("human", ev), env)).toBe(false);
    }
    expect(await estaPausada()).toBe(false);
  });
});

describe("no tumba el webhook", () => {
  it("un hilo que nunca pasó por el bot no truena", async () => {
    const otro = { event: "message.sent", message: { conversationId: "jamas-visto", sentVia: "human" } };
    expect(await zernioOwnerTakeover(otro, env)).toBe(false);
  });

  it("si la base falla, devuelve false en vez de lanzar", async () => {
    // Zernio reintenta el evento si no le contestamos 200. Una excepción aquí
    // convertiría un fallo de base en un bucle de reintentos.
    const errores: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) =>
      errores.push(a.map(String).join(" ")),
    );
    const roto = { DB: { prepare() { throw new Error("base caída"); } } } as any;

    await expect(zernioOwnerTakeover(evento("human"), roto)).resolves.toBe(false);
    expect(errores.some((e) => e.includes("[zernio] takeover"))).toBe(true);
  });

  it("una basura cualquiera no truena", async () => {
    for (const x of [null, undefined, {}, "texto", 42, []]) {
      await expect(zernioOwnerTakeover(x, env)).resolves.toBe(false);
    }
  });
});
