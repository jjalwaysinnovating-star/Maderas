// member/landing.local.ts — el sitio público del asesor.
// Vive en member/ a propósito: `forjabot update` refresca src/ pero NUNCA toca
// esta carpeta, así que los textos y datos de contacto sobreviven las
// actualizaciones del motor.
//
// Se sirve desde el mismo Worker del bot (ver el registro de rutas en
// src/index.ts), así que el chat queda en el mismo origen: sin CORS, sin
// hosting aparte, sin costo.
//
// ── SOLO TERRENOS ───────────────────────────────────────────────────────────
// El asesor comercializa TERRENOS, no casas. Aquí no hay sección de Casas
// Premium, ni modelos, ni la mensualidad de casa: publicar un producto que no
// se vende trae prospectos que hay que rechazar, y rechazar quema el lead.
//
// ── ESTRUCTURA ──────────────────────────────────────────────────────────────
// Sitio de varias páginas, con la navegación del sitio oficial: Desarrollos,
// Amenidades, Facilidades de pago, Nosotros y Contacto, más una página por
// región bajo /proyectos/<region> — la misma ruta y el mismo encabezado
// ("Eleva tu estilo de vida en …") que usa ciudadmaderas.com.
//
// Las páginas de región NO publican lista de lotes, medidas ni precios
// cerrados. No es un hueco: el sitio oficial tampoco los publica, la
// disponibilidad cambia cada semana y un precio viejo en internet es justo lo
// que hace que un prospecto llegue enojado a la cita. La página lleva a la
// conversación, que es donde el asesor confirma lo que hay hoy.
//
// Del menú original se omiten MIS PAGOS, ESCRITURACIÓN, PAYMENTS, APARTADO,
// MI CUENTA y BOSQUE MEMORIAL: son portales de cliente de la desarrolladora y
// un asesor no puede prestarlos.
//
// Tres cosas se apartan del sitio oficial a propósito, y son las que hacen que
// esta página sirva al asesor en vez de al corporativo:
//   1. El teléfono y el WhatsApp son los del asesor, no el 800 ni el 442 de
//      Querétaro — si no, los prospectos de esta página se irían al corporativo.
//   2. El chat es el bot de IA propio, no el widget de agente de Salesforce.
//   3. Se identifica como asesor autorizado y cierra con aviso legal, para no
//      pasar por el sitio oficial de la desarrolladora.
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

const wa = (t: string) => `https://wa.me/${telefonoLink}?text=${encodeURIComponent(t)}`;

// ── Datos ───────────────────────────────────────────────────────────────────

const amenidades = [
  { img: `${IMG}/amenidades/Alberca.jpg`, n: "Albercas" },
  { img: `${IMG}/amenidades/Albercas%20techadas.webp`, n: "Albercas techadas" },
  { img: `${IMG}/amenidades/Cancha%20Pa%CC%81del.webp`, n: "Canchas de pádel" },
  { img: `${IMG}/amenidades/Cancha%20de%20tenis.webp`, n: "Canchas de tenis" },
  { img: `${IMG}/amenidades/Chapoteadero.webp`, n: "Chapoteaderos" },
];

const fundacion = [
  { img: `${IMG}/fundacion/Arte%20y%20Cultura.webp`, n: "Arte y cultura" },
  { img: `${IMG}/fundacion/Educaci%C3%B3n.webp`, n: "Educación" },
  { img: `${IMG}/fundacion/Mascotas.webp`, n: "Dignidad animal" },
];

// Región = como la nombra el sitio oficial en /proyectos/<slug>. La ciudad es
// como la busca la gente. Las dos aparecen: la región manda en el encabezado,
// la ciudad en la tarjeta.
interface Region {
  slug: string;
  region: string;
  ciudad: string;
  img: string;
  /** Por qué esta plaza, en una línea. Nada de rendimientos ni cifras. */
  nota: string;
}

export const regiones: Region[] = [
  {
    slug: "queretaro",
    region: "Querétaro",
    ciudad: "Querétaro",
    img: `${IMG}/desarrollos/Qro.webp`,
    nota: "La plaza donde nació Ciudad Maderas y donde más desarrollos tiene. Corredor industrial y crecimiento urbano sostenido.",
  },
  {
    slug: "guanajuato",
    region: "Guanajuato",
    ciudad: "León",
    img: `${IMG}/desarrollos/Guanajuato.webp`,
    nota: "El Bajío, con León como centro económico y una de las zonas industriales más activas del país.",
  },
  {
    slug: "yucatan",
    region: "Península",
    ciudad: "Mérida",
    img: `${IMG}/desarrollos/Me%CC%81rida.webp`,
    nota: "Mérida y su zona conurbada: de las ciudades más seguras de México y con fuerte llegada de gente de otros estados.",
  },
  {
    slug: "quintana-roo",
    region: "Caribe",
    ciudad: "Cancún",
    img: `${IMG}/desarrollos/Quintana%20Roo.webp`,
    nota: "Cancún y la Riviera Maya, con demanda de vivienda empujada por el turismo y el Tren Maya.",
  },
  {
    slug: "nuevo-leon",
    region: "Nuevo León",
    ciudad: "Monterrey",
    img: `${IMG}/desarrollos/Mty.webp`,
    nota: "Zona metropolitana de Monterrey, el polo industrial más fuerte del norte del país.",
  },
  {
    slug: "aguascalientes",
    region: "Aguascalientes",
    ciudad: "Aguascalientes",
    img: `${IMG}/desarrollos/Ags.webp`,
    nota: "Ciudad compacta y ordenada, con industria automotriz consolidada y buena calidad de vida.",
  },
  {
    slug: "san-luis-potosi",
    region: "San Luis Potosí",
    ciudad: "San Luis Potosí",
    img: `${IMG}/desarrollos/SLP.webp`,
    nota: "Cruce logístico del país y sede de plantas armadoras: mucha gente llegando por trabajo.",
  },
  {
    slug: "puebla",
    region: "Puebla",
    ciudad: "Puebla",
    img: `${IMG}/desarrollos/puebla/puebla.webp`,
    nota: "Una de las áreas metropolitanas más grandes de México, a hora y media de la Ciudad de México.",
  },
];

// ── Cascarón ────────────────────────────────────────────────────────────────

const NAV = [
  { href: "/desarrollos", t: "Desarrollos", k: "desarrollos" },
  { href: "/amenidades", t: "Amenidades", k: "amenidades" },
  { href: "/facilidades-de-pago", t: "Facilidades de pago", k: "facilidades" },
  { href: "/nosotros", t: "Nosotros", k: "nosotros" },
  { href: "/contacto", t: "Contáctanos", k: "contacto" },
];

const CSS = `
  :root{--azul:#00263a;--azul-2:#0d1f33;--azul-3:#001e2d;--oro:#b4a269;
        --oro-2:#dcce9e;--crema:#f3f0e8;--crema-2:#e9e6dc;--linea:#ddd9ce;
        --texto:#0b2538;--gris:#5a6672}
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:Montserrat,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
       color:var(--texto);line-height:1.6;background:#fff;-webkit-font-smoothing:antialiased}
  img{display:block;max-width:100%}
  a{color:inherit;text-decoration:none}
  :focus-visible{outline:2px solid var(--oro);outline-offset:3px}
  .wrap{max-width:1200px;margin:0 auto;padding:0 24px}
  .serif{font-family:"Sorts Mill Goudy",Georgia,serif}

  /* header + menú móvil (checkbox, sin JS) */
  header{background:var(--azul);color:#fff;position:sticky;top:0;z-index:70}
  header .wrap{display:flex;align-items:center;justify-content:space-between;
               gap:16px;min-height:72px}
  .logo{font-weight:800;font-size:17px;letter-spacing:.06em;text-transform:uppercase;line-height:1.1}
  .logo span{display:block;font-weight:400;font-size:9.5px;letter-spacing:.22em;
             color:var(--oro-2);margin-top:3px}
  nav{display:flex;gap:26px;font-size:12px;font-weight:600;letter-spacing:.13em;text-transform:uppercase}
  nav a{opacity:.9}nav a:hover,nav a.on{color:var(--oro-2);opacity:1}
  nav a.on{border-bottom:1px solid var(--oro)}
  .btn-nav{border:1px solid var(--oro);color:var(--oro-2);padding:10px 20px;border-radius:3px;
           font-size:11.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap}
  #mnu{display:none}
  .burger{display:none;cursor:pointer;padding:8px;margin:-8px}
  .burger span{display:block;width:24px;height:2px;background:#fff;margin:5px 0}
  @media(max-width:980px){
    .burger{display:block}
    header .wrap>nav,header .wrap>.btn-nav{display:none}
    #mnu:checked~.wrap nav{display:flex;position:absolute;top:72px;left:0;right:0;
      flex-direction:column;gap:0;background:var(--azul-3);padding:8px 24px 20px;
      border-top:1px solid rgba(255,255,255,.12)}
    #mnu:checked~.wrap nav a{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.09)}
    #mnu:checked~.wrap .btn-nav{display:block;position:absolute;top:100%;left:24px;right:24px;
      text-align:center;margin-top:-14px;transform:translateY(-6px)}
  }

  /* hero */
  .hero{position:relative;display:flex;align-items:flex-end;
        background:var(--azul-3);color:#fff;overflow:hidden;min-height:min(78vh,600px)}
  .hero.tall{min-height:min(84vh,660px)}
  .hero.short{min-height:min(52vh,400px)}
  .hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
  .hero:after{content:"";position:absolute;inset:0;
    background:linear-gradient(180deg,rgba(0,30,45,.55) 0%,rgba(0,30,45,.1) 40%,rgba(0,30,45,.92) 100%)}
  .hero .wrap{position:relative;z-index:2;padding-bottom:52px;padding-top:64px}
  .hero h1{font-size:clamp(32px,5.6vw,58px);line-height:1.06;letter-spacing:.01em;font-weight:300;
           text-transform:uppercase;margin-bottom:18px;text-wrap:balance}
  .hero h1 b{display:block;font-weight:800;color:var(--oro-2)}
  .hero p{font-size:clamp(15px,2vw,19px);max-width:54ch;opacity:.93;margin-bottom:28px}
  .miga{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--oro-2);
        margin-bottom:14px;opacity:.9}
  .cta{display:flex;gap:12px;flex-wrap:wrap}
  .btn{display:inline-block;padding:15px 30px;border-radius:3px;font-weight:700;font-size:13px;
       letter-spacing:.12em;text-transform:uppercase;border:1px solid transparent;cursor:pointer}
  .btn-oro{background:var(--oro);color:var(--azul)}
  .btn-wa{background:#25D366;color:#05301a}
  .btn-line{border-color:rgba(255,255,255,.55);color:#fff}

  /* bloques */
  .somos{background:var(--azul);color:#fff;padding:58px 0}
  .somos .lbl{font-family:"Sorts Mill Goudy",serif;font-size:26px;color:var(--oro-2);margin-bottom:26px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:26px}
  @media(max-width:820px){.stats{grid-template-columns:repeat(2,1fr);gap:34px}}
  .st b{display:block;font-size:clamp(28px,4.4vw,44px);font-weight:800;color:var(--oro-2);
        line-height:1;letter-spacing:-.02em;margin-bottom:8px;font-variant-numeric:tabular-nums}
  .st span{font-size:13.5px;opacity:.88;font-weight:400;display:block}

  .creadores{background:var(--crema);text-align:center;padding:70px 0}
  .creadores h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(30px,5.4vw,54px);
                font-weight:400;line-height:1.14;color:var(--azul);text-wrap:balance}
  .creadores h2 em{font-style:italic;color:var(--oro)}
  .creadores p{margin-top:16px;color:var(--gris);font-size:16.5px;max-width:62ch;margin-inline:auto}

  section{padding:72px 0}
  .kick{font-size:11.5px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;
        color:var(--oro);margin-bottom:12px}
  h2.sec{font-family:"Sorts Mill Goudy",serif;font-size:clamp(27px,4.2vw,42px);font-weight:400;
         line-height:1.16;color:var(--azul);margin-bottom:14px;text-wrap:balance}
  .sub{color:var(--gris);font-size:16.5px;max-width:62ch;margin-bottom:34px}

  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
  .card{position:relative;border-radius:4px;overflow:hidden;background:var(--azul-2);aspect-ratio:4/3}
  .card img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
  .card:hover img{transform:scale(1.06)}
  .card figcaption{position:absolute;inset:auto 0 0 0;padding:30px 16px 14px;color:#fff;
    font-size:14px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    background:linear-gradient(transparent,rgba(0,30,45,.92))}
  .card figcaption i{display:block;font-style:normal;font-size:10.5px;letter-spacing:.16em;
    color:var(--oro-2);font-weight:700;margin-bottom:3px}
  @media(prefers-reduced-motion:reduce){.card img{transition:none}.card:hover img{transform:none}}
  .tabs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px}
  .tab{border:1px solid var(--linea);background:var(--crema);border-radius:3px;padding:10px 20px;
       font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--azul)}

  .entorno{background:var(--crema)}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:46px;align-items:center}
  @media(max-width:880px){.cols{grid-template-columns:1fr;gap:28px}}
  .entorno p{color:var(--gris);font-size:16px;margin-bottom:14px}
  .entorno img{border-radius:4px;width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--azul-2)}

  .facil{background:var(--azul);color:#fff}
  .facil h2.sec{color:#fff}
  .facil .sub{color:rgba(255,255,255,.82)}
  .fgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:30px}
  @media(max-width:880px){.fgrid{grid-template-columns:repeat(2,1fr)}}
  .fitem{border:1px solid rgba(180,162,105,.4);border-radius:3px;padding:22px;
         background:rgba(255,255,255,.05);text-align:center}
  .fitem b{display:block;font-size:13px;font-weight:700;letter-spacing:.11em;
           text-transform:uppercase;color:var(--oro-2)}
  .fitem span{display:block;font-size:12.5px;opacity:.8;margin-top:6px;letter-spacing:0;
              text-transform:none;font-weight:400;line-height:1.45}
  .precio-mes{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
              border-left:3px solid var(--oro);padding-left:20px;margin-bottom:26px}
  .precio-mes i{font-style:normal;font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.8}
  .precio-mes b{font-size:clamp(30px,5vw,40px);font-weight:800;letter-spacing:-.02em;
                font-variant-numeric:tabular-nums}

  .pasos{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;counter-reset:p}
  @media(max-width:880px){.pasos{grid-template-columns:1fr}}
  .paso{border-top:2px solid var(--oro);padding-top:16px;counter-increment:p}
  .paso b{display:block;font-size:14.5px;color:var(--azul);margin-bottom:6px}
  .paso b:before{content:counter(p) ". ";color:var(--oro);font-weight:800}
  .paso span{font-size:14.5px;color:var(--gris);display:block}

  /* preguntas */
  .faq{border-top:1px solid var(--linea)}
  .faq summary{cursor:pointer;padding:20px 0;font-weight:600;font-size:15.5px;color:var(--azul);
               list-style:none;display:flex;justify-content:space-between;gap:18px;align-items:center}
  .faq summary::-webkit-details-marker{display:none}
  .faq summary:after{content:"+";color:var(--oro);font-size:22px;font-weight:400;line-height:1}
  .faq[open] summary:after{content:"–"}
  .faq p{padding-bottom:20px;color:var(--gris);font-size:15px;max-width:70ch}

  /* formulario */
  .form{background:#fff;border:1px solid var(--linea);border-radius:4px;padding:28px}
  .form h3{font-family:"Sorts Mill Goudy",serif;font-size:24px;font-weight:400;color:var(--azul);
           margin-bottom:6px}
  .form .hint{font-size:13.5px;color:var(--gris);margin-bottom:22px}
  .campo{margin-bottom:16px}
  .campo label{display:block;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;
               font-weight:700;color:var(--azul);margin-bottom:7px}
  .campo input,.campo select{width:100%;border:1px solid var(--linea);border-radius:3px;
    padding:13px 14px;font-family:inherit;font-size:15px;color:var(--texto);background:#fff}
  .campo input:focus,.campo select:focus{border-color:var(--oro);outline:none}
  .form .btn{width:100%;border:none}
  .form .aviso{font-size:11.5px;color:var(--gris);margin-top:14px;line-height:1.55}
  .trampa{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}

  .contacto{background:var(--crema)}
  .contacto h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(28px,4.4vw,44px);
               font-weight:400;color:var(--azul);line-height:1.15;margin-bottom:14px;text-wrap:balance}
  .contacto p{color:var(--gris);max-width:52ch;font-size:16.5px}
  .tel-big{margin-top:26px;font-size:15.5px;color:var(--gris)}
  .tel-big a{color:var(--azul);font-weight:800}

  footer{background:var(--azul-3);color:rgba(255,255,255,.72);padding:44px 0;font-size:13.5px}
  .fbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:26px;
        padding-bottom:22px;border-bottom:1px solid rgba(255,255,255,.13)}
  .fbar h4{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--oro-2);
           margin-bottom:10px;font-weight:700}
  .fbar a{display:block;padding:3px 0}
  footer strong{color:#fff}
  footer a:hover{color:var(--oro-2)}
  .legal{margin-top:20px;font-size:11.5px;opacity:.62;line-height:1.65;max-width:100ch}
`;

interface Pagina {
  titulo: string;
  desc: string;
  activo?: string;
  cuerpo: string;
}

function shell({ titulo, desc, activo, cuerpo }: Pagina): string {
  const nav = NAV.map(
    (n) => `<a href="${n.href}"${n.k === activo ? ' class="on" aria-current="page"' : ""}>${n.t}</a>`,
  ).join("");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#00263a">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${IMG}/desarrollos/SLP.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Sorts+Mill+Goudy:ital@0;1&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌳</text></svg>">
<style>${CSS}</style>
</head>
<body>

<header>
  <input type="checkbox" id="mnu" hidden>
  <div class="wrap">
    <a href="/" class="logo">Ciudad Maderas<span>Asesor autorizado</span></a>
    <nav>${nav}</nav>
    <a class="btn-nav" href="${wa("Hola, quiero contactar a un asesor")}">Contacta a un asesor</a>
    <label class="burger" for="mnu" aria-label="Abrir menú"><span></span><span></span><span></span></label>
  </div>
</header>

${cuerpo}

<footer>
  <div class="wrap">
    <div class="fbar">
      <div>
        <strong>Ciudad Maderas</strong> · Asesor autorizado<br>
        ${horario}<br>
        <a href="tel:+${telefonoLink}">${telefono}</a> ·
        <a href="https://wa.me/${telefonoLink}">WhatsApp</a>
      </div>
      <div>
        <h4>Explora</h4>
        ${NAV.map((n) => `<a href="${n.href}">${n.t}</a>`).join("")}
      </div>
      <div>
        <h4>Regiones</h4>
        ${regiones.slice(0, 4).map((r) => `<a href="/proyectos/${r.slug}">${r.ciudad}</a>`).join("")}
      </div>
      <div>
        <h4>&nbsp;</h4>
        ${regiones.slice(4).map((r) => `<a href="/proyectos/${r.slug}">${r.ciudad}</a>`).join("")}
      </div>
    </div>
    <p class="legal">
      Asesor inmobiliario autorizado para la comercialización de desarrollos de Ciudad Maderas.
      Este sitio es operado por el asesor y no sustituye al sitio oficial de la desarrolladora.
      Los precios mostrados son montos <em>desde</em>, de carácter informativo, y no constituyen
      una oferta vinculante: el precio final depende del lote, su ubicación, su superficie y la
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
}

// ── Piezas que se repiten ───────────────────────────────────────────────────

const bloqueStats = `
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
</div>`;

const bloqueFacilidades = `
<section class="facil">
  <div class="wrap">
    <div class="kick">Facilidades de pago</div>
    <h2 class="sec">El mejor crédito directo de todo México</h2>
    <p class="sub">No pasa por un banco. Por eso las condiciones son distintas a todo lo que
       ya te dijeron que no.</p>
    <div class="precio-mes">
      <i>Terrenos desde</i><b>$1,244</b><i>al mes · aplican restricciones</i>
    </div>
    <div class="fgrid">
      <div class="fitem"><b>Crédito directo</b><span>Con la desarrolladora, sin intermediarios</span></div>
      <div class="fitem"><b>Sin aval</b><span>No necesitas que alguien más firme por ti</span></div>
      <div class="fitem"><b>Sin buró</b><span>No se revisa tu historial crediticio</span></div>
      <div class="fitem"><b>Desde 1%</b><span>De enganche para apartar tu terreno</span></div>
    </div>
    <a class="btn btn-oro" href="/contacto">Quiero mi cotización</a>
  </div>
</section>`;

function bloqueContacto(texto: string): string {
  return `
<section class="contacto">
  <div class="wrap">
    <div class="cols">
      <div>
        <h2>Agenda una asesoría<br>personalizada gratis</h2>
        <p>${texto}</p>
        <div class="cta" style="margin-top:26px">
          <a class="btn btn-wa" href="${wa("Hola, quiero agendar una asesoría")}">Escríbeme por WhatsApp</a>
          <a class="btn btn-oro" href="tel:+${telefonoLink}">Llámame ahora</a>
        </div>
        <p class="tel-big">O pregúntale al asistente en el chat de esta página<br>
           <a href="tel:+${telefonoLink}">${telefono}</a> · ${horario}</p>
      </div>
      ${formulario}
    </div>
  </div>
</section>`;
}

// Formulario de contacto. Mismos campos que el del sitio oficial, menos el
// selector de casa/terreno: aquí todo es terreno. `trampa` es un campo cebo
// invisible — los bots de spam lo llenan, las personas no; el Worker descarta
// el envío si viene con algo (ver src/index.ts).
const formulario = `
<form class="form" method="POST" action="/contacto">
  <h3>Déjame tus datos</h3>
  <p class="hint">Te contesto yo, no un conmutador. Dentro del horario, normalmente el mismo día.</p>
  <div class="campo trampa" aria-hidden="true">
    <label for="apellido2">No llenar</label>
    <input type="text" id="apellido2" name="apellido2" tabindex="-1" autocomplete="off">
  </div>
  <div class="campo">
    <label for="f-nombre">Nombre</label>
    <input type="text" id="f-nombre" name="nombre" required autocomplete="name" placeholder="Tu nombre">
  </div>
  <div class="campo">
    <label for="f-tel">Teléfono / WhatsApp</label>
    <input type="tel" id="f-tel" name="telefono" required autocomplete="tel" placeholder="10 dígitos">
  </div>
  <div class="campo">
    <label for="f-mail">Correo <span style="opacity:.55;letter-spacing:0;text-transform:none;font-weight:400">(opcional)</span></label>
    <input type="email" id="f-mail" name="email" autocomplete="email" placeholder="tucorreo@ejemplo.com">
  </div>
  <div class="campo">
    <label for="f-region">Desarrollo de interés</label>
    <select id="f-region" name="region">
      <option value="">Selecciona la ciudad</option>
      ${regiones.map((r) => `<option value="${r.ciudad}">${r.ciudad}</option>`).join("")}
      <option value="Otra">Otra / no sé todavía</option>
    </select>
  </div>
  <div class="campo">
    <label for="f-uso">¿Para qué lo buscas?</label>
    <select id="f-uso" name="uso">
      <option value="">Selecciona una opción</option>
      <option value="Inversión">Invertir</option>
      <option value="Construir">Construir mi casa</option>
      <option value="Patrimonio">Asegurar patrimonio</option>
      <option value="Comercial">Terreno comercial</option>
      <option value="No sé">Todavía no lo decido</option>
    </select>
  </div>
  <button class="btn btn-oro" type="submit">Quiero que me contacten</button>
  <p class="aviso">Al enviar aceptas que te contacte por teléfono, WhatsApp o correo para
     darte información. No comparto tus datos con terceros ni te mando publicidad masiva.</p>
</form>`;

// ── Páginas ─────────────────────────────────────────────────────────────────

const inicio = shell({
  titulo: "Terrenos Premium | Ciudad Maderas — Asesor autorizado",
  desc:
    "Terrenos en comunidades planificadas con crédito directo desde 1% de enganche, " +
    "sin aval y sin revisión de buró. Asesoría personalizada gratis.",
  cuerpo: `
<div class="hero tall">
  <img src="${IMG}/desarrollos/SLP.webp" alt="" decoding="async">
  <div class="wrap">
    <h1>Terrenos<b>Premium</b></h1>
    <p>Crédito directo con la desarrolladora, sin aval y sin revisión de buró.
       Comunidades planificadas con más de 30 amenidades de lujo.</p>
    <div class="cta">
      <a class="btn btn-wa" href="${wa("Hola, me interesa un terreno")}">Escríbeme por WhatsApp</a>
      <a class="btn btn-line" href="/facilidades-de-pago">Ver facilidades de pago</a>
    </div>
  </div>
</div>

${bloqueStats}

<div class="creadores">
  <div class="wrap">
    <h2>Somos <em>creadores</em><br>de ciudades</h2>
    <p>Nuestra presencia es internacional: 20 ciudades de México y 4 en Estados Unidos,
       con más de 30 desarrollos y 40 oficinas.</p>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="kick">Elige el mejor estilo de vida</div>
    <h2 class="sec">Nuestros desarrollos</h2>
    <p class="sub">Terrenos habitacionales y comerciales dentro de comunidades cerradas.
       Toca tu ciudad para ver de qué se trata.</p>
    <div class="grid">
      ${regiones
        .slice(0, 4)
        .map(
          (r) => `<a class="card" href="/proyectos/${r.slug}">
            <img src="${r.img}" alt="Terrenos en ${r.ciudad}" loading="lazy">
            <figcaption><i>${r.region}</i>${r.ciudad}</figcaption>
          </a>`,
        )
        .join("")}
    </div>
    <div class="cta" style="margin-top:24px">
      <a class="btn btn-oro" href="/desarrollos">Ver las 8 ciudades</a>
    </div>
  </div>
</section>

<section style="background:var(--crema)">
  <div class="wrap">
    <div class="kick">Nuestras principales</div>
    <h2 class="sec">Amenidades</h2>
    <p class="sub">Un terreno dentro de una comunidad planificada, no un lote suelto en medio
       de la nada. Eso es lo que cambia cómo se vive —y cómo se revalora— con el tiempo.</p>
    <div class="grid">
      ${amenidades
        .slice(0, 4)
        .map((a) => `<figure class="card"><img src="${a.img}" alt="${a.n}" loading="lazy"><figcaption>${a.n}</figcaption></figure>`)
        .join("")}
    </div>
    <div class="cta" style="margin-top:24px">
      <a class="btn btn-oro" href="/amenidades">Ver todas las amenidades</a>
    </div>
  </div>
</section>

${bloqueFacilidades}
${bloqueContacto(
  "Cuéntame qué buscas —invertir, construir o asegurar patrimonio— y te muestro las opciones que te hacen sentido en la ciudad que te interese.",
)}`,
});

const desarrollos = shell({
  titulo: "Desarrollos | Ciudad Maderas — Asesor autorizado",
  activo: "desarrollos",
  desc:
    "Terrenos Ciudad Maderas en Querétaro, León, Mérida, Cancún, Monterrey, " +
    "Aguascalientes, San Luis Potosí y Puebla.",
  cuerpo: `
<div class="hero short">
  <img src="${IMG}/desarrollos/Mty.webp" alt="" decoding="async">
  <div class="wrap">
    <div class="miga">Inicio · Desarrollos</div>
    <h1>Nuestros<b>desarrollos</b></h1>
    <p>28 desarrollos en 20 ciudades de México. Estas son las plazas donde te puedo atender.</p>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="kick">Elige el mejor estilo de vida</div>
    <h2 class="sec">Ocho ciudades, un mismo crédito</h2>
    <p class="sub">Si tu ciudad no aparece aquí, pregúntame de todos modos: hay presencia en
       20 ciudades del país y es probable que haya algo cerca de ti.</p>
    <div class="grid">
      ${regiones
        .map(
          (r) => `<a class="card" href="/proyectos/${r.slug}">
            <img src="${r.img}" alt="Terrenos en ${r.ciudad}" loading="lazy">
            <figcaption><i>${r.region}</i>${r.ciudad}</figcaption>
          </a>`,
        )
        .join("")}
    </div>
  </div>
</section>

${bloqueFacilidades}
${bloqueContacto(
  "Dime qué ciudad te interesa y te digo qué etapas están abiertas hoy, con qué superficies y desde cuánto sale la mensualidad.",
)}`,
});

function paginaRegion(r: Region): string {
  const otras = regiones.filter((o) => o.slug !== r.slug).slice(0, 4);
  return shell({
    titulo: `Terrenos en ${r.ciudad} | Ciudad Maderas — Asesor autorizado`,
    activo: "desarrollos",
    desc: `Terrenos Ciudad Maderas en ${r.ciudad}. Crédito directo desde 1% de enganche, sin aval y sin revisión de buró.`,
    cuerpo: `
<div class="hero">
  <img src="${r.img}" alt="" decoding="async">
  <div class="wrap">
    <div class="miga"><a href="/desarrollos">Desarrollos</a> · ${r.region}</div>
    <h1>Eleva tu estilo<br>de vida en<b>${r.region}</b></h1>
    <p>${r.nota}</p>
    <div class="cta">
      <a class="btn btn-wa" href="${wa(`Hola, me interesan los terrenos en ${r.ciudad}`)}">Preguntar por ${r.ciudad}</a>
      <a class="btn btn-line" href="/contacto">Pedir cotización</a>
    </div>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="kick">${r.ciudad}</div>
        <h2 class="sec">Qué te puedo conseguir aquí</h2>
        <p class="sub" style="margin-bottom:22px">Terrenos habitacionales y comerciales dentro de
           comunidades cerradas, con urbanización completa, accesos controlados y amenidades.
           Todos con el mismo crédito directo: desde 1% de enganche, sin aval y sin buró.</p>
        <p class="sub">
          <strong>Las etapas y las superficies disponibles cambian seguido</strong>, y por eso no
          las publico aquí: un precio viejo en internet no le sirve a nadie. Escríbeme y te paso
          lo que hay hoy en ${r.ciudad}, con la mensualidad exacta según el lote.
        </p>
        <div class="cta">
          <a class="btn btn-oro" href="/contacto">Ver disponibilidad de hoy</a>
        </div>
      </div>
      <img src="${r.img}" alt="Desarrollo en ${r.ciudad}" loading="lazy"
           style="border-radius:4px;width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--azul-2)">
    </div>
  </div>
</section>

${bloqueFacilidades}

<section style="background:var(--crema)">
  <div class="wrap">
    <div class="kick">Otras plazas</div>
    <h2 class="sec">¿Buscabas en otra ciudad?</h2>
    <div class="grid">
      ${otras
        .map(
          (o) => `<a class="card" href="/proyectos/${o.slug}">
            <img src="${o.img}" alt="Terrenos en ${o.ciudad}" loading="lazy">
            <figcaption><i>${o.region}</i>${o.ciudad}</figcaption>
          </a>`,
        )
        .join("")}
    </div>
  </div>
</section>

${bloqueContacto(`Dime qué superficie andas buscando en ${r.ciudad} y para qué la quieres, y te armo la opción que te hace sentido.`)}`,
  });
}

const amenidadesPag = shell({
  titulo: "Amenidades | Ciudad Maderas — Asesor autorizado",
  activo: "amenidades",
  desc: "Más de 30 amenidades de lujo en las comunidades de Ciudad Maderas: casa club, albercas, canchas y áreas verdes.",
  cuerpo: `
<div class="hero short">
  <img src="${IMG}/amenidades/Alberca.jpg" alt="" decoding="async">
  <div class="wrap">
    <div class="miga">Inicio · Amenidades</div>
    <h1>Más de 30<b>amenidades</b></h1>
    <p>Lo que hace que un terreno dentro de la comunidad no se compare con un lote suelto.</p>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="kick">Nuestras principales</div>
    <h2 class="sec">Cuatro clubes dentro de tu comunidad</h2>
    <div class="tabs">
      <span class="tab">Casa Club</span><span class="tab">Family Club</span>
      <span class="tab">Club Deportivo</span><span class="tab">Club Acuático</span>
    </div>
    <div class="grid">
      ${amenidades
        .map((a) => `<figure class="card"><img src="${a.img}" alt="${a.n}" loading="lazy"><figcaption>${a.n}</figcaption></figure>`)
        .join("")}
    </div>
    <p class="sub" style="margin-top:26px;margin-bottom:0">
      <strong>El catálogo exacto varía por desarrollo y por etapa</strong>, y no todas están
      construidas desde el primer día. Pregúntame por el desarrollo que te interesa y te digo
      cuáles ya existen y cuáles están proyectadas — sin adornos.
    </p>
  </div>
</section>

${bloqueContacto("Dime qué desarrollo te interesa y te mando el plano de amenidades y el estado real de cada una.")}`,
});

const facilidades = shell({
  titulo: "Facilidades de pago | Ciudad Maderas — Asesor autorizado",
  activo: "facilidades",
  desc: "Crédito directo con la desarrolladora: desde 1% de enganche, sin aval y sin revisión de buró. Terrenos desde $1,244 al mes.",
  cuerpo: `
<div class="hero short">
  <img src="${IMG}/desarrollos/Ags.webp" alt="" decoding="async">
  <div class="wrap">
    <div class="miga">Inicio · Facilidades de pago</div>
    <h1>Crédito<b>directo</b></h1>
    <p>Sin banco de por medio. Por eso pasa gente que en otro lado ya oyó que no.</p>
  </div>
</div>

${bloqueFacilidades}

<section>
  <div class="wrap">
    <div class="kick">Sin sorpresas</div>
    <h2 class="sec">Cómo funciona, paso a paso</h2>
    <p class="sub">Son cuatro momentos. Ninguno pide que pagues nada por el chat ni por esta página.</p>
    <div class="pasos">
      <div class="paso"><b>Platicamos</b><span>Me dices qué ciudad, qué superficie y para qué lo quieres. Sin compromiso.</span></div>
      <div class="paso"><b>Te cotizo</b><span>Te paso los lotes disponibles hoy con el enganche y la mensualidad de cada uno.</span></div>
      <div class="paso"><b>Apartas</b><span>Con el enganche se aparta el lote a tu nombre y se firma el contrato.</span></div>
      <div class="paso"><b>Pagas y escrituras</b><span>Mensualidades directo con la desarrolladora hasta liquidar y escriturar.</span></div>
    </div>
  </div>
</section>

<section style="background:var(--crema)">
  <div class="wrap">
    <div class="kick">Lo que más me preguntan</div>
    <h2 class="sec">Preguntas frecuentes</h2>
    <div style="max-width:80ch">
      <details class="faq"><summary>¿De verdad no revisan buró de crédito?</summary>
        <p>Correcto: el crédito es directo con la desarrolladora, no pasa por un banco, así que
           no se consulta tu historial crediticio ni necesitas aval. Las condiciones sí están
           sujetas a aprobación y a los términos vigentes.</p></details>
      <details class="faq"><summary>¿Cuánto necesito para empezar?</summary>
        <p>El enganche arranca desde el 1% del valor del terreno. El monto exacto depende del
           lote, de su superficie y del plazo que elijas; te lo confirmo en la cotización.</p></details>
      <details class="faq"><summary>¿La mensualidad de $1,244 es real?</summary>
        <p>Es un monto <em>desde</em>: existe, pero corresponde a lotes y plazos específicos y
           aplican restricciones. Dime qué buscas y te doy el número que te tocaría a ti, no el
           del anuncio.</p></details>
      <details class="faq"><summary>¿El terreno sube de valor?</summary>
        <p>Son zonas de alto crecimiento urbano y con fuerte potencial de plusvalía, pero la
           plusvalía depende del mercado y de la zona: nadie serio te puede garantizar un
           rendimiento, y yo no lo voy a hacer.</p></details>
      <details class="faq"><summary>¿Se puede escriturar antes de liquidar?</summary>
        <p>La escrituración ocurre al liquidar el terreno. Los tiempos y requisitos los maneja
           la desarrolladora; te acompaño en el trámite.</p></details>
      <details class="faq"><summary>¿Puedo pagar de contado?</summary>
        <p>Sí, y normalmente hay mejores condiciones que a plazos. También se acepta
           transferencia bancaria. Nunca pagos por chat ni datos de tarjeta por mensaje.</p></details>
    </div>
  </div>
</section>

${bloqueContacto("Dime tu presupuesto mensual y la ciudad, y te digo con qué terreno alcanzas hoy.")}`,
});

const nosotros = shell({
  titulo: "Nosotros | Ciudad Maderas — Asesor autorizado",
  activo: "nosotros",
  desc: "Más de 40 años creando ciudades: planeación urbana con Kan Yu y biofísica aplicada, y la Fundación Ciudad Maderas.",
  cuerpo: `
<div class="hero short">
  <img src="${IMG}/biofisica/biofisica.webp" alt="" decoding="async">
  <div class="wrap">
    <div class="miga">Inicio · Nosotros</div>
    <h1>Creadores<b>de ciudades</b></h1>
    <p>Más de 40 años, 28 desarrollos y +124,000 lotes entregados en toda la república.</p>
  </div>
</div>

${bloqueStats}

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

    <div style="margin-top:60px">
      <div class="kick">Impacto social</div>
      <h2 class="sec" style="font-size:clamp(24px,3.4vw,32px)">Fundación Ciudad Maderas</h2>
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

<section>
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="kick">Quién te atiende</div>
        <h2 class="sec">Tu asesor</h2>
        <p class="sub">Soy asesor inmobiliario <strong>autorizado</strong> para comercializar los
           desarrollos de Ciudad Maderas. No soy la desarrolladora: soy con quien vas a tratar
           desde la primera pregunta hasta la firma, y quien te contesta el teléfono después.</p>
        <p class="sub" style="margin-bottom:0">Atiendo ${horario.toLowerCase()}.
           Puedes escribirme por WhatsApp, llamarme, o preguntarle al asistente del chat de esta
           página a cualquier hora —él me pasa el recado.</p>
      </div>
      ${formulario}
    </div>
  </div>
</section>`,
});

const contacto = shell({
  titulo: "Contacto | Ciudad Maderas — Asesor autorizado",
  activo: "contacto",
  desc: `Habla con un asesor autorizado de Ciudad Maderas. ${telefono} · ${horario}`,
  cuerpo: `
<div class="hero short">
  <img src="${IMG}/desarrollos/Quintana%20Roo.webp" alt="" decoding="async">
  <div class="wrap">
    <div class="miga">Inicio · Contáctanos</div>
    <h1>Hablemos de<b>tu terreno</b></h1>
    <p>Asesoría personalizada, gratis y sin compromiso.</p>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="kick">Tres formas de llegarme</div>
        <h2 class="sec">Como te acomode</h2>
        <p class="sub">Contesto yo, no un conmutador ni un call center. Dentro del horario,
           normalmente el mismo día.</p>
        <div class="cta" style="margin-bottom:26px">
          <a class="btn btn-wa" href="${wa("Hola, quiero información de terrenos")}">WhatsApp</a>
          <a class="btn btn-oro" href="tel:+${telefonoLink}">Llamar</a>
        </div>
        <p class="sub" style="margin-bottom:0">
          <strong>${telefono}</strong><br>${horario}<br><br>
          ¿Fuera de horario? Déjale tu pregunta al asistente del chat de esta página: guarda tus
          datos y me avisa. En cuanto abro, te busco.
        </p>
      </div>
      ${formulario}
    </div>
  </div>
</section>

${bloqueFacilidades}`,
});

const gracias = shell({
  titulo: "Gracias | Ciudad Maderas — Asesor autorizado",
  desc: "Recibimos tus datos. Te contacto en breve.",
  cuerpo: `
<section style="background:var(--crema);min-height:56vh;display:flex;align-items:center">
  <div class="wrap" style="max-width:70ch;text-align:center">
    <div class="kick" style="text-align:center">Listo</div>
    <h2 class="sec" style="font-size:clamp(28px,4.4vw,42px)">Ya me llegaron tus datos</h2>
    <p class="sub" style="margin-inline:auto">Te busco dentro del horario de atención
       (${horario.toLowerCase()}). Si tienes prisa, escríbeme directo por WhatsApp y te
       contesto ahí mismo.</p>
    <div class="cta" style="justify-content:center">
      <a class="btn btn-wa" href="${wa("Hola, acabo de dejar mis datos en tu página")}">Escribirme por WhatsApp</a>
      <a class="btn btn-oro" href="/desarrollos">Seguir viendo desarrollos</a>
    </div>
  </div>
</section>`,
});

// ── Registro de rutas ───────────────────────────────────────────────────────
// src/index.ts recorre este mapa y sirve cada entrada. Todo el contenido vive
// aquí, en member/, así que `forjabot update` no lo toca.

export const landingPages: Record<string, string> = {
  "/": inicio,
  "/desarrollos": desarrollos,
  "/amenidades": amenidadesPag,
  "/facilidades-de-pago": facilidades,
  "/nosotros": nosotros,
  "/contacto": contacto,
  "/gracias": gracias,
  ...Object.fromEntries(regiones.map((r) => [`/proyectos/${r.slug}`, paginaRegion(r)])),
};

/** La portada. Se conserva con este nombre porque el motor ya la importaba así. */
export const landingHtml = inicio;
