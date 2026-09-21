/**
 * El vigía — que se revise solo, arregle lo que pueda y avise lo que no.
 *
 * Aquí el caso peligroso son DOS, y tiran para lados opuestos:
 *
 *  · **Callarse cuando algo está roto** es lo que ya pasó cuatro veces en este
 *    bot. Es el fallo que justifica que el vigía exista.
 *  · **Hablar cuando todo está bien** lo destruye igual de rápido: un aviso
 *    diario que nunca trae nada nuevo deja de leerse, y el día que sí traiga
 *    algo tampoco se va a leer.
 *
 * Por eso la mitad de estas pruebas comprueban el silencio.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import {
  revisaWebhooks,
  revisaCuentas,
  revisaEmbudos,
  detectaSilencio,
  filtraPorEnfriamiento,
  pruebaDeVidaCerebro,
  EVENTOS_NECESARIOS,
  DIAS_AVISO_VENCIMIENTO,
  VENTANA_SILENCIO_MS,
  MARGEN_BUFFER_MS,
  ENFRIAMIENTO_AVISO_MS,
} from "../../src/vigia";

let env: any;
let db: Db;

const AHORA = Date.UTC(2026, 8, 21, 12, 0, 0); // lunes 21 sep 2026
const WEBHOOK_OK = {
  _id: "wh1",
  url: "https://ciudad-maderas.jjalwaysinnovating.workers.dev/webhooks/zernio",
  events: [...EVENTOS_NECESARIOS],
  isActive: true,
  failureCount: 0,
};

/** fetch falso: devuelve lo que se le diga por ruta y anota los PUT/PATCH. */
function fingeZernio(rutas: Record<string, any>) {
  const escrituras: { url: string; method: string; body: any }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: any, init: any = {}) => {
      const u = String(url);
      const method = init.method ?? "GET";
      if (method !== "GET") escrituras.push({ url: u, method, body: JSON.parse(init.body ?? "{}") });
      for (const [frag, resp] of Object.entries(rutas)) {
        if (u.includes(frag)) {
          const r = resp as any;
          return new Response(JSON.stringify(r.body ?? r), { status: r.status ?? 200 });
        }
      }
      return new Response("{}", { status: 200 });
    }),
  );
  return escrituras;
}

async function siembraMensajes(
  filas: { rol: "user" | "assistant"; hace: number; pausada?: boolean }[],
) {
  let i = 0;
  for (const f of filas) {
    const conv = f.pausada ? "conv-pausada" : "conv-normal";
    await db.run(
      `INSERT OR IGNORE INTO conversations (id, channel, channel_user_id, started_at, last_message_at, paused_until)
       VALUES (?, 'zernio', ?, ?, ?, ?)`,
      [conv, conv, AHORA - 86_400_000, AHORA, f.pausada ? AHORA + 3_600_000 : null],
    );
    await db.run(
      `INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, 'x', ?)`,
      [`m${i++}`, conv, f.rol, AHORA - f.hace],
    );
  }
}

beforeEach(async () => {
  const mf = await createTestMiniflare();
  env = {
    DB: await mf.getD1Database("DB"),
    ZERNIO_API_KEY: "clave",
    ANTHROPIC_API_KEY: "sk-prueba",
  };
  db = new Db(env.DB);
});
afterEach(() => vi.unstubAllGlobals());

describe("webhooks — arregla lo que puede", () => {
  it("repone los eventos que falten (el fallo que duró 12 días)", async () => {
    const esc = fingeZernio({
      "/webhooks/settings": { webhooks: [{ ...WEBHOOK_OK, events: ["message.received"] }] },
    });
    const h = await revisaWebhooks(env, "el dueño", "k");
    expect(h).toHaveLength(1);
    expect(h[0].nivel).toBe("arreglado");
    const put = esc.find((e) => e.method === "PUT");
    expect(put).toBeDefined();
    for (const ev of EVENTOS_NECESARIOS) expect(put!.body.events).toContain(ev);
  });

  it("vuelve a encender un webhook apagado", async () => {
    const esc = fingeZernio({
      "/webhooks/settings": { webhooks: [{ ...WEBHOOK_OK, isActive: false }] },
    });
    const h = await revisaWebhooks(env, "el dueño", "k");
    expect(h[0].nivel).toBe("arreglado");
    expect(esc.find((e) => e.method === "PUT")!.body.isActive).toBe(true);
  });

  it("no toca nada cuando ya está completo", async () => {
    const esc = fingeZernio({ "/webhooks/settings": { webhooks: [WEBHOOK_OK] } });
    expect(await revisaWebhooks(env, "el dueño", "k")).toHaveLength(0);
    expect(esc).toHaveLength(0);
  });

  it("avisa (no arregla) si no hay webhook apuntando al bot", async () => {
    fingeZernio({ "/webhooks/settings": { webhooks: [{ ...WEBHOOK_OK, url: "https://otro.com/x" }] } });
    const h = await revisaWebhooks(env, "el dueño", "k");
    expect(h[0].nivel).toBe("alerta");
    expect(h[0].texto).toMatch(/NO tiene webhook/);
  });

  it("avisa si Zernio acumula entregas fallidas", async () => {
    fingeZernio({ "/webhooks/settings": { webhooks: [{ ...WEBHOOK_OK, failureCount: 7 }] } });
    const h = await revisaWebhooks(env, "el dueño", "k");
    expect(h.some((x) => x.nivel === "alerta" && /7 entregas fallidas/.test(x.texto))).toBe(true);
  });
});

describe("cuentas — avisa antes de que venza el permiso de Meta", () => {
  const cuenta = (extra: any) => ({
    accounts: [{ _id: "c1", platform: "facebook", displayName: "Ciudad Maderas", isActive: true, needsReconnection: false, ...extra }],
  });

  it("avisa cuando faltan pocos días", async () => {
    const vence = new Date(AHORA + 10 * 86_400_000).toISOString();
    fingeZernio({ "/accounts": cuenta({ tokenExpiresAt: vence }) });
    const { hallazgos } = await revisaCuentas(env, "el dueño", "k", AHORA);
    expect(hallazgos[0].texto).toMatch(/vence en 10 día/);
  });

  it("se calla si todavía falta mucho", async () => {
    const vence = new Date(AHORA + (DIAS_AVISO_VENCIMIENTO + 20) * 86_400_000).toISOString();
    fingeZernio({ "/accounts": cuenta({ tokenExpiresAt: vence }) });
    const { hallazgos } = await revisaCuentas(env, "el dueño", "k", AHORA);
    expect(hallazgos).toHaveLength(0);
  });

  it("grita si ya venció", async () => {
    const vencio = new Date(AHORA - 3 * 86_400_000).toISOString();
    fingeZernio({ "/accounts": cuenta({ tokenExpiresAt: vencio }) });
    const { hallazgos } = await revisaCuentas(env, "el dueño", "k", AHORA);
    expect(hallazgos[0].texto).toMatch(/VENCIÓ hace 3 día/);
  });

  it("avisa de una cuenta desconectada", async () => {
    fingeZernio({ "/accounts": cuenta({ needsReconnection: true }) });
    const { hallazgos } = await revisaCuentas(env, "el dueño", "k", AHORA);
    expect(hallazgos[0].texto).toMatch(/DESCONECTADA/);
  });
});

describe("embudos de comentarios", () => {
  const cuentas = [{ _id: "c1", platform: "facebook", displayName: "Ciudad Maderas" }] as any;

  it("vuelve a encender uno apagado", async () => {
    const esc = fingeZernio({
      "/comment-automations": { automations: [{ id: "a1", accountId: "c1", isActive: false, trigger: "comment" }] },
    });
    const h = await revisaEmbudos(env, "el dueño", "k", cuentas);
    expect(h[0].nivel).toBe("arreglado");
    expect(esc.find((e) => e.method === "PATCH")!.body.isActive).toBe(true);
  });

  it("avisa si alguien lo borró (no lo inventa)", async () => {
    const esc = fingeZernio({ "/comment-automations": { automations: [] } });
    const h = await revisaEmbudos(env, "el dueño", "k", cuentas);
    expect(h[0].nivel).toBe("alerta");
    expect(esc).toHaveLength(0); // no crea nada por su cuenta
  });

  it("se calla cuando está encendido", async () => {
    fingeZernio({
      "/comment-automations": { automations: [{ id: "a1", accountId: "c1", isActive: true, trigger: "comment" }] },
    });
    expect(await revisaEmbudos(env, "el dueño", "k", cuentas)).toHaveLength(0);
  });
});

describe("detector de silencio — el que atrapa lo que no previmos", () => {
  const dentro = MARGEN_BUFFER_MS + 60_000;

  it("avisa si entraron mensajes y no salió ninguna respuesta", async () => {
    await siembraMensajes([{ rol: "user", hace: dentro }, { rol: "user", hace: dentro + 1000 }]);
    const h = await detectaSilencio(env, AHORA);
    expect(h[0].texto).toMatch(/2 mensaje\(s\).*NO contestó/);
  });

  it("se calla si el bot sí contestó", async () => {
    await siembraMensajes([{ rol: "user", hace: dentro }, { rol: "assistant", hace: dentro - 5000 }]);
    expect(await detectaSilencio(env, AHORA)).toHaveLength(0);
  });

  it("se calla si no entró nada (no hay tráfico ≠ está roto)", async () => {
    expect(await detectaSilencio(env, AHORA)).toHaveLength(0);
  });

  it("no cuenta un mensaje recién llegado: sigue en el buffer", async () => {
    await siembraMensajes([{ rol: "user", hace: 60_000 }]);
    expect(await detectaSilencio(env, AHORA)).toHaveLength(0);
  });

  it("no cuenta conversaciones PAUSADAS: ahí el silencio es correcto", async () => {
    // El asesor tomó el hilo a mano — que el bot calle es justo lo que queremos.
    await siembraMensajes([{ rol: "user", hace: dentro, pausada: true }]);
    expect(await detectaSilencio(env, AHORA)).toHaveLength(0);
  });

  it("no mira más atrás de su ventana", async () => {
    await siembraMensajes([{ rol: "user", hace: VENTANA_SILENCIO_MS + MARGEN_BUFFER_MS + 60_000 }]);
    expect(await detectaSilencio(env, AHORA)).toHaveLength(0);
  });
});

describe("prueba de vida del cerebro", () => {
  it("reconoce el saldo agotado y lo dice en cristiano", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { message: "insufficient credit balance" } }), { status: 400 })),
    );
    const h = await pruebaDeVidaCerebro(env);
    expect(h[0].texto).toMatch(/saldo de Anthropic agotado/);
  });

  it("se calla cuando el cerebro responde", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    expect(await pruebaDeVidaCerebro(env)).toHaveLength(0);
  });

  it("avisa si ni siquiera hay llave", async () => {
    const h = await pruebaDeVidaCerebro({ ...env, ANTHROPIC_API_KEY: "" });
    expect(h[0].texto).toMatch(/no puede contestar/);
  });
});

describe("enfriamiento — el mismo problema no se repite cada hora", () => {
  const problema = [{ nivel: "alerta" as const, clave: "bot-mudo", texto: "mudo" }];

  it("la primera vez pasa", async () => {
    expect(await filtraPorEnfriamiento(env, problema, AHORA)).toHaveLength(1);
  });

  it("una hora después NO se repite", async () => {
    await filtraPorEnfriamiento(env, problema, AHORA);
    expect(await filtraPorEnfriamiento(env, problema, AHORA + 3_600_000)).toHaveLength(0);
  });

  it("pasadas las 6 horas vuelve a avisar (sigue roto)", async () => {
    await filtraPorEnfriamiento(env, problema, AHORA);
    const luego = AHORA + ENFRIAMIENTO_AVISO_MS + 1000;
    expect(await filtraPorEnfriamiento(env, problema, luego)).toHaveLength(1);
  });

  it("un problema DISTINTO no se traga con el del otro", async () => {
    await filtraPorEnfriamiento(env, problema, AHORA);
    const otro = [{ nivel: "alerta" as const, clave: "cerebro-caido", texto: "otro" }];
    expect(await filtraPorEnfriamiento(env, otro, AHORA + 1000)).toHaveLength(1);
  });
});
