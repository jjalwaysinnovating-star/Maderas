// Convierte los HTML que arma contenido.py en PNG, con el Chromium del
// contenedor (no hay que descargar navegadores).
//
// Los posts salen opacos; las placas del reel salen con FONDO TRANSPARENTE,
// porque encima de ellas ffmpeg pone la foto en movimiento.
const { chromium } = require("playwright-core");
const D = __dirname;

const POSTS = [
  "post-1-financiamiento",
  "post-2-cancun",
  "post-3-ciudades",
  "post-4-monterrey",
  "post-5-amenidades",
  "post-6-leon",
  "post-7-proceso",
  "post-8-por-que-terreno",
];
const PLACAS = ["reel-1", "reel-2", "reel-3", "reel-4"];

(async () => {
  const navegador = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  });

  const render = async (nombre, w, h, transparente) => {
    const pagina = await navegador.newPage({ viewport: { width: w, height: h } });
    await pagina.goto("file://" + D + "/" + nombre + ".html");
    await pagina.waitForTimeout(1200); // que asienten las fuentes incrustadas
    await pagina.screenshot({
      path: `${D}/salida/${nombre}.png`,
      omitBackground: transparente,
    });
    await pagina.close();
    console.log(`${nombre}.png  ${w}x${h}${transparente ? "  (transparente)" : ""}`);
  };

  for (const p of POSTS) await render(p, 1080, 1350, false);
  for (const p of PLACAS) await render(p, 1080, 1920, true);

  await navegador.close();
})();
