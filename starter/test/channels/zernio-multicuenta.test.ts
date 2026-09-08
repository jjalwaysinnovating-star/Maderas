/**
 * Dos asesores, dos cuentas de Zernio, y ni un mensaje cruzado.
 *
 * El bot nació sabiendo UNA sola cuenta: una clave para firmar el webhook y una
 * para contestar. Cuando el segundo asesor abre su propia cuenta de Zernio, su
 * webhook firma con SU clave y sus conversaciones viven en SU inbox. Sin esto:
 *
 *   • lo que mande su cuenta se rechaza con 403 y se pierde en silencio —el
 *     cliente escribe y nadie contesta, sin error visible en ningún lado—, y
 *   • si entrara, el bot respondería con la clave del dueño: le escribiría al
 *     cliente de él desde la cuenta de otro.
 *
 * Lo segundo es lo grave, porque se ve bien desde el panel. Por eso se prueba
 * el reparto de la clave de envío cuenta por cuenta, y no solo que "algo salga".
 */
import { describe, it, expect } from "vitest";
import { verifyZernioSignature, verificaFirmaZernio } from "../../src/channels/zernio";
import {
  claveZernioDeCuenta,
  secretosWebhookZernio,
  ASESORES,
  type Asesor,
} from "../../member/asesores.local";

/** Firma como firma Zernio: HMAC-SHA256 hex del cuerpo crudo. */
async function firma(secreto: string, cuerpo: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(cuerpo));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CUENTA_DUENO = "cuenta-del-dueno";
const CUENTA_SEGUNDO = "cuenta-del-segundo";

const LISTA: Asesor[] = [
  { slug: "duenio", nombre: "Joswuar", emails: [], cuentasZernio: [CUENTA_DUENO] },
  {
    slug: "segundo",
    nombre: "Marisol",
    emails: ["marisol@ejemplo.com"],
    cuentasZernio: [CUENTA_SEGUNDO],
    zernio: {
      apiKeyVar: "ZERNIO_API_KEY_SEGUNDO",
      webhookSecretVar: "ZERNIO_WEBHOOK_SECRET_SEGUNDO",
    },
  },
];

const ENV = {
  ZERNIO_API_KEY: "clave-del-dueno",
  ZERNIO_WEBHOOK_SECRET: "firma-del-dueno",
  ZERNIO_API_KEY_SEGUNDO: "clave-de-marisol",
  ZERNIO_WEBHOOK_SECRET_SEGUNDO: "firma-de-marisol",
} as any;

const CUERPO = JSON.stringify({ event: "message.received", message: { text: "hola" } });

describe("recibir de dos cuentas de Zernio", () => {
  it("acepta lo que firma la cuenta del dueño", async () => {
    const sig = await firma("firma-del-dueno", CUERPO);
    expect(await verificaFirmaZernio(CUERPO, sig, secretosWebhookZernio(ENV, LISTA))).toBe(true);
  });

  it("acepta lo que firma la cuenta del segundo asesor", async () => {
    // Este es el caso que HOY se rechazaba con 403 y se perdía sin ruido.
    const sig = await firma("firma-de-marisol", CUERPO);
    expect(await verificaFirmaZernio(CUERPO, sig, secretosWebhookZernio(ENV, LISTA))).toBe(true);
  });

  it("sigue rechazando a un desconocido", async () => {
    const sig = await firma("firma-inventada", CUERPO);
    expect(await verificaFirmaZernio(CUERPO, sig, secretosWebhookZernio(ENV, LISTA))).toBe(false);
  });

  it("rechaza una firma válida de OTRO cuerpo", async () => {
    // Sin esto, aceptar varios secrets podría degenerar en aceptar cualquier
    // firma bien formada. Cada secret se compara contra ESTE cuerpo.
    const sig = await firma("firma-de-marisol", JSON.stringify({ otra: "cosa" }));
    expect(await verificaFirmaZernio(CUERPO, sig, secretosWebhookZernio(ENV, LISTA))).toBe(false);
  });

  it("sin firma no entra nada, aunque haya secrets de sobra", async () => {
    const secretos = secretosWebhookZernio(ENV, LISTA);
    expect(secretos.length).toBeGreaterThan(1);
    expect(await verificaFirmaZernio(CUERPO, null, secretos)).toBe(false);
    expect(await verificaFirmaZernio(CUERPO, "", secretos)).toBe(false);
  });

  it("sin ningún secret configurado no entra nada", async () => {
    // Fail-closed: un bot a medio configurar no se vuelve un buzón abierto.
    const sig = await firma("firma-del-dueno", CUERPO);
    expect(await verificaFirmaZernio(CUERPO, sig, [])).toBe(false);
    expect(secretosWebhookZernio({} as any, LISTA)).toEqual([]);
  });

  it("no repite un secret compartido por dos asesores", async () => {
    const compartida: Asesor[] = [
      LISTA[0],
      { ...LISTA[1], zernio: { apiKeyVar: "ZERNIO_API_KEY", webhookSecretVar: "ZERNIO_WEBHOOK_SECRET" } },
    ];
    expect(secretosWebhookZernio(ENV, compartida)).toEqual(["firma-del-dueno"]);
  });

  it("ignora un nombre de secret con forma rara en vez de leer basura", () => {
    const raro: Asesor[] = [
      { ...LISTA[1], zernio: { apiKeyVar: "constructor", webhookSecretVar: "__proto__" } },
    ];
    expect(secretosWebhookZernio(ENV, raro)).toEqual(["firma-del-dueno"]);
    expect(claveZernioDeCuenta(ENV, CUENTA_SEGUNDO, raro).apiKey).toBeUndefined();
  });
});

describe("contestar por la cuenta correcta", () => {
  it("por la cuenta del dueño contesta con la clave del dueño", () => {
    const r = claveZernioDeCuenta(ENV, CUENTA_DUENO, LISTA);
    expect(r.apiKey).toBe("clave-del-dueno");
    expect(r.asesor?.slug).toBe("duenio");
  });

  it("por la cuenta del segundo contesta con LA SUYA", () => {
    const r = claveZernioDeCuenta(ENV, CUENTA_SEGUNDO, LISTA);
    expect(r.apiKey).toBe("clave-de-marisol");
    expect(r.asesor?.slug).toBe("segundo");
  });

  it("una cuenta que nadie declaró cae en la del dueño", () => {
    // Es a propósito: si el dueño conecta una tercera red suya y todavía no la
    // apunta en la lista, el bot sigue contestando en vez de callarse.
    const r = claveZernioDeCuenta(ENV, "cuenta-nueva-sin-declarar", LISTA);
    expect(r.apiKey).toBe("clave-del-dueno");
    expect(r.asesor).toBeUndefined();
  });

  it("sin accountId cae en la del dueño", () => {
    expect(claveZernioDeCuenta(ENV, null, LISTA).apiKey).toBe("clave-del-dueno");
    expect(claveZernioDeCuenta(ENV, undefined, LISTA).apiKey).toBe("clave-del-dueno");
  });

  it("si el asesor declaró cuenta propia y falta su secret, NO usa la del dueño", () => {
    // El corazón de todo esto. Callarse es feo; contestarle al cliente de
    // Marisol desde la cuenta del dueño es peor, y desde el panel se ve igual
    // de bien. Se devuelve el nombre del secret que falta para poder decirlo.
    const sinSecret = { ZERNIO_API_KEY: "clave-del-dueno" } as any;
    const r = claveZernioDeCuenta(sinSecret, CUENTA_SEGUNDO, LISTA);
    expect(r.apiKey).toBeUndefined();
    expect(r.faltaSecret).toBe("ZERNIO_API_KEY_SEGUNDO");
    expect(r.asesor?.nombre).toBe("Marisol");
  });

  it("un secret vacío cuenta como ausente, no como clave", () => {
    const vacio = { ...ENV, ZERNIO_API_KEY_SEGUNDO: "   " } as any;
    const r = claveZernioDeCuenta(vacio, CUENTA_SEGUNDO, LISTA);
    expect(r.apiKey).toBeUndefined();
    expect(r.faltaSecret).toBe("ZERNIO_API_KEY_SEGUNDO");
  });
});

describe("con un solo asesor todo sigue igual que antes", () => {
  const SOLO: Asesor[] = [
    { slug: "duenio", nombre: "Joswuar", emails: [], cuentasZernio: [CUENTA_DUENO] },
  ];

  it("un solo secret que probar", () => {
    expect(secretosWebhookZernio(ENV, SOLO)).toEqual(["firma-del-dueno"]);
  });

  it("la verificación de siempre da lo mismo que la nueva", async () => {
    const sig = await firma("firma-del-dueno", CUERPO);
    const vieja = await verifyZernioSignature(CUERPO, sig, ENV.ZERNIO_WEBHOOK_SECRET);
    const nueva = await verificaFirmaZernio(CUERPO, sig, secretosWebhookZernio(ENV, SOLO));
    expect(nueva).toBe(vieja);
    expect(nueva).toBe(true);
  });

  it("siempre contesta con la clave del dueño", () => {
    expect(claveZernioDeCuenta(ENV, CUENTA_DUENO, SOLO).apiKey).toBe("clave-del-dueno");
    expect(claveZernioDeCuenta(ENV, CUENTA_SEGUNDO, SOLO).apiKey).toBe("clave-del-dueno");
  });
});

/**
 * El nombre del secret no es cosmético: `claveZernioDeCuenta` lee `env` por
 * índice y solo acepta MAYÚSCULAS (ver NOMBRE_SECRET). Un nombre con una
 * minúscula —`ZERNIO_API_KEY_Paula`, que es exactamente lo que se guardó la
 * primera vez— se rechaza, el asesor se queda sin clave y el bot deja de
 * contestarle a SUS clientes. No truena ni marca nada en pantalla: solo deja
 * de responder, y eso solo se ve en el log.
 *
 * Esta prueba mira la lista REAL, no una de mentiras: si alguien da de alta a
 * un asesor apuntando a un nombre que el código no sabe leer, falla aquí y no
 * en producción una semana después.
 */
describe("los secrets declarados en la lista real se pueden leer", () => {
  for (const a of ASESORES.filter((x) => x.zernio)) {
    it(`${a.slug}: sus dos nombres de secret son válidos`, () => {
      const z = a.zernio!;
      const env = {
        ZERNIO_API_KEY: "la-del-dueño",
        [z.apiKeyVar]: "la-de-este-asesor",
        [z.webhookSecretVar]: "firma-de-este-asesor",
      } as unknown as Parameters<typeof claveZernioDeCuenta>[0];

      // Se le presta una cuenta de mentiras para poder resolverlo por
      // accountId: así el nombre se valida aunque el asesor todavía no tenga
      // sus cuentas reales dadas de alta —que es justo cuando se cometen estos
      // errores y cuando nadie los notaría—.
      const conCuenta = [{ ...a, cuentasZernio: ["CUENTA-DE-PRUEBA"] }];
      const r = claveZernioDeCuenta(env, "CUENTA-DE-PRUEBA", conCuenta);
      expect(r.faltaSecret).toBeUndefined();
      expect(r.apiKey).toBe("la-de-este-asesor");

      expect(secretosWebhookZernio(env, conCuenta)).toContain("firma-de-este-asesor");
    });
  }
});
