const { chromium } = require("playwright-core");
const D = __dirname;
(async () => {
  const nav = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  });
  const pg = await nav.newPage({ viewport: { width: 1400, height: 900 } });
  await pg.goto("file://" + D + "/vista.html");
  await pg.waitForTimeout(900);
  const laminas = await pg.$$(".d");
  for (let i = 0; i < laminas.length; i++) {
    await laminas[i].screenshot({ path: `${D}/lam-${String(i + 1).padStart(2, "0")}.png` });
  }
  console.log("capturadas:", laminas.length);
  await nav.close();
})();
