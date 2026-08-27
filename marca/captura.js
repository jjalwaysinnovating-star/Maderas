// Convierte los dos HTML que arma marca.py en los PNG que se suben a Facebook.
// Chromium ya viene en el contenedor; no hay que descargar navegadores.
const { chromium } = require("playwright-core");
const D = __dirname;

const PIEZAS = [
  { html: "perfil.html", png: "fb-perfil.png", w: 1000, h: 1000 },
  { html: "portada.html", png: "fb-portada.png", w: 1640, h: 624 },
];

(async () => {
  const navegador = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  });
  for (const p of PIEZAS) {
    const pagina = await navegador.newPage({ viewport: { width: p.w, height: p.h } });
    await pagina.goto("file://" + D + "/" + p.html);
    await pagina.waitForTimeout(1200); // que asienten las fuentes incrustadas
    await pagina.screenshot({ path: D + "/" + p.png });
    await pagina.close();
    console.log(p.png, `${p.w}x${p.h}`);
  }
  await navegador.close();
})();
