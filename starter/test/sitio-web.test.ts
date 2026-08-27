import { describe, it, expect, vi } from "vitest";
import { createTestMiniflare } from "./helpers/miniflareSetup";
import { Db } from "../src/db/client";
import { LeadsRepo, leadMetadata } from "../src/db/leads";

// Mismo motivo que test/index.test.ts: `src/index.ts` re-exporta SupportAgent,
// que arrastra el SDK `agents` y su import de `cloudflare:workers`.
vi.mock("agents", () => ({ Agent: class {} }));

import worker from "../src/index";
import { landingPages, regiones } from "../member/landing.local";

const baseEnv = {
  BOT_NAME: "Asesor",
  BUSINESS_NAME: "Ciudad Maderas — Terrenos Premium",
  BOT_LANGUAGE: "es",
  BOT_TIER: "free",
  BUFFER_SECONDS: "15",
  DASHBOARD_BASE_URL: "https://test.workers.dev",
} as any;

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as any;
const get = (ruta: string, env: any = baseEnv) =>
  worker.fetch(new Request(`https://test${ruta}`), env, ctx);

describe("sitio del asesor — rutas", () => {
  it("cada página declarada responde 200 con HTML", async () => {
    for (const ruta of Object.keys(landingPages)) {
      const res = await get(ruta);
      expect(res.status, `GET ${ruta}`).toBe(200);
      expect(res.headers.get("content-type") ?? "", `GET ${ruta}`).toContain("text/html");
    }
  });

  it("hay una página por cada región", async () => {
    for (const r of regiones) {
      const html = await (await get(`/proyectos/${r.slug}`)).text();
      expect(html, r.slug).toContain(r.region);
      expect(html, r.slug).toContain(r.ciudad);
    }
  });
});

describe("sitio del asesor — solo terrenos", () => {
  // El asesor NO vende casas. Si un texto de casa se cuela otra vez, llegan
  // prospectos que hay que rechazar — y rechazar quema el lead.
  const prohibido = [
    /casas?\s+premium/i,
    /modelos?\s+de\s+casa/i,
    /\$15,220/,
    /\bAlba\b|\bStella\b|\bAntara\b/,
  ];

  it("ninguna página menciona casas", () => {
    for (const [ruta, html] of Object.entries(landingPages)) {
      for (const re of prohibido) {
        expect(re.test(html), `${ruta} vs ${re}`).toBe(false);
      }
    }
  });

  it("la portada sí habla de terrenos", () => {
    expect(landingPages["/"]).toMatch(/Terrenos/);
  });
});

describe("sitio del asesor — los clics llevan a algún lado", () => {
  it("ningún enlace interno apunta a una ruta que no existe", async () => {
    const rutas = new Set(Object.keys(landingPages));
    const rotos: string[] = [];

    for (const [origen, html] of Object.entries(landingPages)) {
      for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
        const destino = m[1];
        if (rutas.has(destino)) continue;
        // /widget.js lo sirve el motor, no el mapa de páginas.
        if (destino === "/widget.js") continue;
        rotos.push(`${origen} → ${destino}`);
      }
    }

    expect(rotos).toEqual([]);
  });

  it("el aviso legal aparece en todas las páginas", () => {
    for (const [ruta, html] of Object.entries(landingPages)) {
      expect(html, ruta).toContain("garantiza rendimiento alguno");
      expect(html, ruta).toContain("Asesor inmobiliario autorizado");
    }
  });
});

describe("formulario de contacto", () => {
  const enviar = async (campos: Record<string, string>) => {
    const mf = await createTestMiniflare();
    const d1 = await mf.getD1Database("DB");
    const env = { ...baseEnv, DB: d1 };
    const body = new URLSearchParams(campos);
    const res = await worker.fetch(
      new Request("https://test/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }),
      env,
      ctx,
    );
    const leads = await new LeadsRepo(new Db(d1 as any)).list(10);
    return { res, leads };
  };

  it("guarda el lead y manda a /gracias", async () => {
    const { res, leads } = await enviar({
      nombre: "Joswuar",
      telefono: "6866066613",
      email: "j@ejemplo.com",
      region: "Querétaro",
      uso: "Inversión",
    });

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/gracias");
    expect(leads).toHaveLength(1);
    expect(leads[0].name).toBe("Joswuar");
    expect(leads[0].contact).toContain("6866066613");
    expect(leadMetadata(leads[0])).toMatchObject({
      origen: "formulario_web",
      ciudad: "Querétaro",
      uso: "Inversión",
    });
  });

  it("el correo es opcional", async () => {
    const { res, leads } = await enviar({ nombre: "Ana", telefono: "6861112222" });
    expect(res.status).toBe(303);
    expect(leads).toHaveLength(1);
    expect(leads[0].contact).toBe("6861112222");
  });

  it("sin teléfono no guarda nada y regresa al formulario", async () => {
    const { res, leads } = await enviar({ nombre: "Sin teléfono" });
    expect(res.headers.get("location")).toBe("/contacto");
    expect(leads).toHaveLength(0);
  });

  it("el campo cebo descarta el spam sin delatar cuál era", async () => {
    const { res, leads } = await enviar({
      nombre: "Bot",
      telefono: "0000000000",
      apellido2: "me delaté",
    });
    // Misma respuesta que un envío bueno: el spammer no aprende qué campo falló.
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/gracias");
    expect(leads).toHaveLength(0);
  });
});
