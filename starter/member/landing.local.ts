// member/landing.local.ts — la página pública del asesor.
// Vive en member/ a propósito: `forjabot update` refresca src/ pero NUNCA toca
// esta carpeta, así que los textos y datos de contacto sobreviven las
// actualizaciones del motor.
//
// Se sirve desde el mismo Worker del bot (ruta "/" en src/index.ts), así que el
// chat queda en el mismo origen: sin CORS, sin hosting aparte, sin costo.
//
// ESTRUCTURA: replica la del sitio oficial ciudadmaderas.com — mismo orden de
// secciones, mismos textos de marca, misma paleta (#00263a / #b4a269 / #f3f0e8)
// y mismas tipografías (Montserrat + Sorts Mill Goudy), tomadas de su hoja de
// estilos. Tres cosas se apartan a propósito, y son las que hacen que esta
// página sirva al asesor en vez de al corporativo:
//   1. El teléfono y el WhatsApp son los del asesor, no el 800 ni el 442 de
//      Querétaro — si no, los prospectos de esta página se irían al corporativo.
//   2. El chat es el bot de IA propio, no el widget de agente de Salesforce.
//   3. Se identifica como asesor autorizado y cierra con aviso legal, para no
//      pasar por el sitio oficial de la desarrolladora.
// Del menú original se omiten MIS PAGOS, ESCRITURACIÓN, PAYMENTS, APARTADO,
// MI CUENTA y BOSQUE MEMORIAL: son portales de cliente de la desarrolladora
// (en su propio sitio tampoco tienen enlace) y un asesor no puede prestarlos.
//
// FOTOS: se referencian desde el bucket público de Ciudad Maderas, el mismo que
// usa su sitio oficial. El navegador las trae de ahí — no se redistribuyen
// copias. Cada bloque conserva su color de fondo y el texto nunca depende de
// que la foto exista: si mueven esas rutas, la página se degrada, no se rompe.

export const landingConfig = {
  asesor: "Ciudad Maderas",
  telefono: "686 606 6613",
  telefonoLink: "526866066613",
  horario: "Lunes a domingo · 8:00 a.m. – 6:00 p.m.",
};

const { telefono, telefonoLink, horario } = landingConfig;
const IMG = "https://storage.googleapis.com/landing-ciudad-maderas";

const amenidades = [
  { img: `${IMG}/amenidades/Alberca.jpg`, n: "Albercas" },
  { img: `${IMG}/amenidades/Albercas%20techadas.webp`, n: "Albercas techadas" },
  { img: `${IMG}/amenidades/Cancha%20Pa%CC%81del.webp`, n: "Canchas de Pádel" },
  { img: `${IMG}/amenidades/Cancha%20de%20tenis.webp`, n: "Canchas de tenis" },
  { img: `${IMG}/amenidades/Chapoteadero.webp`, n: "Chapoteaderos" },
];

const ciudades = [
  { img: `${IMG}/desarrollos/Qro.webp`, n: "Querétaro" },
  { img: `${IMG}/desarrollos/Guanajuato.webp`, n: "León" },
  { img: `${IMG}/desarrollos/Me%CC%81rida.webp`, n: "Mérida" },
  { img: `${IMG}/desarrollos/Ags.webp`, n: "Aguascalientes" },
  { img: `${IMG}/desarrollos/Mty.webp`, n: "Monterrey" },
  { img: `${IMG}/desarrollos/SLP.webp`, n: "San Luis Potosí" },
  { img: `${IMG}/desarrollos/Quintana%20Roo.webp`, n: "Cancún" },
  { img: `${IMG}/desarrollos/puebla/puebla.webp`, n: "Puebla" },
];

const fundacion = [
  { img: `${IMG}/fundacion/Arte%20y%20Cultura.webp`, n: "Arte y cultura" },
  { img: `${IMG}/fundacion/Educaci%C3%B3n.webp`, n: "Educación" },
  { img: `${IMG}/fundacion/Mascotas.webp`, n: "Dignidad Animal" },
];

const wa = (t: string) => `https://wa.me/${telefonoLink}?text=${encodeURIComponent(t)}`;

export const landingHtml = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Terrenos y Casas Premium | Ciudad Maderas — Asesor autorizado</title>
<meta name="description" content="Terrenos y casas premium con crédito directo desde 1% de enganche, sin aval y sin revisión de buró. Asesoría personalizada gratis.">
<meta name="theme-color" content="#00263a">
<meta property="og:title" content="Terrenos y Casas Premium | Ciudad Maderas">
<meta property="og:description" content="Crédito directo · Sin aval · Sin revisión de buró · Desde 1% de enganche">
<meta property="og:image" content="${IMG}/casas/casaPremium.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Sorts+Mill+Goudy:ital@0;1&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌳</text></svg>">
<style>
  :root{--azul:#00263a;--azul-2:#0d1f33;--azul-3:#001e2d;--oro:#b4a269;
        --oro-2:#dcce9e;--crema:#f3f0e8;--crema-2:#e9e6dc;--linea:#ddd9ce;
        --texto:#0b2538;--gris:#5a6672}
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:Montserrat,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
       color:var(--texto);line-height:1.6;background:#fff;-webkit-font-smoothing:antialiased}
  img{display:block;max-width:100%}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:1200px;margin:0 auto;padding:0 24px}
  .serif{font-family:"Sorts Mill Goudy",Georgia,serif}

  /* header */
  header{background:var(--azul);color:#fff;position:sticky;top:0;z-index:70}
  header .wrap{display:flex;align-items:center;justify-content:space-between;
               gap:16px;min-height:72px;flex-wrap:wrap}
  .logo{font-weight:800;font-size:17px;letter-spacing:.06em;text-transform:uppercase;line-height:1.1}
  .logo span{display:block;font-weight:400;font-size:9.5px;letter-spacing:.22em;
             color:var(--oro-2);margin-top:3px}
  nav{display:flex;gap:26px;font-size:12px;font-weight:600;letter-spacing:.13em;text-transform:uppercase}
  nav a{opacity:.9}nav a:hover{color:var(--oro-2)}
  @media(max-width:960px){nav{display:none}}
  .btn-nav{border:1px solid var(--oro);color:var(--oro-2);padding:10px 20px;border-radius:3px;
           font-size:11.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap}

  /* hero */
  .hero{position:relative;min-height:min(84vh,660px);display:flex;align-items:flex-end;
        background:var(--azul-3);color:#fff;overflow:hidden}
  .hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
  .hero:after{content:"";position:absolute;inset:0;
    background:linear-gradient(180deg,rgba(0,30,45,.55) 0%,rgba(0,30,45,.1) 40%,rgba(0,30,45,.92) 100%)}
  .hero .wrap{position:relative;z-index:2;padding-bottom:58px;padding-top:70px}
  .hero h1{font-size:clamp(34px,6vw,62px);line-height:1.06;letter-spacing:.01em;font-weight:300;
           text-transform:uppercase;margin-bottom:18px}
  .hero h1 b{display:block;font-weight:800;color:var(--oro-2)}
  .hero p{font-size:clamp(15px,2vw,19px);max-width:54ch;opacity:.93;margin-bottom:28px}
  .cta{display:flex;gap:12px;flex-wrap:wrap}
  .btn{display:inline-block;padding:15px 30px;border-radius:3px;font-weight:700;font-size:13px;
       letter-spacing:.12em;text-transform:uppercase;border:1px solid transparent}
  .btn-oro{background:var(--oro);color:var(--azul)}
  .btn-wa{background:#25D366;color:#05301a}
  .btn-line{border-color:rgba(255,255,255,.55);color:#fff}

  /* somos / cifras */
  .somos{background:var(--azul);color:#fff;padding:58px 0}
  .somos .lbl{font-family:"Sorts Mill Goudy",serif;font-size:26px;color:var(--oro-2);margin-bottom:26px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:26px}
  @media(max-width:820px){.stats{grid-template-columns:repeat(2,1fr);gap:34px}}
  .st b{display:block;font-size:clamp(30px,4.6vw,46px);font-weight:800;color:var(--oro-2);
        line-height:1;letter-spacing:-.02em;margin-bottom:8px}
  .st span{font-size:13.5px;opacity:.88;font-weight:400;display:block}

  /* creadores */
  .creadores{background:var(--crema);text-align:center;padding:70px 0}
  .creadores h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(30px,5.4vw,54px);
                font-weight:400;line-height:1.14;color:var(--azul)}
  .creadores h2 em{font-style:italic;color:var(--oro)}
  .creadores p{margin-top:16px;color:var(--gris);font-size:16.5px}

  /* secciones */
  section{padding:72px 0}
  .kick{font-size:11.5px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;
        color:var(--oro);margin-bottom:12px}
  h2.sec{font-family:"Sorts Mill Goudy",serif;font-size:clamp(27px,4.2vw,42px);font-weight:400;
         line-height:1.16;color:var(--azul);margin-bottom:14px}
  .sub{color:var(--gris);font-size:16.5px;max-width:60ch;margin-bottom:34px}

  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
  .card{position:relative;border-radius:4px;overflow:hidden;background:var(--azul-2);aspect-ratio:4/3}
  .card img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
  .card:hover img{transform:scale(1.06)}
  .card figcaption{position:absolute;inset:auto 0 0 0;padding:30px 16px 14px;color:#fff;
    font-size:14px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    background:linear-gradient(transparent,rgba(0,30,45,.92))}
  .tabs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px}
  .tab{border:1px solid var(--linea);background:var(--crema);border-radius:3px;padding:10px 20px;
       font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--azul)}

  /* casas premium */
  .casas{position:relative;background:var(--azul-3);color:#fff;overflow:hidden;padding:0}
  .casas>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.34}
  .casas:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,30,45,.94),rgba(0,30,45,.55))}
  .casas .wrap{position:relative;z-index:2;padding-top:78px;padding-bottom:78px}
  .desde{display:inline-block;border:1px solid var(--oro);padding:14px 22px;border-radius:3px;
         margin-bottom:26px}
  .desde i{display:block;font-style:normal;font-size:10.5px;letter-spacing:.22em;
           text-transform:uppercase;color:var(--oro-2)}
  .desde b{display:block;font-size:34px;font-weight:800;letter-spacing:-.02em;margin:2px 0}
  .desde s{display:block;text-decoration:none;font-size:10.5px;opacity:.7}
  .casas .tag{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--oro-2);
              font-weight:700;margin-bottom:10px}
  .casas h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(34px,6vw,60px);font-weight:400;
            line-height:1.04;text-transform:uppercase;margin-bottom:16px}
  .casas h2 b{display:block;font-weight:800;color:var(--oro-2)}
  .casas p.big{font-size:clamp(17px,2.3vw,22px);max-width:46ch;margin-bottom:10px}
  .casas p.small{opacity:.82;max-width:52ch;margin-bottom:28px;font-size:15.5px}
  .modelos{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:30px}
  .modelos span{border:1px solid rgba(220,206,158,.45);border-radius:3px;padding:9px 17px;
                font-size:13px;font-weight:600;letter-spacing:.05em}

  /* entorno */
  .entorno{background:var(--crema)}
  .entorno .cols{display:grid;grid-template-columns:1fr 1fr;gap:46px;align-items:center}
  @media(max-width:880px){.entorno .cols{grid-template-columns:1fr;gap:28px}}
  .entorno p{color:var(--gris);font-size:16px;margin-bottom:14px}
  .entorno img{border-radius:4px;width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--azul-2)}

  /* facilidades */
  .facil{background:var(--azul);color:#fff}
  .facil h2.sec{color:#fff}
  .facil .sub{color:rgba(255,255,255,.82)}
  .fgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:30px}
  @media(max-width:880px){.fgrid{grid-template-columns:repeat(2,1fr)}}
  .fitem{border:1px solid rgba(180,162,105,.4);border-radius:3px;padding:22px;
         background:rgba(255,255,255,.05);text-align:center}
  .fitem b{display:block;font-size:13px;font-weight:700;letter-spacing:.11em;
           text-transform:uppercase;color:var(--oro-2)}
  .precio-mes{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
              border-left:3px solid var(--oro);padding-left:20px;margin-bottom:26px}
  .precio-mes i{font-style:normal;font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.8}
  .precio-mes b{font-size:40px;font-weight:800;letter-spacing:-.02em}

  /* contacto */
  .contacto{background:var(--crema);text-align:center}
  .contacto h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(28px,4.4vw,44px);
               font-weight:400;color:var(--azul);line-height:1.15;margin-bottom:14px}
  .contacto p{color:var(--gris);max-width:52ch;margin:0 auto 30px;font-size:16.5px}
  .contacto .cta{justify-content:center}
  .tel-big{margin-top:26px;font-size:15.5px;color:var(--gris)}
  .tel-big a{color:var(--azul);font-weight:800}

  footer{background:var(--azul-3);color:rgba(255,255,255,.72);padding:44px 0;font-size:13.5px}
  .fbar{display:flex;justify-content:space-between;gap:22px;flex-wrap:wrap;padding-bottom:22px;
        border-bottom:1px solid rgba(255,255,255,.13)}
  footer strong{color:#fff}
  footer a{color:var(--oro-2)}
  .legal{margin-top:20px;font-size:11.5px;opacity:.62;line-height:1.65;max-width:100ch}
</style>
</head>
<body>

<header>
  <div class="wrap">
    <div class="logo">Ciudad Maderas<span>Asesor autorizado</span></div>
    <nav>
      <a href="#desarrollos">Desarrollos</a>
      <a href="#casas">Casas Premium</a>
      <a href="#amenidades">Amenidades</a>
      <a href="#facilidades">Facilidades de pago</a>
      <a href="#contacto">Contáctanos</a>
    </nav>
    <a class="btn-nav" href="${wa("Hola, quiero contactar a un asesor")}">Contacta a un asesor</a>
  </div>
</header>

<div class="hero">
  <img src="${IMG}/casas/casaPremium.webp" alt="" decoding="async">
  <div class="wrap">
    <h1>Terrenos y<b>Casas Premium</b></h1>
    <p>Crédito directo con la desarrolladora, sin aval y sin revisión de buró.
       Comunidades planificadas con más de 30 amenidades de lujo.</p>
    <div class="cta">
      <a class="btn btn-wa" href="${wa("Hola, me interesa un terreno")}">Escríbeme por WhatsApp</a>
      <a class="btn btn-line" href="#facilidades">Ver facilidades de pago</a>
    </div>
  </div>
</div>

<div class="somos">
  <div class="wrap">
    <div class="lbl serif">Somos:</div>
    <div class="stats">
      <div class="st"><b>+40</b><span>Años de experiencia en el sector</span></div>
      <div class="st"><b>+124,000</b><span>Lotes habitacionales y comerciales</span></div>
      <div class="st"><b>28</b><span>Desarrollos en toda la república</span></div>
      <div class="st"><b>+30</b><span>Amenidades de lujo en cada desarrollo</span></div>
    </div>
  </div>
</div>

<div class="creadores">
  <div class="wrap">
    <h2>Somos <em>creadores</em><br>de ciudades</h2>
    <p>Nuestra presencia es internacional: 20 ciudades de México y 4 en Estados Unidos,
       con más de 30 desarrollos y 40 oficinas.</p>
  </div>
</div>

<section id="amenidades">
  <div class="wrap">
    <div class="kick">Nuestras principales</div>
    <h2 class="sec">Amenidades</h2>
    <div class="tabs">
      <span class="tab">Casa Club</span><span class="tab">Family Club</span>
      <span class="tab">Club Deportivo</span><span class="tab">Club Acuático</span>
    </div>
    <div class="grid">
      ${amenidades
        .map((a) => `<figure class="card"><img src="${a.img}" alt="${a.n}" loading="lazy"><figcaption>${a.n}</figcaption></figure>`)
        .join("")}
    </div>
    <p class="sub" style="margin-top:20px;margin-bottom:0">El catálogo exacto varía por desarrollo
       y por etapa. Te confirmo cuáles hay —y cuáles ya están construidas— en el que te interese.</p>
  </div>
</section>

<section class="casas" id="casas">
  <img src="${IMG}/casas/casaPremium.webp" alt="" loading="lazy">
  <div class="wrap">
    <div class="desde"><i>Mensualidades desde</i><b>$15,220</b><s>*Aplican restricciones</s></div>
    <div class="tag">Crédito directo · Sin aval · Sin revisión de buró</div>
    <h2>Casas<b>Premium</b></h2>
    <p class="big">El crédito directo más accesible de todo México.</p>
    <p class="small"><strong>Tranquilidad y confianza.</strong> 7 exclusivos modelos para elegir
       tu nuevo hogar. La disponibilidad varía por desarrollo.</p>
    <div class="modelos">
      ${["Alba", "Nova", "Aqua", "Stella", "Lucero", "Antara", "Aura"].map((m) => `<span>${m}</span>`).join("")}
    </div>
    <a class="btn btn-oro" href="${wa("Hola, quiero conocer las casas premium")}">Conócelos</a>
  </div>
</section>

<section id="desarrollos">
  <div class="wrap">
    <div class="kick">Elige el mejor estilo de vida</div>
    <h2 class="sec">Nuestros desarrollos</h2>
    <p class="sub">Si tu ciudad no aparece aquí, pregúntame: tenemos presencia en 20 ciudades
       del país y es probable que haya algo cerca de ti.</p>
    <div class="grid">
      ${ciudades
        .map((c) => `<figure class="card"><img src="${c.img}" alt="Desarrollos en ${c.n}" loading="lazy"><figcaption>${c.n}</figcaption></figure>`)
        .join("")}
    </div>
  </div>
</section>

<section class="entorno">
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="kick">El entorno a tu favor</div>
        <h2 class="sec">Planes urbanos pensados<br>para vivirse</h2>
        <p>En Ciudad Maderas se desarrollan planes urbanos combinando la ciencia clásica
           oriental Kan Yu con técnicas de biofísica aplicada, de manera que calles, avenidas,
           jardines, montañas y lagos se conecten en una gran red.</p>
        <p>Así se genera un flujo constante, dinámico y productivo, enfocado en mejorar
           la calidad de vida de todos los residentes.</p>
      </div>
      <img src="${IMG}/biofisica/biofisica.webp" alt="Planeación urbana" loading="lazy">
    </div>

    <div style="margin-top:56px">
      <h2 class="sec" style="font-size:26px">Fundación Ciudad Maderas</h2>
      <p class="sub">Promueve desarrollo social a través de educación, salud, arte, deporte y
         protección animal, creando impacto humano, inclusión y esperanza.</p>
      <div class="grid">
        ${fundacion
          .map((f) => `<figure class="card"><img src="${f.img}" alt="${f.n}" loading="lazy"><figcaption>${f.n}</figcaption></figure>`)
          .join("")}
      </div>
    </div>
  </div>
</section>

<section class="facil" id="facilidades">
  <div class="wrap">
    <div class="kick">Facilidades de pago</div>
    <h2 class="sec">Tenemos el mejor crédito directo de todo México</h2>
    <p class="sub">No pasa por un banco. Por eso las condiciones son distintas a todo lo que
       ya te dijeron que no.</p>
    <div class="precio-mes">
      <i>Terrenos desde</i><b>$1,244</b><i>al mes · *aplican restricciones</i>
    </div>
    <div class="fgrid">
      <div class="fitem"><b>Crédito directo</b></div>
      <div class="fitem"><b>Sin aval</b></div>
      <div class="fitem"><b>Sin revisión de buró</b></div>
      <div class="fitem"><b>Desde 1% de enganche</b></div>
    </div>
    <a class="btn btn-oro" href="${wa("Hola, quiero saber de cuánto me quedaría la mensualidad")}">Calcular mi mensualidad</a>
  </div>
</section>

<section class="contacto" id="contacto">
  <div class="wrap">
    <h2>Agenda una asesoría<br>personalizada gratis hoy</h2>
    <p>Cuéntame qué buscas —invertir, construir o asegurar patrimonio— y te muestro las
       opciones que te hacen sentido en la ciudad que te interese.</p>
    <div class="cta">
      <a class="btn btn-wa" href="${wa("Hola, quiero agendar una asesoría")}">Escríbeme por WhatsApp</a>
      <a class="btn btn-oro" href="tel:+${telefonoLink}">Llámame ahora</a>
    </div>
    <p class="tel-big">O pregúntale al asistente en el chat de esta página<br>
       <a href="tel:+${telefonoLink}">${telefono}</a> · ${horario}</p>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="fbar">
      <div><strong>Ciudad Maderas</strong> · Asesor autorizado<br>${horario}</div>
      <div><a href="tel:+${telefonoLink}">${telefono}</a> · <a href="https://wa.me/${telefonoLink}">WhatsApp</a></div>
    </div>
    <p class="legal">
      Asesor inmobiliario autorizado para la comercialización de desarrollos de Ciudad Maderas.
      Este sitio es operado por el asesor y no sustituye al sitio oficial de la desarrolladora.
      Los precios mostrados son montos <em>desde</em>, de carácter informativo, y no constituyen
      una oferta vinculante: el precio final depende del lote o modelo, su ubicación y la
      disponibilidad al momento de la cotización. Las condiciones de crédito están sujetas a
      aprobación y a los términos vigentes de la desarrolladora; aplican restricciones. La
      plusvalía de un inmueble depende del comportamiento del mercado y de la zona; no se
      garantiza rendimiento alguno. Imágenes propiedad de Ciudad Maderas, usadas con fines
      informativos.
    </p>
  </div>
</footer>

<script src="/widget.js" defer></script>
</body>
</html>`;
