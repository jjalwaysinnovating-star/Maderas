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

  // El sitemap del sitio oficial declara /, /casas-premium y ocho
  // /proyectos/<region>; el pie agrega los dos legales. Aquí se replican
  // todas menos casas-premium.
  it("replica los slugs del sitio oficial", () => {
    for (const slug of [
      "queretaro",
      "guanajuato",
      "san-luis-potosi",
      "yucatan",
      "aguascalientes",
      "nuevo-leon",
      "quintana-roo",
      "puebla",
    ]) {
      expect(landingPages[`/proyectos/${slug}`], slug).toBeTruthy();
    }
    expect(landingPages["/aviso-de-privacidad"]).toBeTruthy();
    expect(landingPages["/terminos-y-condiciones"]).toBeTruthy();
  });

  it("no existe la página de casas del original", async () => {
    expect(landingPages["/casas-premium"]).toBeUndefined();
    expect((await get("/casas-premium")).status).toBe(404);
  });

  it("cada región usa su propio encabezado, precio y desarrollos", async () => {
    for (const r of regiones) {
      const html = await (await get(`/proyectos/${r.slug}`)).text();
      expect(html, r.slug).toContain(`Eleva tu estilo de vida en ${r.ciudad}`);
      expect(html, r.slug).toContain(r.precio);
      for (const d of r.desarrollos) expect(html, `${r.slug} · ${d.n}`).toContain(d.n);
    }
  });

  it("los precios por región no se pisan entre páginas", () => {
    // Querétaro publica $1,348 y Mérida $1,683: si una página trae el precio de
    // otra, alguien cotiza mal.
    const qro = landingPages["/proyectos/queretaro"];
    const mer = landingPages["/proyectos/yucatan"];
    expect(qro).toContain("$1,348");
    expect(qro).not.toContain("$1,683");
    expect(mer).toContain("$1,683");
    expect(mer).not.toContain("$1,348");
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

  it("el bloque que en el original es Casas Premium aquí dice Terrenos Premium", () => {
    expect(landingPages["/"]).toMatch(/Terrenos<b>Premium<\/b>/);
  });
});

describe("sitio del asesor — los clics llevan a algún lado", () => {
  it("ningún enlace interno apunta a una ruta que no existe", () => {
    const rutas = new Set(Object.keys(landingPages));
    const rotos: string[] = [];
    for (const [origen, html] of Object.entries(landingPages)) {
      for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
        const destino = m[1];
        // /widget.js lo sirve el motor, no el mapa de páginas.
        if (rutas.has(destino) || destino === "/widget.js") continue;
        rotos.push(`${origen} → ${destino}`);
      }
    }
    expect(rotos).toEqual([]);
  });

  it("ninguna ancla del menú cae en el vacío", () => {
    const rotas: string[] = [];
    for (const [origen, html] of Object.entries(landingPages)) {
      for (const m of html.matchAll(/href="(?:\/)?#([a-z-]+)"/g)) {
        const ancla = m[1];
        // Las anclas del menú viven en la portada; las locales, en la página.
        const destino = m[0].startsWith('href="/#') ? landingPages["/"] : html;
        if (!destino.includes(`id="${ancla}"`)) rotas.push(`${origen} → #${ancla}`);
      }
    }
    expect(rotas).toEqual([]);
  });

  // En celular el botón "Contacta a un asesor" se colocaba en absoluto sobre el
  // encabezado y quedaba encimado con el logo. El menú ya lleva CONTÁCTANOS y la
  // página está llena de botones de WhatsApp, así que sobra.
  it("el encabezado solo lleva logo, menú y el botón de abrir el menú", () => {
    for (const [ruta, html] of Object.entries(landingPages)) {
      const header = html.slice(html.indexOf("<header>"), html.indexOf("</header>"));
      expect(header, ruta).not.toContain("btn-nav");
      expect(header, ruta).not.toMatch(/Contacta a un asesor/i);
      expect(header, ruta).toContain('class="logo"');
      expect(header, ruta).toContain('class="burger"');
    }
  });

  it("el aviso legal y los enlaces legales aparecen en todas las páginas", () => {
    for (const [ruta, html] of Object.entries(landingPages)) {
      expect(html, ruta).toContain("garantiza rendimiento alguno");
      expect(html, ruta).toContain("Asesor inmobiliario autorizado");
      expect(html, ruta).toContain('href="/aviso-de-privacidad"');
      expect(html, ruta).toContain('href="/terminos-y-condiciones"');
    }
  });

  it("el WhatsApp del asesor sustituye al contacto del corporativo", () => {
    for (const [ruta, html] of Object.entries(landingPages)) {
      expect(html, ruta).toContain("wa.me/526866066613");
      // El 442 del corporativo se llevaría los prospectos.
      expect(html, ruta).not.toContain("4426090478");
    }
  });

  // El dueño pidió que su número no se publique: a la vista se lo copian los
  // bots de spam y los call centers. WhatsApp sí queda — ahí el contacto llega
  // por escrito y con nombre.
  it("el número no se escribe en ninguna página ni hay botón de llamar", () => {
    for (const [ruta, html] of Object.entries(landingPages)) {
      // Con separador: así es como se escribe un teléfono para leerlo. Los
      // dígitos pegados sí aparecen, pero solo dentro del enlace de wa.me.
      expect(html, `${ruta}: número a la vista`).not.toMatch(/686[\s.–-]+606[\s.–-]+6613/);
      expect(html, `${ruta}: enlace de llamada`).not.toContain('href="tel:');
      expect(html, `${ruta}: botón de llamar`).not.toMatch(/Llámame|Llamar ahora/i);
    }
  });
});

describe("formulario de contacto", () => {
  const enviar = async (campos: Record<string, string>) => {
    const mf = await createTestMiniflare();
    const d1 = await mf.getD1Database("DB");
    const env = { ...baseEnv, DB: d1 };
    const res = await worker.fetch(
      new Request("https://test/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(campos),
      }),
      env,
      ctx,
    );
    const leads = await new LeadsRepo(new Db(d1 as any)).list(10);
    return { res, leads };
  };

  it("usa los mismos nombres de campo que el formulario original", () => {
    const html = landingPages["/"];
    for (const n of ["tipo", "desarrollo", "nombre", "email", "telefono"]) {
      expect(html, n).toContain(`name="${n}"`);
    }
    expect(html).toContain("Selecciona tu interés");
    expect(html).toContain("Selecciona el desarrollo");
  });

  it("guarda el lead y manda a /gracias", async () => {
    const { res, leads } = await enviar({
      nombre: "Joswuar",
      telefono: "6866066613",
      email: "j@ejemplo.com",
      desarrollo: "Querétaro",
      tipo: "Invertir",
    });

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/gracias");
    expect(leads).toHaveLength(1);
    expect(leads[0].name).toBe("Joswuar");
    expect(leads[0].contact).toContain("6866066613");
    expect(leadMetadata(leads[0])).toMatchObject({
      origen: "formulario_web",
      ciudad: "Querétaro",
      uso: "Invertir",
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
