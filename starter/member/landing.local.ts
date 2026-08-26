// member/landing.local.ts — la página pública del asesor.
// Vive en member/ a propósito: `forjabot update` refresca src/ pero NUNCA toca
// esta carpeta, así que los textos y datos de contacto sobreviven las
// actualizaciones del motor. Edítala cuando cambien precios o teléfonos.
//
// Se sirve desde el mismo Worker del bot (ver la ruta "/" en src/index.ts), así
// que el chat queda en el mismo origen: sin CORS, sin hosting aparte, sin costo.
//
// FOTOS: se referencian desde el bucket público de Ciudad Maderas
// (storage.googleapis.com/landing-ciudad-maderas), el mismo que usa su sitio
// oficial. El navegador las trae de ahí — no se redistribuyen copias. Si la
// desarrolladora mueve esas rutas, las fotos dejan de cargar: por eso cada
// bloque de imagen conserva su color de fondo y el texto encima nunca depende
// de que la foto exista.
//
// PALETA: la de la marca (azul petróleo #00263a + dorado #b4a269), tomada de
// la hoja de estilos de ciudadmaderas.com para que la página se lea como parte
// de la misma familia visual.

export const landingConfig = {
  asesor: "Ciudad Maderas",
  telefono: "686 606 6613",
  telefonoLink: "526866066613", // formato internacional, para el link de WhatsApp
  horario: "Lunes a domingo · 8:00 a.m. – 6:00 p.m.",
};

const { telefono, telefonoLink, horario } = landingConfig;

const IMG = "https://storage.googleapis.com/landing-ciudad-maderas";

const amenidades: { img: string; nombre: string }[] = [
  { img: `${IMG}/amenidades/Alberca.jpg`, nombre: "Albercas semiolímpicas" },
  { img: `${IMG}/amenidades/Albercas%20techadas.webp`, nombre: "Albercas techadas" },
  { img: `${IMG}/amenidades/Cancha%20Pa%CC%81del.webp`, nombre: "Canchas de pádel" },
  { img: `${IMG}/amenidades/Cancha%20de%20tenis.webp`, nombre: "Canchas de tenis" },
  { img: `${IMG}/amenidades/Chapoteadero.webp`, nombre: "Chapoteaderos" },
];

const ciudades: { img: string; nombre: string }[] = [
  { img: `${IMG}/desarrollos/Qro.webp`, nombre: "Querétaro" },
  { img: `${IMG}/desarrollos/Guanajuato.webp`, nombre: "León" },
  { img: `${IMG}/desarrollos/Me%CC%81rida.webp`, nombre: "Mérida" },
  { img: `${IMG}/desarrollos/Ags.webp`, nombre: "Aguascalientes" },
  { img: `${IMG}/desarrollos/Mty.webp`, nombre: "Monterrey" },
  { img: `${IMG}/desarrollos/SLP.webp`, nombre: "San Luis Potosí" },
  { img: `${IMG}/desarrollos/Quintana%20Roo.webp`, nombre: "Cancún" },
  { img: `${IMG}/desarrollos/puebla/puebla.webp`, nombre: "Puebla" },
];

// Los 7 modelos que publica la desarrolladora. Sin metros ni recámaras: no los
// publica, y el bot tiene prohibido inventarlos.
const modelos = ["Alba", "Nova", "Aqua", "Stella", "Lucero", "Antara", "Aura"];

const faqs: { q: string; a: string }[] = [
  {
    q: "¿Piden buró de crédito?",
    a: "No. No se revisa buró. Estar en buró no te impide comprar: el crédito es directo con la desarrolladora, no con un banco.",
  },
  {
    q: "¿Necesito comprobar ingresos?",
    a: "No se pide comprobante de ingresos ni recibos de nómina. Tampoco necesitas aval.",
  },
  {
    q: "¿De cuánto es el enganche?",
    a: "Desde el 1%. Es de las mayores facilidades que existen en el sector: no necesitas una entrada fuerte para empezar a construir patrimonio.",
  },
  {
    q: "¿Cuánto mide un lote y cuánto cuesta exactamente?",
    a: "Depende del desarrollo, los metros y la ubicación dentro de la comunidad. Te comparto los planos con medidas y el precio del lote específico que te interese, sin costo.",
  },
  {
    q: "¿Cuánto va a subir de valor mi terreno?",
    a: "No te daría un porcentaje que luego no se cumpla: el comportamiento de cada zona depende de muchos factores. Lo que sí puedo mostrarte es cómo se ha desarrollado la zona que te interesa y el respaldo de más de 40 años y +124,000 lotes.",
  },
  {
    q: "¿Puedo apartar desde aquí?",
    a: "El apartado y el contrato los hacemos con calma, ya con toda la información sobre la mesa. Aquí resolvemos tus dudas y agendamos.",
  },
];

const chip = (t: string) => `<span class="chip">${t}</span>`;

export const landingHtml = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ciudad Maderas — Terrenos y Casas Premium | Asesor autorizado</title>
<meta name="description" content="Terrenos desde $550,000 MXN y casas premium desde $15,220 al mes. Crédito directo desde 1% de enganche, sin aval y sin revisión de buró. Asesoría gratuita.">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#00263a">
<meta property="og:title" content="Ciudad Maderas — Terrenos y Casas Premium">
<meta property="og:description" content="Desde 1% de enganche · Crédito directo · Sin aval y sin buró. Asesoría personalizada y gratuita.">
<meta property="og:image" content="${IMG}/casas/casaPremium.webp">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌳</text></svg>">
<style>
  :root{
    --azul:#00263a; --azul-2:#0d1f33; --azul-3:#001e2d;
    --oro:#b4a269; --oro-claro:#dcce9e;
    --crema:#f3f0e8; --crema-2:#e9e6dc;
    --texto:#14212b; --gris:#5a6672; --linea:#ddd9ce; --blanco:#fff;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
       color:var(--texto);line-height:1.6;background:var(--blanco);-webkit-font-smoothing:antialiased}
  img{display:block;max-width:100%}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:1140px;margin:0 auto;padding:0 22px}

  /* ── Barra superior ─────────────────────────────────────────── */
  header{background:var(--azul);color:#fff;position:sticky;top:0;z-index:60;
         border-bottom:1px solid rgba(180,162,105,.28)}
  header .wrap{display:flex;align-items:center;justify-content:space-between;gap:14px;
               min-height:64px;flex-wrap:wrap}
  .marca{font-weight:800;font-size:17px;letter-spacing:.01em;line-height:1.15}
  .marca span{display:block;font-weight:500;font-size:10.5px;letter-spacing:.16em;
              text-transform:uppercase;color:var(--oro-claro);margin-top:2px}
  nav{display:flex;gap:22px;font-size:14.5px;font-weight:600}
  nav a{opacity:.88}
  nav a:hover{opacity:1;color:var(--oro-claro)}
  @media(max-width:860px){nav{display:none}}
  .tel-top{background:var(--oro);color:var(--azul);padding:9px 18px;border-radius:6px;
           font-weight:800;font-size:14px;white-space:nowrap}

  /* ── Portada ────────────────────────────────────────────────── */
  .hero{position:relative;background:var(--azul-3);color:#fff;overflow:hidden}
  .hero-bg{position:absolute;inset:0}
  .hero-bg img{width:100%;height:100%;object-fit:cover;opacity:.4}
  .hero-bg:after{content:"";position:absolute;inset:0;
    background:linear-gradient(100deg,rgba(0,30,45,.94) 0%,rgba(0,38,58,.82) 45%,rgba(0,38,58,.45) 100%)}
  .hero .wrap{position:relative;padding:78px 22px 84px}
  .eyebrow{display:inline-block;font-size:12px;letter-spacing:.2em;text-transform:uppercase;
           font-weight:700;color:var(--oro-claro);border:1px solid rgba(220,206,158,.42);
           border-radius:999px;padding:6px 16px;margin-bottom:22px}
  .hero h1{font-size:clamp(31px,5.6vw,55px);line-height:1.09;letter-spacing:-.025em;
           font-weight:800;margin-bottom:20px;max-width:16ch}
  .hero h1 em{font-style:normal;color:var(--oro-claro)}
  .hero p.lead{font-size:clamp(16.5px,2.1vw,20px);opacity:.92;max-width:52ch;margin-bottom:32px}
  .cta-row{display:flex;gap:12px;flex-wrap:wrap}
  .btn{display:inline-block;padding:15px 28px;border-radius:8px;font-weight:800;font-size:16px;
       transition:transform .14s,box-shadow .14s;border:2px solid transparent}
  .btn:active{transform:translateY(1px)}
  .btn-wa{background:#25D366;color:#05301a;box-shadow:0 6px 20px rgba(37,211,102,.28)}
  .btn-oro{background:var(--oro);color:var(--azul);box-shadow:0 6px 20px rgba(180,162,105,.28)}
  .btn-ghost{border-color:rgba(255,255,255,.4);color:#fff}

  /* ── Cifras ─────────────────────────────────────────────────── */
  .cifras{background:var(--crema);border-bottom:1px solid var(--linea)}
  .cifras .wrap{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;
                padding-top:30px;padding-bottom:30px;text-align:center}
  .cifra b{display:block;font-size:clamp(21px,3.4vw,31px);color:var(--azul);
           font-weight:800;letter-spacing:-.025em;line-height:1.1}
  .cifra span{font-size:12.5px;color:var(--gris);font-weight:500}
  @media(max-width:640px){.cifras .wrap{grid-template-columns:repeat(2,1fr);gap:24px}}

  /* ── Secciones ──────────────────────────────────────────────── */
  section{padding:66px 0}
  .head{max-width:640px;margin-bottom:34px}
  .kicker{font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;
          color:var(--oro);margin-bottom:10px}
  h2{font-size:clamp(24px,3.8vw,35px);letter-spacing:-.025em;font-weight:800;
     line-height:1.16;margin-bottom:12px}
  .head p{color:var(--gris);font-size:16.5px}

  /* ── Terreno vs casa ────────────────────────────────────────── */
  .duo{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  @media(max-width:800px){.duo{grid-template-columns:1fr}}
  .op{border:1px solid var(--linea);border-radius:14px;overflow:hidden;background:#fff;
      display:flex;flex-direction:column}
  .op-img{height:210px;background:var(--azul-2);position:relative}
  .op-img img{width:100%;height:100%;object-fit:cover}
  .op-tag{position:absolute;left:16px;top:16px;background:var(--azul);color:#fff;
          font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
          padding:6px 13px;border-radius:5px}
  .op-body{padding:26px;flex:1;display:flex;flex-direction:column}
  .op h3{font-size:21px;font-weight:800;margin-bottom:4px}
  .precio{font-size:31px;font-weight:800;letter-spacing:-.03em;color:var(--azul);margin:12px 0 2px}
  .precio small{display:block;font-size:13px;font-weight:600;color:var(--gris);letter-spacing:0;margin-top:3px}
  .op ul{list-style:none;margin:18px 0 22px}
  .op li{padding:6px 0 6px 26px;position:relative;font-size:15px;border-top:1px solid var(--crema-2)}
  .op li:first-child{border-top:0}
  .op li:before{content:"✓";position:absolute;left:0;top:6px;color:var(--oro);font-weight:900}
  .op .btn{margin-top:auto;text-align:center}

  /* ── Modelos ────────────────────────────────────────────────── */
  .modelos{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
  .modelo{border:1.5px solid var(--linea);border-radius:8px;padding:13px 22px;
          font-weight:800;font-size:16px;color:var(--azul);background:var(--crema)}

  /* ── Financiamiento ─────────────────────────────────────────── */
  .fin{background:var(--azul);color:#fff}
  .fin h2{color:#fff}
  .fin .head p{color:rgba(255,255,255,.82)}
  .fin-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  @media(max-width:880px){.fin-grid{grid-template-columns:repeat(2,1fr)}}
  .fi{background:rgba(255,255,255,.06);border:1px solid rgba(180,162,105,.32);
      border-radius:12px;padding:24px}
  .fi b{display:block;font-size:19px;color:var(--oro-claro);margin-bottom:6px;font-weight:800}
  .fi span{font-size:14.5px;opacity:.86}
  .nota{margin-top:30px;padding:20px 24px;background:rgba(0,0,0,.22);border-left:3px solid var(--oro);
        border-radius:0 10px 10px 0;font-size:15.5px;max-width:70ch}

  /* ── Galerías ───────────────────────────────────────────────── */
  .gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:16px}
  .g{border-radius:12px;overflow:hidden;position:relative;background:var(--azul-2);aspect-ratio:4/3}
  .g img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
  .g:hover img{transform:scale(1.05)}
  .g figcaption{position:absolute;left:0;right:0;bottom:0;padding:26px 16px 13px;color:#fff;
     font-weight:700;font-size:15.5px;background:linear-gradient(transparent,rgba(0,30,45,.9))}
  .chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}
  .chip{background:var(--crema);border:1px solid var(--linea);border-radius:999px;
        padding:8px 17px;font-size:14.5px;font-weight:600}

  /* ── Proceso ────────────────────────────────────────────────── */
  .pasos{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;counter-reset:p}
  @media(max-width:880px){.pasos{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:520px){.pasos{grid-template-columns:1fr}}
  .paso{counter-increment:p;position:relative;padding-top:52px}
  .paso:before{content:counter(p);position:absolute;top:0;left:0;width:38px;height:38px;
    border-radius:50%;background:var(--oro);color:var(--azul);font-weight:900;font-size:17px;
    display:flex;align-items:center;justify-content:center}
  .paso h4{font-size:17px;font-weight:800;margin-bottom:5px}
  .paso p{font-size:14.5px;color:var(--gris)}

  /* ── FAQ ────────────────────────────────────────────────────── */
  .faq{background:var(--crema)}
  details{background:#fff;border:1px solid var(--linea);border-radius:10px;margin-bottom:11px;
          overflow:hidden}
  summary{padding:18px 22px;font-weight:700;font-size:16.5px;cursor:pointer;list-style:none;
          display:flex;justify-content:space-between;align-items:center;gap:14px}
  summary::-webkit-details-marker{display:none}
  summary:after{content:"+";color:var(--oro);font-size:24px;font-weight:800;line-height:1;flex-shrink:0}
  details[open] summary:after{content:"–"}
  details p{padding:0 22px 20px;color:var(--gris);font-size:15.5px;max-width:75ch}

  /* ── Cierre ─────────────────────────────────────────────────── */
  .cierre{background:var(--azul-3);color:#fff;text-align:center}
  .cierre h2{color:#fff}
  .cierre p.lead{color:rgba(255,255,255,.85);max-width:56ch;margin:0 auto 28px;font-size:17px}
  .cierre .cta-row{justify-content:center}
  .cierre .tel{margin-top:24px;font-size:15.5px;opacity:.82}
  .cierre .tel a{color:var(--oro-claro);font-weight:800}

  footer{background:#001622;color:rgba(255,255,255,.72);padding:40px 0;font-size:14px}
  .foot-top{display:flex;justify-content:space-between;gap:22px;flex-wrap:wrap;
            padding-bottom:22px;border-bottom:1px solid rgba(255,255,255,.12)}
  footer strong{color:#fff}
  footer a{color:var(--oro-claro);font-weight:700}
  .legal{margin-top:20px;font-size:12px;opacity:.6;line-height:1.6;max-width:95ch}
</style>
</head>
<body>

<header>
  <div class="wrap">
    <div class="marca">Ciudad Maderas<span>Asesor autorizado</span></div>
    <nav>
      <a href="#opciones">Terrenos y casas</a>
      <a href="#financiamiento">Financiamiento</a>
      <a href="#amenidades">Amenidades</a>
      <a href="#ciudades">Ciudades</a>
      <a href="#faq">Preguntas</a>
    </nav>
    <a class="tel-top" href="tel:+${telefonoLink}">${telefono}</a>
  </div>
</header>

<div class="hero">
  <div class="hero-bg"><img src="${IMG}/casas/casaPremium.webp" alt="" loading="eager" decoding="async"></div>
  <div class="wrap">
    <div class="eyebrow">Asesor autorizado</div>
    <h1>Construye tu patrimonio <em>desde 1% de enganche</em></h1>
    <p class="lead">Terrenos y casas premium en comunidades planificadas con más de 30 amenidades.
       Crédito directo con la desarrolladora: <strong>sin aval, sin buró y sin comprobante de ingresos.</strong></p>
    <div class="cta-row">
      <a class="btn btn-wa" href="https://wa.me/${telefonoLink}?text=Hola,%20me%20interesa%20invertir%20en%20un%20terreno">Escríbeme por WhatsApp</a>
      <a class="btn btn-ghost" href="#opciones">Ver opciones y precios</a>
    </div>
  </div>
</div>

<div class="cifras">
  <div class="wrap">
    <div class="cifra"><b>40+</b><span>años de experiencia</span></div>
    <div class="cifra"><b>124,000+</b><span>lotes comercializados</span></div>
    <div class="cifra"><b>28</b><span>desarrollos</span></div>
    <div class="cifra"><b>20</b><span>ciudades en México</span></div>
  </div>
</div>

<section id="opciones">
  <div class="wrap">
    <div class="head">
      <div class="kicker">Qué puedes adquirir</div>
      <h2>¿Terreno para construir, o casa lista?</h2>
      <p>Los montos son precios <em>desde</em>: el final depende de la ciudad, los metros y la
         ubicación dentro del desarrollo. Te lo cotizo sin costo y sin compromiso.</p>
    </div>
    <div class="duo">
      <article class="op">
        <div class="op-img"><span class="op-tag">Terrenos</span>
          <img src="${IMG}/desarrollos/Qro.webp" alt="Terrenos en comunidad planificada" loading="lazy"></div>
        <div class="op-body">
          <h3>Lotes habitacionales y comerciales</h3>
          <div class="precio">Desde $550,000<small>MXN · según ciudad, metros y ubicación</small></div>
          <ul>
            <li>Menor entrada y mensualidad</li>
            <li>Construyes a tu gusto y a tu tiempo</li>
            <li>Ideal para inversión a mediano plazo</li>
            <li>Traza urbana, servicios y amenidades proyectadas</li>
          </ul>
          <a class="btn btn-oro" href="https://wa.me/${telefonoLink}?text=Hola,%20quiero%20info%20de%20terrenos">Cotizar un terreno</a>
        </div>
      </article>
      <article class="op">
        <div class="op-img"><span class="op-tag">Casas premium</span>
          <img src="${IMG}/casas/casaPremium.webp" alt="Casa premium Ciudad Maderas" loading="lazy"></div>
        <div class="op-body">
          <h3>7 modelos exclusivos</h3>
          <div class="precio">Desde $15,220<small>MXN al mes · según modelo, enganche y plazo</small></div>
          <ul>
            <li>Listas para habitar, sin tiempos de obra</li>
            <li>Siete distribuciones a elegir</li>
            <li>Dentro de la comunidad con amenidades</li>
            <li>Para vivir, rentar o heredar</li>
          </ul>
          <a class="btn btn-oro" href="https://wa.me/${telefonoLink}?text=Hola,%20quiero%20info%20de%20casas%20premium">Ver casas disponibles</a>
        </div>
      </article>
    </div>

    <div class="head" style="margin-top:52px;margin-bottom:14px">
      <h2 style="font-size:22px">Los siete modelos</h2>
      <p>Cada uno con su propia distribución y acabados. La disponibilidad varía por desarrollo.</p>
    </div>
    <div class="modelos">${modelos.map((m) => `<span class="modelo">${m}</span>`).join("")}</div>
  </div>
</section>

<section class="fin" id="financiamiento">
  <div class="wrap">
    <div class="head">
      <div class="kicker">Por qué sí calificas</div>
      <h2>El crédito es directo con la desarrolladora</h2>
      <p>No pasa por un banco. Por eso las condiciones son distintas a todo lo que ya
         te dijeron que no.</p>
    </div>
    <div class="fin-grid">
      <div class="fi"><b>1% de enganche</b><span>No necesitas una entrada fuerte para empezar</span></div>
      <div class="fi"><b>Sin buró</b><span>Estar en buró no te descalifica</span></div>
      <div class="fi"><b>Sin aval</b><span>Nadie más tiene que firmar por ti</span></div>
      <div class="fi"><b>Sin comprobante</b><span>No se piden recibos de nómina</span></div>
    </div>
    <p class="nota">Mucha gente se descarta antes de preguntar: cree que necesita buen buró,
       sueldo comprobable o una entrada grande. Si eso te frenó alguna vez, esta es la
       diferencia — y no cuesta nada averiguar cuánto te tocaría pagar.</p>
  </div>
</section>

<section id="amenidades">
  <div class="wrap">
    <div class="head">
      <div class="kicker">La vida dentro</div>
      <h2>Más de 30 amenidades por desarrollo</h2>
      <p>No compras un lote aislado: compras la comunidad que lo rodea. Eso es lo que
         sostiene el valor de la zona con el tiempo.</p>
    </div>
    <div class="gal">
      ${amenidades
        .map(
          (a) =>
            `<figure class="g"><img src="${a.img}" alt="${a.nombre}" loading="lazy"><figcaption>${a.nombre}</figcaption></figure>`,
        )
        .join("")}
    </div>
    <div class="chips">
      ${["Casa club", "Gimnasio", "Áreas infantiles", "Áreas verdes", "Club deportivo", "Family club"].map(chip).join("")}
    </div>
    <p style="margin-top:16px;color:var(--gris);font-size:14.5px">
      El catálogo exacto varía por desarrollo y por etapa. Te confirmo cuáles hay —y cuáles ya
      están construidas— en el que te interese.</p>
  </div>
</section>

<section class="faq" id="ciudades" style="background:var(--crema)">
  <div class="wrap">
    <div class="head">
      <div class="kicker">Dónde</div>
      <h2>Presencia en 20 ciudades de México</h2>
      <p>Y 4 en Estados Unidos. Si tu ciudad no aparece aquí, pregúntame: es probable
         que haya algo cerca.</p>
    </div>
    <div class="gal">
      ${ciudades
        .map(
          (c) =>
            `<figure class="g"><img src="${c.img}" alt="Desarrollos en ${c.nombre}" loading="lazy"><figcaption>${c.nombre}</figcaption></figure>`,
        )
        .join("")}
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="head">
      <div class="kicker">Cómo funciona</div>
      <h2>De la duda a las llaves, en cuatro pasos</h2>
    </div>
    <div class="pasos">
      <div class="paso"><h4>Platicamos</h4><p>Me cuentas qué buscas y en qué ciudad. Por WhatsApp o
        por el chat de aquí abajo, a la hora que te quede.</p></div>
      <div class="paso"><h4>Te coticé</h4><p>Te mando opciones reales con medidas, precio y plan de
        pagos del lote o modelo que te haga sentido.</p></div>
      <div class="paso"><h4>Conoces el desarrollo</h4><p>Recorremos la comunidad para que veas
        amenidades, avance y entorno con tus propios ojos.</p></div>
      <div class="paso"><h4>Apartas y firmas</h4><p>Con toda la información sobre la mesa y sin
        prisa. La asesoría es gratuita de principio a fin.</p></div>
    </div>
  </div>
</section>

<section class="faq" id="faq">
  <div class="wrap">
    <div class="head">
      <div class="kicker">Preguntas frecuentes</div>
      <h2>Lo que más me preguntan</h2>
    </div>
    ${faqs
      .map((f) => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`)
      .join("")}
  </div>
</section>

<section class="cierre">
  <div class="wrap">
    <h2>La asesoría es gratuita y sin compromiso</h2>
    <p class="lead">Cuéntame qué buscas —invertir, construir o asegurar patrimonio— y te muestro
       las opciones que te hacen sentido en la ciudad que te interese.</p>
    <div class="cta-row">
      <a class="btn btn-wa" href="https://wa.me/${telefonoLink}?text=Hola,%20quiero%20asesor%C3%ADa%20sobre%20terrenos">Escríbeme por WhatsApp</a>
      <a class="btn btn-oro" href="tel:+${telefonoLink}">Llámame ahora</a>
    </div>
    <p class="tel">O pregúntale al asistente en el chat de esta página · ${horario}</p>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="foot-top">
      <div>
        <strong>Ciudad Maderas</strong> · Asesor autorizado<br>
        ${horario}
      </div>
      <div>
        <a href="tel:+${telefonoLink}">${telefono}</a> ·
        <a href="https://wa.me/${telefonoLink}">WhatsApp</a>
      </div>
    </div>
    <p class="legal">
      Asesor inmobiliario autorizado para la comercialización de desarrollos de Ciudad Maderas.
      Este sitio es operado por el asesor y no sustituye al sitio oficial de la desarrolladora.
      Los precios mostrados son montos <em>desde</em>, de carácter informativo, y no constituyen
      una oferta vinculante: el precio final depende del lote o modelo, su ubicación y la
      disponibilidad al momento de la cotización. Las condiciones de crédito están sujetas a
      aprobación y a los términos vigentes de la desarrolladora. La plusvalía de un inmueble
      depende del comportamiento del mercado y de la zona; no se garantiza rendimiento alguno.
      Imágenes propiedad de Ciudad Maderas, usadas con fines informativos.
    </p>
  </div>
</footer>

<script src="/widget.js" defer></script>
</body>
</html>`;
