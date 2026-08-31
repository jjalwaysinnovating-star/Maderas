/**
 * De dónde vino cada prospecto.
 *
 * Sin esto, gastar en anuncios es adivinar: el panel no sabe si un lead llegó
 * de Instagram, del sitio o de un anuncio pagado, ni de cuál campaña.
 *
 * Se prueban las tres capas por separado porque tienen confianzas distintas:
 * el CANAL siempre se sabe; la CAMPAÑA depende de que la URL la traiga; el
 * ANUNCIO depende de un payload de Meta cuya forma exacta no está documentada
 * — de ahí que la extracción pruebe varias rutas y siempre guarde el crudo.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import {
  limpiaRef,
  refDeUrl,
  extraeAnuncio,
  guardaOrigen,
  origenDeConversacion,
  metadataDeOrigen,
} from "../../member/origen.local";

describe("la etiqueta de campaña se limpia", () => {
  it("normaliza a algo seguro y corto", () => {
    expect(limpiaRef("Bio-Instagram")).toBe("bio-instagram");
    expect(limpiaRef("  Volante QR  ")).toBe("volante-qr");
    expect(limpiaRef("a".repeat(200))?.length).toBe(60);
  });

  it("no deja pasar HTML ni comillas", () => {
    // Viene de una URL pública y acaba pintada en el panel.
    const r = limpiaRef('<script>alert("x")</script>');
    expect(r).not.toMatch(/[<>"']/);
  });

  it("vacío es null, no cadena vacía", () => {
    expect(limpiaRef("")).toBeNull();
    expect(limpiaRef("   ")).toBeNull();
    expect(limpiaRef("---")).toBeNull();
    expect(limpiaRef(null)).toBeNull();
  });
});

describe("la campaña sale de la URL", () => {
  it("lee ?ref= y los utm_", () => {
    expect(refDeUrl("https://x.com/?ref=bio-ig")).toBe("bio-ig");
    expect(refDeUrl("https://x.com/?utm_source=facebook")).toBe("facebook");
    expect(refDeUrl("https://x.com/proyectos/queretaro?utm_campaign=cancun-sep")).toBe("cancun-sep");
  });

  it("ref gana sobre utm si vienen los dos", () => {
    expect(refDeUrl("https://x.com/?utm_source=fb&ref=volante")).toBe("volante");
  });

  it("una URL sin campaña, o basura, no revienta", () => {
    expect(refDeUrl("https://x.com/")).toBeNull();
    expect(refDeUrl("no soy una url")).toBeNull();
    expect(refDeUrl(null)).toBeNull();
  });
});

describe("la atribución de un anuncio de Meta", () => {
  it("encuentra el anuncio esté donde esté en el payload", () => {
    // La forma exacta no está documentada, así que se prueban varias rutas.
    expect(extraeAnuncio({ referral: { adId: "120200" } }).adId).toBe("120200");
    expect(extraeAnuncio({ referral: { ad_id: "120201" } }).adId).toBe("120201");
    expect(extraeAnuncio({ message: { referral: { ad: { id: "120202" } } } }).adId).toBe("120202");
    expect(extraeAnuncio({ referral: { sourceId: 120203 } }).adId).toBe("120203");
  });

  it("saca también el título y el ref", () => {
    const a = extraeAnuncio({ referral: { ad: { id: "1", title: "Cancún desde $1,388" }, ref: "Anuncio-Cancun" } });
    expect(a.adTitulo).toBe("Cancún desde $1,388");
    expect(a.ref).toBe("anuncio-cancun");
  });

  it("SIEMPRE conserva el crudo, aunque no reconozca nada", () => {
    // Es lo que nos va a decir la forma verdadera en el primer anuncio real.
    const a = extraeAnuncio({ referral: { campo_que_no_conocemos: "algo" } });
    expect(a.adId).toBeNull();
    expect(a.crudo).toEqual({ campo_que_no_conocemos: "algo" });
  });

  it("un evento vacío no truena", () => {
    expect(() => extraeAnuncio(null)).not.toThrow();
    expect(extraeAnuncio({}).adId).toBeNull();
  });
});

describe("el origen viaja hasta el lead", () => {
  let env: any;

  beforeEach(async () => {
    const mf = await createTestMiniflare();
    env = { DB: await mf.getD1Database("DB") };
    const db = new Db(env.DB);
    const t = Date.now();
    await db.run(
      `CREATE TABLE IF NOT EXISTS zernio_ctx (
         channel_user_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL,
         account_id TEXT NOT NULL, platform TEXT, updated_at INTEGER NOT NULL)`,
    );
    await db.run(
      `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
       VALUES ('c-ig','zernio','u-ig',?,?), ('c-web','web','sess-1',?,?)`,
      [t, t, t, t],
    );
    await db.run("INSERT INTO zernio_ctx VALUES ('u-ig','c-ig','acct-1','instagram',?)", [t]);
  });

  it("distingue Instagram de Messenger, no solo 'zernio'", async () => {
    // El canal por sí solo dice "zernio", que no sirve para decidir dónde
    // gastar. La plataforma real vive en zernio_ctx.
    expect((await origenDeConversacion(env, "c-ig")).canal).toBe("instagram");
  });

  it("la web se reconoce sola", async () => {
    expect((await origenDeConversacion(env, "c-web")).canal).toBe("web");
  });

  it("pega el anuncio guardado con la conversación", async () => {
    await guardaOrigen(env, "u-ig", { ref: "Anuncio-Cancun", adId: "120200", adTitulo: "Cancún" });
    const o = await origenDeConversacion(env, "c-ig");
    expect(o).toMatchObject({ canal: "instagram", ref: "anuncio-cancun", ad: "120200" });
  });

  it("un segundo mensaje NO borra la campaña del primero", async () => {
    // El referral llega en el primer toque; los mensajes siguientes vienen
    // limpios. Si el vacío pisara al dato, la atribución duraría un mensaje.
    await guardaOrigen(env, "u-ig", { ref: "anuncio-cancun", adId: "120200" });
    await guardaOrigen(env, "u-ig", {});
    expect((await origenDeConversacion(env, "c-ig")).ad).toBe("120200");
  });

  it("sin conversación o sin datos NO truena ni inventa", async () => {
    expect((await origenDeConversacion(env, null)).canal).toBe("desconocido");
    expect((await origenDeConversacion(env, "no-existe")).canal).toBe("desconocido");
    const o = await origenDeConversacion(env, "c-web");
    expect(o.ad ?? null).toBeNull();
  });
});

describe("lo que acaba en la metadata del lead", () => {
  it("siempre lleva canal, y lo demás solo si existe", () => {
    expect(metadataDeOrigen({ canal: "web" })).toEqual({ canal: "web" });
    expect(metadataDeOrigen({ canal: "instagram", ref: "bio", ad: "120", adTitulo: "T" })).toEqual({
      canal: "instagram",
      campana: "bio",
      anuncio: "120",
      anuncio_titulo: "T",
    });
  });

  it("no mete claves vacías que ensucien el panel", () => {
    expect(Object.keys(metadataDeOrigen({ canal: "web", ref: null, ad: null }))).toEqual(["canal"]);
  });
});
