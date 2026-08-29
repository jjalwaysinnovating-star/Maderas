const { chromium } = require("playwright-core");
const D = process.argv[2];
(async () => {
  const nav = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" });
  for (const tema of ["light", "dark"]) {
    const pg = await nav.newPage({ viewport: { width: 900, height: 1400 }, colorScheme: tema });
    await pg.goto("file://" + D + "/guion-del-asesor.html");
    await pg.waitForTimeout(1500);
    await pg.screenshot({ path: `${D}/vista-${tema}.png` });
    await pg.close();
  }
  console.log("capturado claro y oscuro");
  await nav.close();
})();
