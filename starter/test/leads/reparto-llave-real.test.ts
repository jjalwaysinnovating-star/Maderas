/**
 * El reparto se busca por la llave que SÍ existe en `zernio_ctx`.
 *
 * El fallo real (Paula, 2026-09-08): `asesorDeConversacion` y el canal de
 * `origenDeConversacion` buscaban `zernio_ctx WHERE conversation_id = <el id
 * NUESTRO>`. Pero esa tabla tiene `channel_user_id` como PRIMARY KEY, y su
 * columna `conversation_id` guarda el id que usa ZERNIO — dos espacios de
 * nombres distintos:
 *
 *   nuestro:  conversations.id        = "zernio:28492858663659014"
 *   de Zernio: zernio_ctx.conversation_id = "6a9f506377555aae01ef0ee4"
 *
 * Nunca empataban. Y como las dos funciones caen a un valor por defecto cuando
 * no encuentran —al asesor por defecto, y al canal "zernio"—, no había error,
 * ni log, ni nada raro en el panel: simplemente TODOS los leads eran del mismo
 * asesor y ninguno decía por qué red entró.
 *
 * Las pruebas viejas no lo vieron porque escribían las dos filas con el mismo
 * id inventado. Aquí se usan los ids con la forma de producción, distintos a
 * propósito: es lo único que reproduce el fallo.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createTestMiniflare } from "../helpers/miniflareSetup";
import { Db } from "../../src/db/client";
import { asesorDeConversacion, type Asesor } from "../../member/asesores.local";
import { origenDeConversacion } from "../../member/origen.local";

let env: any;
let db: Db;

// Los ids son los que salieron de la base de producción, con su forma real.
const USUARIO = "28492858663659014";
const CONV_NUESTRA = `zernio:${USUARIO}`;
const CONV_DE_ZERNIO = "6a9f506377555aae01ef0ee4";
const CUENTA_DUENO = "6a8e644777555aae018b7c37";   // Facebook del dueño
const CUENTA_SEGUNDA = "6a9f52f177555aae01ef1b70"; // la que apareció después

const LISTA: Asesor[] = [
  { slug: "duenio", nombre: "Joswuar", emails: [], cuentasZernio: [CUENTA_DUENO] },
  { slug: "segunda", nombre: "Marisol", emails: [], cuentasZernio: [CUENTA_SEGUNDA] },
];

/** Deja la conversación y su contexto tal como los escribe producción. */
async function siembra(cuenta: string, plataforma: string, usuario = USUARIO) {
  const ahora = Date.now();
  await db.run(
    `INSERT OR REPLACE INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
     VALUES (?, 'zernio', ?, ?, ?)`,
    [`zernio:${usuario}`, usuario, ahora, ahora],
  );
  await db.run(
    `CREATE TABLE IF NOT EXISTS zernio_ctx (
       channel_user_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL,
       account_id TEXT NOT NULL, platform TEXT, updated_at INTEGER NOT NULL)`,
  );
  await db.run(
    `INSERT OR REPLACE INTO zernio_ctx (channel_user_id, conversation_id, account_id, platform, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [usuario, CONV_DE_ZERNIO, cuenta, plataforma, ahora],
  );
}

beforeEach(async () => {
  const mf = await createTestMiniflare();
  env = { DB: await mf.getD1Database("DB") };
  db = new Db(env.DB);
});

describe("de quién es el lead", () => {
  it("encuentra al asesor aunque los dos ids sean distintos", async () => {
    await siembra(CUENTA_DUENO, "facebook");

    // Antes del arreglo esto devolvía el asesor por defecto SIEMPRE.
    const a = await asesorDeConversacion(env, CONV_NUESTRA, LISTA, "duenio");
    expect(a?.slug).toBe("duenio");
  });

  it("un lead de la segunda cuenta NO cae en el dueño", async () => {
    // Este es el caso que importa, y el que se rompía: sin el arreglo los leads
    // de la otra asesora aterrizaban en la lista del dueño y su aviso sonaba en
    // el teléfono equivocado. Se veía bien desde el panel.
    await siembra(CUENTA_SEGUNDA, "facebook");

    const a = await asesorDeConversacion(env, CONV_NUESTRA, LISTA, "duenio");
    expect(a?.slug).toBe("segunda");
  });

  it("también acepta el id de Zernio, por si alguien lo pasa directo", async () => {
    await siembra(CUENTA_DUENO, "facebook");
    const a = await asesorDeConversacion(env, CONV_DE_ZERNIO, LISTA, "duenio");
    expect(a?.slug).toBe("duenio");
  });

  it("una conversación sin contexto cae en el asesor por defecto, sin tronar", async () => {
    const ahora = Date.now();
    await db.run(
      `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
       VALUES ('zernio:999','zernio','999',?,?)`,
      [ahora, ahora],
    );
    expect((await asesorDeConversacion(env, "zernio:999"))?.slug).toBe("joswuar");
  });
});

describe("por qué red entró el lead", () => {
  it("dice facebook, no 'zernio'", async () => {
    await siembra(CUENTA_DUENO, "facebook");

    const o = await origenDeConversacion(env, CONV_NUESTRA);
    expect(o.canal).toBe("facebook");
  });

  it("dice instagram cuando entró por instagram", async () => {
    await siembra(CUENTA_DUENO, "instagram");

    const o = await origenDeConversacion(env, CONV_NUESTRA);
    expect(o.canal).toBe("instagram");
  });

  it("sin contexto se queda en 'zernio' en vez de inventar", async () => {
    // "zernio" no sirve para decidir dónde gastar, pero es la verdad cuando no
    // se sabe. Mentir aquí sería peor que no saber.
    const ahora = Date.now();
    await db.run(
      `INSERT INTO conversations (id, channel, channel_user_id, started_at, last_message_at)
       VALUES ('zernio:888','zernio','888',?,?)`,
      [ahora, ahora],
    );
    expect((await origenDeConversacion(env, "zernio:888")).canal).toBe("zernio");
  });
});
