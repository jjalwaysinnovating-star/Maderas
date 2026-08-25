// member/landing.local.ts — la página pública del asesor.
// Vive en member/ a propósito: `forjabot update` refresca src/ pero NUNCA toca
// esta carpeta, así que los textos y datos de contacto sobreviven las
// actualizaciones del motor. Edítala cuando cambien precios o teléfonos.
//
// Se sirve desde el mismo Worker del bot (ver la ruta "/" en src/index.ts), así
// que el chat queda en el mismo origen: sin CORS, sin hosting aparte, sin costo.

export const landingConfig = {
  asesor: "Ciudad Maderas",
  telefono: "686 606 6613",
  telefonoLink: "526866066613", // formato internacional, para el link de WhatsApp
  horario: "Lunes a domingo · 8:00 a.m. – 6:00 p.m.",
};

const { asesor, telefono, telefonoLink, horario } = landingConfig;

export const landingHtml = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${asesor} — Terrenos y Casas Premium | Asesor autorizado</title>
<meta name="description" content="Invierte en terrenos y casas premium de Ciudad Maderas. Desde 1% de enganche, crédito directo, sin aval y sin buró. Asesoría gratuita.">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${asesor} — Terrenos y Casas Premium">
<meta property="og:description" content="Desde 1% de enganche · Crédito directo · Sin aval y sin buró. Asesoría personalizada y gratuita.">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌳</text></svg>">
<style>
  :root{
    --verde:#1f4d3a; --verde-claro:#2d6b50; --arena:#f5f1e8; --texto:#1a1a1a;
    --gris:#5c5c5c; --borde:#e2ddd0; --dorado:#c9a227; --blanco:#fff;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
       color:var(--texto);line-height:1.6;background:var(--blanco);-webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:0 20px}
  a{color:inherit}

  /* Barra superior */
  header{background:var(--verde);color:#fff;padding:14px 0;position:sticky;top:0;z-index:50}
  header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .marca{font-weight:700;font-size:17px;letter-spacing:-.01em}
  .marca span{display:block;font-weight:400;font-size:11px;opacity:.8;letter-spacing:.04em;text-transform:uppercase}
  .tel-top{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;
           padding:8px 16px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap}

  /* Portada */
  .hero{background:linear-gradient(160deg,var(--verde) 0%,var(--verde-claro) 100%);color:#fff;
        padding:64px 0 72px;text-align:center}
  .hero h1{font-size:clamp(28px,5.5vw,46px);line-height:1.15;letter-spacing:-.02em;margin-bottom:16px;font-weight:800}
  .hero p.sub{font-size:clamp(16px,2.4vw,19px);opacity:.93;max-width:620px;margin:0 auto 30px}
  .cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .btn{display:inline-block;padding:15px 30px;border-radius:10px;text-decoration:none;
       font-weight:700;font-size:16px;transition:transform .15s,box-shadow .15s}
  .btn:active{transform:translateY(1px)}
  .btn-wa{background:#25D366;color:#0a2e1a;box-shadow:0 4px 14px rgba(37,211,102,.35)}
  .btn-chat{background:#fff;color:var(--verde);box-shadow:0 4px 14px rgba(0,0,0,.18)}

  /* Cifras de respaldo */
  .cifras{background:var(--arena);padding:34px 0;border-bottom:1px solid var(--borde)}
  .cifras-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center}
  .cifra b{display:block;font-size:clamp(21px,3.6vw,30px);color:var(--verde);font-weight:800;letter-spacing:-.02em}
  .cifra span{font-size:12.5px;color:var(--gris)}
  @media(max-width:620px){.cifras-grid{grid-template-columns:repeat(2,1fr);gap:22px}}

  /* Secciones */
  section{padding:56px 0}
  h2{font-size:clamp(22px,3.6vw,30px);margin-bottom:10px;letter-spacing:-.02em;font-weight:800}
  .lead{color:var(--gris);margin-bottom:28px;max-width:620px}

  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(272px,1fr));gap:20px}
  .card{border:1px solid var(--borde);border-radius:14px;padding:26px;background:#fff}
  .card h3{font-size:19px;margin-bottom:8px;color:var(--verde);font-weight:700}
  .precio{font-size:26px;font-weight:800;color:var(--texto);margin:10px 0 4px;letter-spacing:-.02em}
  .precio small{font-size:13px;font-weight:500;color:var(--gris);display:block;letter-spacing:0}
  .card ul{list-style:none;margin-top:14px}
  .card li{padding:5px 0 5px 24px;position:relative;font-size:14.5px}
  .card li:before{content:"✓";position:absolute;left:0;color:var(--verde);font-weight:700}

  /* Facilidades */
  .facil{background:var(--verde);color:#fff}
  .facil h2{color:#fff}
  .facil .lead{color:rgba(255,255,255,.85)}
  .facil-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:8px}
  .fitem{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);
         border-radius:12px;padding:20px}
  .fitem b{display:block;font-size:17px;margin-bottom:4px;color:var(--dorado)}
  .fitem span{font-size:14px;opacity:.9}

  /* Amenidades y ciudades */
  .chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:6px}
  .chip{background:var(--arena);border:1px solid var(--borde);border-radius:999px;
        padding:8px 16px;font-size:14px}

  /* Cierre */
  .cierre{background:var(--arena);text-align:center}
  .cierre h2{margin-bottom:12px}
  .cierre p{color:var(--gris);max-width:540px;margin:0 auto 26px}

  footer{background:#132e23;color:rgba(255,255,255,.75);padding:34px 0;font-size:13.5px}
  footer .wrap{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
  footer a{color:#fff;font-weight:600}
  .aviso{margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.14);
         font-size:12px;opacity:.65;line-height:1.55}
</style>
</head>
<body>

<header>
  <div class="wrap">
    <div class="marca">Ciudad Maderas<span>Asesor autorizado</span></div>
    <a class="tel-top" href="tel:+${telefonoLink}">📞 ${telefono}</a>
  </div>
</header>

<div class="hero">
  <div class="wrap">
    <h1>Construye tu patrimonio<br>desde 1% de enganche</h1>
    <p class="sub">Terrenos y casas premium en comunidades planificadas, con más de 30 amenidades.
       Crédito directo con la desarrolladora: <strong>sin aval, sin buró y sin comprobante de ingresos.</strong></p>
    <div class="cta-row">
      <a class="btn btn-wa" href="https://wa.me/${telefonoLink}?text=Hola,%20me%20interesa%20invertir%20en%20un%20terreno">Escríbeme por WhatsApp</a>
      <a class="btn btn-chat" href="#" onclick="if(window.ForjaChat&&ForjaChat.open){ForjaChat.open()}else{document.querySelector('[id*=forja],[class*=forja]')?.click()};return false">Pregúntale al asistente</a>
    </div>
  </div>
</div>

<div class="cifras">
  <div class="wrap cifras-grid">
    <div class="cifra"><b>40+</b><span>años de experiencia</span></div>
    <div class="cifra"><b>124,000+</b><span>lotes comercializados</span></div>
    <div class="cifra"><b>28</b><span>desarrollos</span></div>
    <div class="cifra"><b>20</b><span>ciudades en México</span></div>
  </div>
</div>

<section class="wrap">
  <h2>Qué puedes adquirir</h2>
  <p class="lead">Los montos son precios <em>desde</em>: el final depende de la ciudad, los metros
     y la ubicación dentro del desarrollo. Te lo cotizo sin costo.</p>
  <div class="cards">
    <div class="card">
      <h3>🌳 Terrenos</h3>
      <div class="precio">Desde $550,000<small>MXN · habitacionales y comerciales</small></div>
      <ul>
        <li>Para construir a tu gusto</li>
        <li>Menor entrada y mensualidad</li>
        <li>Ideal para inversión a futuro</li>
        <li>Comunidades con traza urbana y servicios</li>
      </ul>
    </div>
    <div class="card">
      <h3>🏡 Casas premium</h3>
      <div class="precio">Desde $15,220<small>MXN al mes · 7 modelos exclusivos</small></div>
      <ul>
        <li>Listas para habitar, sin tiempos de obra</li>
        <li>Siete distribuciones a elegir</li>
        <li>Dentro de la comunidad con amenidades</li>
        <li>Opción de renta o patrimonio familiar</li>
      </ul>
    </div>
  </div>
</section>

<section class="facil">
  <div class="wrap">
    <h2>Por qué sí calificas</h2>
    <p class="lead">Mucha gente se descarta antes de preguntar. Aquí el crédito es directo con la
       desarrolladora, no con un banco — por eso las condiciones son distintas.</p>
    <div class="facil-grid">
      <div class="fitem"><b>1% de enganche</b><span>No necesitas una entrada fuerte para empezar</span></div>
      <div class="fitem"><b>Sin buró</b><span>Estar en buró no te descalifica</span></div>
      <div class="fitem"><b>Sin aval</b><span>Nadie más tiene que firmar por ti</span></div>
      <div class="fitem"><b>Sin comprobante</b><span>No pedimos recibos de nómina</span></div>
    </div>
  </div>
</section>

<section class="wrap">
  <h2>Más de 30 amenidades por desarrollo</h2>
  <p class="lead">No compras un lote aislado: compras la vida dentro de una comunidad planificada.
     El catálogo exacto varía por desarrollo.</p>
  <div class="chips">
    <span class="chip">🏊 Alberca semiolímpica</span>
    <span class="chip">🎾 Canchas de pádel y tenis</span>
    <span class="chip">💪 Gimnasio</span>
    <span class="chip">🏛️ Casa club</span>
    <span class="chip">🧒 Áreas infantiles</span>
    <span class="chip">🌿 Áreas verdes</span>
  </div>

  <h2 style="margin-top:44px">Dónde hay desarrollos</h2>
  <p class="lead">Presencia en 20 ciudades de México y 4 en Estados Unidos.
     Si tu ciudad no aparece, pregúntame: es probable que haya algo cerca.</p>
  <div class="chips">
    <span class="chip">Querétaro</span><span class="chip">León</span>
    <span class="chip">Mérida</span><span class="chip">Aguascalientes</span>
    <span class="chip">Monterrey</span><span class="chip">San Luis Potosí</span>
    <span class="chip">Cancún</span><span class="chip">Puebla</span>
  </div>
</section>

<section class="cierre">
  <div class="wrap">
    <h2>La asesoría es gratuita y sin compromiso</h2>
    <p>Cuéntame qué buscas —invertir, construir o asegurar patrimonio— y te muestro las
       opciones que te hacen sentido en la ciudad que te interese.</p>
    <div class="cta-row">
      <a class="btn btn-wa" href="https://wa.me/${telefonoLink}?text=Hola,%20quiero%20asesor%C3%ADa%20sobre%20terrenos">Escríbeme por WhatsApp</a>
    </div>
    <p style="margin-top:22px;font-size:14px">O llámame al <a href="tel:+${telefonoLink}"><strong>${telefono}</strong></a> · ${horario}</p>
  </div>
</section>

<footer>
  <div class="wrap">
    <div>
      <strong style="color:#fff">Ciudad Maderas</strong> · Asesor autorizado<br>
      ${horario}
    </div>
    <div>
      <a href="tel:+${telefonoLink}">${telefono}</a><br>
      <a href="https://wa.me/${telefonoLink}">WhatsApp</a>
    </div>
  </div>
  <div class="wrap aviso">
    Asesor inmobiliario autorizado para la comercialización de desarrollos de Ciudad Maderas.
    Los precios mostrados son montos <em>desde</em>, de carácter informativo, y no constituyen
    una oferta vinculante: el precio final depende del lote o modelo, su ubicación y la
    disponibilidad al momento de la cotización. Las condiciones de crédito están sujetas a
    aprobación y a los términos vigentes de la desarrolladora. La plusvalía de un inmueble
    depende del comportamiento del mercado y de la zona; no se garantiza rendimiento alguno.
  </div>
</footer>

<script src="/widget.js" defer></script>
</body>
</html>`;
