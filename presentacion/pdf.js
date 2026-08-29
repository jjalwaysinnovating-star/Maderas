// Genera un PDF de la presentación desde el visor propio, porque LibreOffice
// no funciona en este contenedor. Cada lámina va como una página de 13.3x7.5.
const { chromium } = require("playwright-core");
const D = __dirname;
(async () => {
  const nav = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  });
  const pg = await nav.newPage();
  await pg.goto("file://" + D + "/vista.html");
  await pg.addStyleTag({ content: `
    body{background:#fff;padding:0;margin:0}
    .num{display:none}
    .lam{margin:0;page-break-after:always;break-after:page}
    .d{box-shadow:none}
  `});
  await pg.waitForTimeout(900);
  await pg.pdf({
    path: `${D}/sistema-ciudad-maderas.pdf`,
    width: "13.333in", height: "7.5in",
    printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log("pdf listo");
  await nav.close();
})();
