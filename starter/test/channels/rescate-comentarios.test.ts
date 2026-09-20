/**
 * El embudo de comentarios, cuando Zernio se calla.
 *
 * Zernio manda UN SOLO DM por persona y por automatización, para siempre. La
 * segunda vez que alguien comenta —otra publicación, semanas después— anota
 * `skipped: "Already sent DM to this commenter"` y no sale nada: ni privado ni
 * respuesta pública. Eso es lo que el dueño vio el 2026-09-20 y lo que cubre
 * `rescataComentario`.
 *
 * El caso peligroso NO es el que falta: es mandar de más. Un privado duplicado
 * es el lío de ManyChat otra vez, y un DM de venta a quien escribió "fraude"
 * es peor todavía. Por eso la mitad de estas pruebas comprueban lo que NO debe
 * salir.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { rescataComentario, comentarioCalifica } from "../../src/channels/rescate-comentarios";

let env: any;

const CUENTA = "6a8e644777555aae018b7c37";
const POST = "122114282907439686";
const COMENTARIO = "122114282907439686_4420567091607119";
const PERSONA = "27578410035174752";

const AUTOMATIZACION = {
  id: "6a92f9769470b63456aa16c3",
  accountId: CUENTA,
  isActive: true,
  trigger: "comment",
  keywords: [] as string[],
  matchMode: "contains",
  excludeKeywords: ["estafa", "fraude", "denuncia", "pésimo"],
  dmMessage: "¡Hola! Gracias por comentar 🙌 ¿Qué ciudad te interesa?",
  commentReply: "¡Gracias por comentar! Te mandé la info por mensaje 📩",
};

function evento(extra: Record<string, any> = {}) {
  return {
    event: "comment.received",
    account: { accountId: CUENTA },
    comment: {
      id: COMENTARIO,
      platformPostId: POST,
      platform: "facebook",
      text: "Info",
      author: { id: PERSONA, name: "JJ PS" },
      isReply: false,
      ...extra,
    },
  };
}

/** Deja `fetch` contestando lo que Zernio contestaría, y anota cada llamada. */
function fingeZernio(opciones: { privado?: { ok: boolean; body?: any; status?: number } } = {}) {
  const llamadas: Llamada[] = [];
  const priv = opciones.privado ?? { ok: true };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: any, init: any = {}) => {
      const u = String(url);
      llamadas.push({
        url: u,
        method: init.method ?? "GET",
        body: init.body ? JSON.parse(init.body) : undefined,
      });
      if (u.includes("/comment-automations")) {
        return new Response(JSON.stringify({ automations: [AUTOMATIZACION] }), { status: 200 });
      }
      if (u.includes("/private-reply")) {
        return priv.ok
          ? new Response(JSON.stringify({ status: "success" }), { status: 200 })
          : new Response(JSON.stringify(priv.body ?? {}), { status: priv.status ?? 400 });
      }
      return new Response(JSON.stringify({ status: "success" }), { status: 200 });
    }),
  );
  return llamadas;
}

type Llamada = { url: string; method: string; body: any };
const privados = (l: Llamada[]) => l.filter((x) => x.url.includes("/private-reply"));
const publicas = (l: Llamada[]) =>
  l.filter((x) => x.method === "POST" && /\/inbox\/comments\/[^/]+$/.test(x.url));

beforeEach(async () => {
  const mf = await createTestMiniflare();
  env = { DB: await mf.getD1Database("DB"), ZERNIO_API_KEY: "clave-de-prueba" };
});
afterEach(() => vi.unstubAllGlobals());

describe("rescataComentario — cubre lo que Zernio se saltó", () => {
  it("manda el privado cuando Zernio no lo mandó", async () => {
    const l = fingeZernio();
    const hizo = await rescataComentario(evento(), env, { esperaMs: 0 });
    expect(hizo).toBe(true);
    expect(privados(l)).toHaveLength(1);
    expect(privados(l)[0].body.message).toBe(AUTOMATIZACION.dmMessage);
    expect(privados(l)[0].body.accountId).toBe(CUENTA);
  });

  it("contesta también en público, para que la publicación no quede muda", async () => {
    const l = fingeZernio();
    await rescataComentario(evento(), env, { esperaMs: 0 });
    expect(publicas(l)).toHaveLength(1);
    expect(publicas(l)[0].body.message).toBe(AUTOMATIZACION.commentReply);
  });

  it("usa el texto de la automatización, no una copia propia", async () => {
    const l = fingeZernio();
    await rescataComentario(evento(), env, { esperaMs: 0 });
    // Si algún día el dueño cambia el guion en el panel de Zernio, sale el suyo.
    expect(privados(l)[0].body.message).not.toMatch(/terrenos premium en 8 estados/i);
    expect(privados(l)[0].body.message).toBe(AUTOMATIZACION.dmMessage);
  });
});

describe("rescataComentario — lo que NO debe mandar", () => {
  it("se calla si Zernio ya había mandado el privado (Meta lo dice)", async () => {
    const l = fingeZernio({
      privado: {
        ok: false,
        status: 400,
        body: { error: "already used", details: { privateReplyConsumed: true } },
      },
    });
    const hizo = await rescataComentario(evento(), env, { esperaMs: 0 });
    expect(hizo).toBe(false);
    expect(publicas(l)).toHaveLength(0); // ni pública: la puso Zernio
  });

  it("NUNCA le manda guion de venta a un reclamo", async () => {
    for (const texto of ["Esto es un fraude", "ES UNA ESTAFA", "voy a poner una denuncia", "pesimo servicio"]) {
      const l = fingeZernio();
      const hizo = await rescataComentario(evento({ text: texto }), env, { esperaMs: 0 });
      expect(hizo, texto).toBe(false);
      expect(privados(l), texto).toHaveLength(0);
      vi.unstubAllGlobals();
    }
  });

  it("no le escribe dos veces a quien comentó dos veces seguidas", async () => {
    // El 2026-09-20 alguien comentó "Infi" y se corrigió con "Info" 3 s después.
    const l1 = fingeZernio();
    expect(await rescataComentario(evento({ text: "Infi" }), env, { esperaMs: 0 })).toBe(true);
    expect(privados(l1)).toHaveLength(1);
    vi.unstubAllGlobals();
    const l2 = fingeZernio();
    const otro = evento({ text: "Info", id: `${POST}_2054996635126448` });
    expect(await rescataComentario(otro, env, { esperaMs: 0 })).toBe(false);
    expect(privados(l2)).toHaveLength(0);
  });

  it("no se contesta a sí mismo (nuestras respuestas vuelven como comentarios)", async () => {
    const l = fingeZernio();
    const hizo = await rescataComentario(
      evento({ author: { id: PERSONA, isOwnAccount: true } }),
      env,
      { esperaMs: 0 },
    );
    expect(hizo).toBe(false);
    expect(l).toHaveLength(0);
  });

  it("no rescata respuestas dentro de un hilo", async () => {
    const l = fingeZernio();
    expect(await rescataComentario(evento({ isReply: true }), env, { esperaMs: 0 })).toBe(false);
    expect(l).toHaveLength(0);
  });

  it("ignora plataformas donde la respuesta privada no existe", async () => {
    const l = fingeZernio();
    expect(await rescataComentario(evento({ platform: "tiktok" }), env, { esperaMs: 0 })).toBe(false);
    expect(l).toHaveLength(0);
  });

  it("no hace nada con otros eventos", async () => {
    const l = fingeZernio();
    expect(await rescataComentario({ event: "message.received" }, env, { esperaMs: 0 })).toBe(false);
    expect(l).toHaveLength(0);
  });

  it("se calla si esa cuenta no tiene embudo configurado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ automations: [] }), { status: 200 })),
    );
    expect(await rescataComentario(evento(), env, { esperaMs: 0 })).toBe(false);
  });

  it("nunca lanza, aunque Zernio se caiga (o Zernio reintentaría en bucle)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("red caída"); }));
    await expect(rescataComentario(evento(), env, { esperaMs: 0 })).resolves.toBe(false);
  });
});

describe("comentarioCalifica", () => {
  it("con keywords vacías, cualquier comentario cuenta — lo pidió así el dueño", () => {
    expect(comentarioCalifica("🔥", AUTOMATIZACION)).toBe(true);
    expect(comentarioCalifica("me interesa", AUTOMATIZACION)).toBe(true);
  });

  it("las exclusiones vetan aunque no lleven acentos", () => {
    expect(comentarioCalifica("pesimo", AUTOMATIZACION)).toBe(false);
    expect(comentarioCalifica("PÉSIMO servicio", AUTOMATIZACION)).toBe(false);
  });

  it("respeta las palabras clave cuando las hay", () => {
    const con = { ...AUTOMATIZACION, keywords: ["info", "precio"] };
    expect(comentarioCalifica("mándame info", con)).toBe(true);
    expect(comentarioCalifica("qué bonito", con)).toBe(false);
  });
});
