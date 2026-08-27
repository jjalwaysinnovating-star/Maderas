// member/landing.local.ts — el sitio público del asesor.
// Vive en member/ a propósito: `forjabot update` refresca src/ pero NUNCA toca
// esta carpeta, así que los textos y datos de contacto sobreviven las
// actualizaciones del motor. Se sirve desde el mismo Worker del bot (las rutas
// se registran recorriendo `landingPages` en src/index.ts), así que el chat
// queda en el mismo origen: sin CORS, sin hosting aparte, sin costo.
//
// ── RÉPLICA DEL SITIO OFICIAL ───────────────────────────────────────────────
// Se siguió link por link ciudadmaderas.com. Su sitemap declara 10 páginas:
// la portada, /casas-premium y ocho /proyectos/<region>; el pie agrega
// /terminos-y-condiciones y /aviso-de-privacidad. No hay más: el menú de
// arriba (DESARROLLOS, CASAS PREMIUM, BOSQUE MEMORIAL, MIS PAGOS,
// ESCRITURACIÓN, PAYMENTS, APARTADO, MI CUENTA) mueve por anclas de la misma
// portada o abre portales de cliente de la desarrolladora.
//
// Este sitio replica esa estructura, con los mismos slugs de región, el mismo
// orden de secciones, los mismos encabezados ("Eleva tu estilo de vida en …",
// "Tú lo soñaste / Nosotros lo construimos", "El entorno a tu favor"), los
// mismos desarrollos por plaza, las mismas mensualidades "desde" por región y
// los mismos campos de formulario (INTERÉS, DESARROLLO DE INTERÉS, nombre,
// correo, teléfono).
//
// ── LO QUE SE APARTA, Y POR QUÉ ─────────────────────────────────────────────
// 1. NO existe /casas-premium. El asesor comercializa TERRENOS. Publicar casas
//    trae prospectos que hay que rechazar, y rechazar quema el lead. En su
//    lugar, ese mismo bloque de la portada dice TERRENOS PREMIUM — que además
//    es lo que dicen los logos reales de todos los desarrollos.
// 2. NO se replican BOSQUE MEMORIAL, MIS PAGOS, ESCRITURACIÓN, PAYMENTS,
//    APARTADO ni MI CUENTA: son portales de cliente de la desarrolladora y un
//    asesor no puede prestarlos.
// 3. El teléfono y el WhatsApp son los del asesor, no el 442 del corporativo —
//    si no, los prospectos de esta página se irían al conmutador.
// 4. El chat es el bot de IA propio, no el widget de agente del corporativo.
// 5. Los avisos legales son del ASESOR, no copias de los del corporativo: un
//    aviso de privacidad dice quién responde por los datos, y aquí quien los
//    recibe es él.
// 6. Los héroes son imágenes fijas, no los videos del original: cada .webm del
//    sitio oficial pesa ~6.7 MB y este sitio se abre casi siempre desde un
//    celular con datos.
//
// FOTOS Y LOGOS: se referencian desde el bucket público de Ciudad Maderas, el
// mismo que usa su sitio oficial. El navegador los trae de ahí — no se
// redistribuyen copias. Cada bloque conserva su color de fondo y el texto nunca
// depende de que la foto exista: si mueven esas rutas, la página se degrada.

export const landingConfig = {
  asesor: "Ciudad Maderas",
  // El número NO se escribe en la página ni hay botón de llamar: decisión del
  // dueño. Un teléfono a la vista se lo copian los bots de spam y los call
  // centers, y cae en llamadas frías que no son prospectos. Solo se usa para
  // armar el enlace de WhatsApp, donde el contacto queda por escrito y con
  // nombre. Si algún día quiere volver a publicarlo, se agrega aquí y se pinta.
  telefonoLink: "526866066613",
  horario: "Lunes a domingo · 8:00 a.m. – 6:00 p.m.",
  // Redes DEL ASESOR. Vacías = no se pintan. Se dejan así a propósito: enlazar
  // las cuentas oficiales del corporativo mandaría sus prospectos al 800.
  redes: [] as { nombre: string; url: string }[],
};

const { telefonoLink, horario, redes } = landingConfig;
const IMG = "https://storage.googleapis.com/landing-ciudad-maderas";
const wa = (t: string) => `https://wa.me/${telefonoLink}?text=${encodeURIComponent(t)}`;

// ── Datos ───────────────────────────────────────────────────────────────────

const clubs = ["Casa Club", "Family Club", "Club Deportivo", "Club Acuático"];

const amenidades = [
  { img: `${IMG}/amenidades/Alberca.jpg`, n: "Albercas" },
  { img: `${IMG}/amenidades/Albercas%20techadas.webp`, n: "Albercas techadas" },
  { img: `${IMG}/amenidades/Cancha%20Pa%CC%81del.webp`, n: "Canchas de Pádel" },
  { img: `${IMG}/amenidades/Cancha%20de%20tenis.webp`, n: "Canchas de tenis" },
  { img: `${IMG}/amenidades/Chapoteadero.webp`, n: "Chapoteaderos" },
];

const fundacion = [
  { img: `${IMG}/fundacion/Arte%20y%20Cultura.webp`, n: "Arte y cultura" },
  { img: `${IMG}/fundacion/Educaci%C3%B3n.webp`, n: "Educación" },
  { img: `${IMG}/fundacion/Mascotas.webp`, n: "Dignidad Animal" },
];

interface Desarrollo {
  logo: string;
  n: string;
}

interface Region {
  /** Mismo slug que /proyectos/<slug> del sitio oficial. */
  slug: string;
  /** El H1 de su página, tal cual: a veces es el estado, a veces la marca. */
  region: string;
  /** La ciudad, que es como la busca la gente. */
  ciudad: string;
  /** Foto de la tarjeta en la portada. */
  card: string;
  /** Héroe de su página. */
  hero: string;
  /** Foto del bloque "Eleva tu estilo de vida". */
  estilo: string;
  /** Plano maestro de la plaza. */
  mapa: string;
  /** Mensualidad "desde" que publica esa región. */
  precio: string;
  desc: string;
  desarrollos: Desarrollo[];
}

const dev = (ruta: string, n: string): Desarrollo => ({ logo: `${IMG}/desarrollos/${ruta}`, n });

export const regiones: Region[] = [
  {
    slug: "queretaro",
    region: "Querétaro",
    ciudad: "Querétaro",
    card: `${IMG}/desarrollos/Qro.webp`,
    hero: `${IMG}/desarrollos/Qro/qro_mobile.webp`,
    estilo: `${IMG}/desarrollos/Qro/qro_estilodevida.webp`,
    mapa: `${IMG}/desarrollos/Qro/qro_mapa.webp`,
    precio: "$1,348",
    desc:
      "Además de su cercanía a la Ciudad de México, Querétaro cuenta con una de las " +
      "concentraciones industriales más importantes del centro del país; provocando que se " +
      "proyecte como uno de los estados con mejor red de comunicación y gran crecimiento económico.",
    desarrollos: [
      dev("Qro/desarrollos/qro_bosques.svg", "Ciudad Maderas Bosques"),
      dev("Qro/desarrollos/qro_corregidora.svg", "Ciudad Maderas Corregidora"),
      dev("Qro/desarrollos/qro_hacienda.svg", "Ciudad Maderas Hacienda"),
      dev("Qro/desarrollos/qro_norte.svg", "Ciudad Maderas Norte"),
      dev("Qro/desarrollos/qro_priv_corregidora.svg", "Privada Maderas Corregidora"),
    ],
  },
  {
    slug: "guanajuato",
    region: "Guanajuato",
    ciudad: "León",
    card: `${IMG}/desarrollos/Guanajuato.webp`,
    hero: `${IMG}/desarrollos/guanajuato/gto_mobile.webp`,
    estilo: `${IMG}/desarrollos/guanajuato/gto_invertir.webp`,
    mapa: `${IMG}/desarrollos/guanajuato/gto_mapa.webp`,
    precio: "$1,288",
    desc:
      "Invertir en Guanajuato es invertir en calidad de vida. Un proyecto de urbanización " +
      "único, con biofísica aplicada, ubicado en una zona de gran crecimiento económico, donde " +
      "cada espacio y amenidad está pensada para elevar tu estilo de vida.",
    desarrollos: [
      dev("guanajuato/proyectos/gto_allende.svg", "Ciudad Maderas San Miguel de Allende"),
      dev("guanajuato/proyectos/gto_canada.svg", "Ciudad Maderas Cañada"),
      dev("guanajuato/proyectos/gto_leon.svg", "Ciudad Maderas León"),
      dev("guanajuato/proyectos/gto_montana.svg", "Ciudad Maderas Montaña León"),
      dev("guanajuato/proyectos/gto_norte.svg", "Ciudad Maderas Norte León"),
      dev("guanajuato/proyectos/gto_priv_leon.svg", "Privada Maderas León"),
    ],
  },
  {
    slug: "yucatan",
    region: "Península",
    ciudad: "Mérida",
    card: `${IMG}/desarrollos/Me%CC%81rida.webp`,
    hero: `${IMG}/desarrollos/merida/merida_mobile.webp`,
    estilo: `${IMG}/desarrollos/merida/merida_invertir.webp`,
    mapa: `${IMG}/desarrollos/merida/merida_mapa.webp`,
    precio: "$1,683",
    desc:
      "En un entorno cálido y seguro, Ciudad Maderas Península es una excelente opción para " +
      "disfrutar tanto de la tranquilidad de la Ciudad Blanca como de su cercanía a playas y " +
      "cenotes, en una de las zonas de mayor crecimiento del país.",
    desarrollos: [
      dev("merida/proyectos/merida_hacienda.svg", "Ciudad Maderas Hacienda Península"),
      dev("merida/proyectos/merida_peninsula.svg", "Ciudad Maderas Península"),
      dev("merida/proyectos/merida_priv_peninsula.svg", "Ciudad Maderas Privada Península"),
    ],
  },
  {
    slug: "quintana-roo",
    region: "Caribe",
    ciudad: "Cancún",
    card: `${IMG}/desarrollos/Quintana%20Roo.webp`,
    hero: `${IMG}/desarrollos/quintanaRoo/caribe_mobile.webp`,
    estilo: `${IMG}/desarrollos/quintanaRoo/caribe_estilodevida.webp`,
    mapa: `${IMG}/desarrollos/quintanaRoo/caribe_mapa.webp`,
    precio: "$1,388",
    desc:
      "En Ciudad Maderas Caribe, disfruta la calidez del clima caribeño, paisajes de postal y " +
      "un estilo de vida relajado que combina lujo y naturaleza. Con amenidades premium y un " +
      "espectacular Club Acuático, en un paraíso con alto potencial de plusvalía internacional.",
    desarrollos: [],
  },
  {
    slug: "nuevo-leon",
    region: "Monterrey",
    ciudad: "Monterrey",
    card: `${IMG}/desarrollos/Mty.webp`,
    hero: `${IMG}/desarrollos/monterrey/mty_mobile.webp`,
    estilo: `${IMG}/desarrollos/monterrey/mty_estilodevida.webp`,
    mapa: `${IMG}/desarrollos/monterrey/mty_mapa.webp`,
    precio: "$1,474",
    desc:
      "Invertir en Monterrey es invertir en calidad de vida. Un proyecto de urbanización único, " +
      "con biofísica aplicada, ubicado en una zona de gran crecimiento económico, donde cada " +
      "espacio y amenidad está pensada para elevar tu estilo de vida.",
    desarrollos: [],
  },
  {
    slug: "aguascalientes",
    region: "Aguascalientes",
    ciudad: "Aguascalientes",
    card: `${IMG}/desarrollos/Ags.webp`,
    hero: `${IMG}/desarrollos/Ags/ags_mobile.webp`,
    estilo: `${IMG}/desarrollos/Ags/ags_estilodevida.webp`,
    mapa: `${IMG}/desarrollos/Ags/ags_mapa.webp`,
    precio: "$1,244",
    desc:
      "Invertir en Aguascalientes es invertir en calidad de vida. Un proyecto de urbanización " +
      "único, con biofísica aplicada, ubicado en una zona de gran crecimiento económico, donde " +
      "cada espacio y amenidad está pensada para elevar tu estilo de vida.",
    desarrollos: [],
  },
  {
    slug: "san-luis-potosi",
    region: "San Luis Potosí",
    ciudad: "San Luis Potosí",
    card: `${IMG}/desarrollos/SLP.webp`,
    hero: `${IMG}/desarrollos/sanLuisPotosi/slp_mobile.webp`,
    estilo: `${IMG}/desarrollos/sanLuisPotosi/slp_estilodevida.webp`,
    mapa: `${IMG}/desarrollos/sanLuisPotosi/slp_mapa.webp`,
    precio: "$1,288",
    desc:
      "Invertir en San Luis Potosí es invertir en calidad de vida. Un proyecto de urbanización " +
      "único, con biofísica aplicada, ubicado en una zona de gran crecimiento económico, donde " +
      "cada espacio y amenidad está pensada para elevar tu estilo de vida.",
    desarrollos: [
      dev("sanLuisPotosi/proyectos/slp_montana.svg", "Ciudad Maderas Montaña San Luis Potosí"),
      dev("sanLuisPotosi/proyectos/slp_sierra.svg", "Ciudad Maderas Sierra San Luis Potosí"),
      dev("sanLuisPotosi/proyectos/slp_slp.svg", "Ciudad Maderas San Luis Potosí"),
    ],
  },
  {
    slug: "puebla",
    region: "Puebla",
    ciudad: "Puebla",
    card: `${IMG}/desarrollos/puebla/puebla.webp`,
    hero: `${IMG}/desarrollos/puebla/puebla_mobile.webp`,
    estilo: `${IMG}/desarrollos/puebla/puebla_invertir.webp`,
    mapa: `${IMG}/desarrollos/puebla/puebla_mapa.webp`,
    precio: "$1,244",
    desc:
      "Invertir en Puebla es invertir en calidad de vida. Un proyecto de urbanización único, " +
      "con biofísica aplicada, ubicado en una zona de gran crecimiento económico, donde cada " +
      "espacio y amenidad está pensada para elevar tu estilo de vida.",
    desarrollos: [],
  },
];

// ── Cascarón ────────────────────────────────────────────────────────────────
// El menú del sitio oficial son anclas de la portada, no páginas. Se replica
// igual: desde una página de región, cada una regresa a la portada con su
// ancla. (Del original se omiten los portales de cliente — ver la nota de
// arriba.)
const NAV = [
  { href: "desarrollos", t: "Desarrollos" },
  { href: "amenidades", t: "Amenidades" },
  { href: "facilidades", t: "Facilidades de pago" },
  { href: "contacto", t: "Contáctanos" },
];

const CSS = `
  :root{--azul:#00263a;--azul-2:#0d1f33;--azul-3:#001e2d;--oro:#b4a269;
        --oro-2:#dcce9e;--crema:#f3f0e8;--linea:#ddd9ce;--texto:#0b2538;--gris:#5a6672}
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth;scroll-padding-top:76px}
  body{font-family:Montserrat,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
       color:var(--texto);line-height:1.6;background:#fff;-webkit-font-smoothing:antialiased}
  img{display:block;max-width:100%}
  a{color:inherit;text-decoration:none}
  :focus-visible{outline:2px solid var(--oro);outline-offset:3px}
  .wrap{max-width:1200px;margin:0 auto;padding:0 24px}
  .serif{font-family:"Sorts Mill Goudy",Georgia,serif}

  /* header + menú de celular (checkbox, sin JS) */
  header{background:var(--azul);color:#fff;position:sticky;top:0;z-index:70}
  header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:76px}
  .logo{font-weight:800;font-size:17px;letter-spacing:.06em;text-transform:uppercase;line-height:1.1}
  .logo span{display:block;font-weight:400;font-size:9.5px;letter-spacing:.22em;
             color:var(--oro-2);margin-top:3px}
  nav{display:flex;gap:26px;font-size:12px;font-weight:600;letter-spacing:.13em;text-transform:uppercase}
  nav a{opacity:.9}nav a:hover{color:var(--oro-2);opacity:1}
  .btn-nav{border:1px solid var(--oro);color:var(--oro-2);padding:10px 20px;border-radius:3px;
           font-size:11.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap}
  .burger{display:none;cursor:pointer;padding:8px;margin:-8px}
  .burger span{display:block;width:24px;height:2px;background:#fff;margin:5px 0}
  @media(max-width:1040px){
    .burger{display:block}
    /* En celular el botón se queda FUERA, incluso con el menú abierto. Antes se
       colgaba del menú en posición absoluta y ese cálculo lo dejaba encima de la
       barra, montado sobre el logo. Aquí no hace falta: el menú ya lleva
       CONTÁCTANOS y el héroe tiene su botón de WhatsApp. */
    header .wrap>nav,header .wrap>.btn-nav{display:none}
    #mnu:checked~.wrap nav{display:flex;position:absolute;top:76px;left:0;right:0;
      flex-direction:column;gap:0;background:var(--azul-3);padding:8px 24px 20px;
      border-top:1px solid rgba(255,255,255,.12)}
    #mnu:checked~.wrap nav a{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.09)}
  }

  /* héroe */
  .hero{position:relative;display:flex;align-items:flex-end;background:var(--azul-3);
        color:#fff;overflow:hidden;min-height:min(82vh,640px)}
  .hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
  .hero:after{content:"";position:absolute;inset:0;
    background:linear-gradient(180deg,rgba(0,30,45,.5) 0%,rgba(0,30,45,.08) 38%,rgba(0,30,45,.93) 100%)}
  .hero .wrap{position:relative;z-index:2;padding-bottom:54px;padding-top:64px}
  .hero h1{font-size:clamp(34px,6vw,62px);line-height:1.05;letter-spacing:.01em;font-weight:300;
           text-transform:uppercase;margin-bottom:18px;text-wrap:balance}
  .hero h1 b{display:block;font-weight:800;color:var(--oro-2)}
  .hero p{font-size:clamp(15px,2vw,19px);max-width:56ch;opacity:.93;margin-bottom:28px}
  .miga{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--oro-2);
        margin-bottom:14px;opacity:.9}
  .cta{display:flex;gap:12px;flex-wrap:wrap}
  .btn{display:inline-block;padding:15px 30px;border-radius:3px;font-weight:700;font-size:13px;
       letter-spacing:.12em;text-transform:uppercase;border:1px solid transparent;cursor:pointer;
       font-family:inherit}
  .btn-oro{background:var(--oro);color:var(--azul)}
  .btn-wa{background:#25D366;color:#05301a}
  .btn-line{border-color:rgba(255,255,255,.55);color:#fff}

  /* somos + cifras */
  .somos{background:var(--azul);color:#fff;padding:58px 0}
  .somos .lbl{font-family:"Sorts Mill Goudy",serif;font-size:26px;color:var(--oro-2);margin-bottom:26px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:26px}
  @media(max-width:820px){.stats{grid-template-columns:repeat(2,1fr);gap:34px}}
  .st b{display:block;font-size:clamp(28px,4.4vw,44px);font-weight:800;color:var(--oro-2);
        line-height:1;letter-spacing:-.02em;margin-bottom:8px;font-variant-numeric:tabular-nums}
  .st span{font-size:13.5px;opacity:.88;display:block}

  .creadores{position:relative;text-align:center;padding:96px 0;background:var(--azul-3);color:#fff;
             overflow:hidden}
  .creadores>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.38}
  .creadores .wrap{position:relative;z-index:2}
  .creadores h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(32px,5.6vw,56px);
                font-weight:400;line-height:1.12;text-wrap:balance}
  .creadores h2 em{font-style:italic;color:var(--oro-2)}
  .creadores p{margin-top:16px;font-size:16.5px;max-width:62ch;margin-inline:auto;opacity:.9}

  /* presencia */
  .presencia{background:var(--crema)}
  .presencia .cols{display:grid;grid-template-columns:1fr 1fr;gap:46px;align-items:center}
  @media(max-width:880px){.presencia .cols{grid-template-columns:1fr;gap:26px}}
  .presencia img{border-radius:4px;width:100%;aspect-ratio:16/10;object-fit:cover;background:var(--azul-2)}

  section{padding:74px 0}
  .kick{font-size:11.5px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;
        color:var(--oro);margin-bottom:12px}
  h2.sec{font-family:"Sorts Mill Goudy",serif;font-size:clamp(27px,4.2vw,42px);font-weight:400;
         line-height:1.16;color:var(--azul);margin-bottom:14px;text-wrap:balance}
  .sub{color:var(--gris);font-size:16.5px;max-width:62ch;margin-bottom:34px}

  .tabs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:26px}
  .tab{border:1px solid var(--linea);background:var(--crema);border-radius:3px;padding:11px 22px;
       font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--azul)}

  .amen{background:var(--azul);padding:8px 0 74px}
  .amen .kick{color:var(--oro-2)}
  .amen h2.sec{color:#fff}
  .amen .tab{background:transparent;border-color:rgba(220,206,158,.4);color:var(--oro-2)}
  .amen .nota{color:rgba(255,255,255,.72);font-size:15px;max-width:66ch;margin-top:24px}

  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:18px}
  .card{position:relative;border-radius:4px;overflow:hidden;background:var(--azul-2);aspect-ratio:4/3}
  .card img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
  .card:hover img{transform:scale(1.06)}
  .card figcaption{position:absolute;inset:auto 0 0 0;padding:32px 16px 14px;color:#fff;
    font-size:14px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    background:linear-gradient(transparent,rgba(0,30,45,.93))}
  .card figcaption i{display:block;font-style:normal;font-size:10.5px;letter-spacing:.16em;
    color:var(--oro-2);font-weight:700;margin-bottom:3px}
  @media(prefers-reduced-motion:reduce){.card img{transition:none}.card:hover img{transform:none}}

  /* Terrenos Premium — el bloque que el original dedica a su otra linea */
  .premium{position:relative;background:var(--azul-3);color:#fff;overflow:hidden;padding:0}
  .premium>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.34}
  .premium:after{content:"";position:absolute;inset:0;
    background:linear-gradient(90deg,rgba(0,30,45,.94),rgba(0,30,45,.5))}
  .premium .wrap{position:relative;z-index:2;padding:80px 24px}
  .premium .tag{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--oro-2);
                font-weight:700;margin-bottom:10px}
  .premium h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(34px,6vw,60px);font-weight:400;
              line-height:1.04;text-transform:uppercase;margin-bottom:16px}
  .premium h2 b{display:block;font-weight:800;color:var(--oro-2)}
  .premium p{font-size:clamp(16px,2.2vw,21px);max-width:48ch;margin-bottom:26px}
  .desde{display:inline-block;border:1px solid var(--oro);padding:14px 22px;border-radius:3px;
         margin-bottom:26px}
  .desde i{display:block;font-style:normal;font-size:10.5px;letter-spacing:.22em;
           text-transform:uppercase;color:var(--oro-2)}
  .desde b{display:block;font-size:34px;font-weight:800;letter-spacing:-.02em;margin:2px 0;
           font-variant-numeric:tabular-nums}
  .desde s{display:block;text-decoration:none;font-size:10.5px;opacity:.7}

  /* desarrollos de una plaza (logos sobre azul) */
  .logos{background:var(--azul-3);color:#fff}
  .logos h2.sec{color:#fff}
  .logos .kick{color:var(--oro-2)}
  .lgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
  .lg{border:1px solid rgba(255,255,255,.13);border-radius:4px;padding:26px 20px;
      background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center}
  .lg img{height:64px;width:auto;object-fit:contain}
  .plano{margin-top:34px;border:1px solid rgba(255,255,255,.13);border-radius:4px;padding:18px;
         background:rgba(255,255,255,.03)}
  .plano img{width:100%;border-radius:3px}
  .plano figcaption{font-size:12.5px;color:rgba(255,255,255,.66);margin-top:12px;text-align:center}

  /* soñaste / entorno */
  .entorno{background:var(--crema)}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:46px;align-items:center}
  @media(max-width:880px){.cols{grid-template-columns:1fr;gap:28px}}
  .entorno p{color:var(--gris);font-size:16px;margin-bottom:14px}
  .entorno img{border-radius:4px;width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--azul-2)}
  .sonaste h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(28px,4.6vw,46px);font-weight:400;
              color:var(--azul);line-height:1.1}
  .sonaste h3{font-family:"Sorts Mill Goudy",serif;font-size:clamp(28px,4.6vw,46px);font-weight:400;
              color:var(--oro);line-height:1.1;margin-bottom:20px}

  /* facilidades */
  .facil{position:relative;background:#fff;overflow:hidden}
  .facil>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5}
  .facil .wrap{position:relative;z-index:2}
  .precio-mes{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
              border-left:3px solid var(--oro);padding-left:20px;margin-bottom:28px}
  .precio-mes i{font-style:normal;font-size:11px;letter-spacing:.2em;text-transform:uppercase;
                color:var(--gris)}
  .precio-mes b{font-size:clamp(32px,5.4vw,46px);font-weight:800;letter-spacing:-.02em;
                color:var(--azul);font-variant-numeric:tabular-nums}
  .fgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:30px}
  @media(max-width:880px){.fgrid{grid-template-columns:repeat(2,1fr)}}
  .fitem{border:1px solid var(--linea);border-radius:3px;padding:22px;background:#fff;text-align:center}
  .fitem b{display:block;font-size:12.5px;font-weight:700;letter-spacing:.11em;
           text-transform:uppercase;color:var(--azul)}
  .fitem span{display:block;font-size:12.5px;color:var(--gris);margin-top:6px;line-height:1.45}

  /* contacto */
  .contacto{background:var(--crema)}
  .contacto h2{font-family:"Sorts Mill Goudy",serif;font-size:clamp(28px,4.4vw,44px);
               font-weight:400;color:var(--azul);line-height:1.15;margin-bottom:14px;text-wrap:balance}
  .contacto p{color:var(--gris);max-width:52ch;font-size:16.5px}
  .tel-big{margin-top:24px;font-size:15.5px;color:var(--gris)}
  .tel-big a{color:var(--azul);font-weight:800}

  .form{background:#fff;border:1px solid var(--linea);border-radius:4px;padding:28px}
  .form h3{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--oro);
           font-weight:700;margin-bottom:18px}
  .campo{margin-bottom:16px}
  .campo label{display:block;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;
               font-weight:700;color:var(--azul);margin-bottom:7px}
  .campo input,.campo select{width:100%;border:1px solid var(--linea);border-radius:3px;
    padding:13px 14px;font-family:inherit;font-size:15px;color:var(--texto);background:#fff}
  .campo input:focus,.campo select:focus{border-color:var(--oro);outline:none}
  .form .btn{width:100%;border:none}
  .form .aviso{font-size:11.5px;color:var(--gris);margin-top:14px;line-height:1.55}
  .form .aviso a{color:var(--azul);text-decoration:underline}
  .trampa{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
  .ok{display:none;text-align:center;padding:26px 6px}
  .ok b{display:block;font-family:"Sorts Mill Goudy",serif;font-size:26px;font-weight:400;
        color:var(--azul);margin-bottom:8px}
  .ok span{color:var(--gris);font-size:15px}
  form.enviado .campo,form.enviado .btn,form.enviado .aviso,form.enviado h3{display:none}
  form.enviado .ok{display:block}

  /* legales */
  .legalpg{background:#fff}
  .legalpg h1{font-family:"Sorts Mill Goudy",serif;font-size:clamp(30px,5vw,46px);font-weight:400;
              color:var(--azul);margin-bottom:10px}
  .legalpg .fecha{color:var(--gris);font-size:13px;margin-bottom:34px}
  .legalpg h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--oro);
              font-weight:700;margin:32px 0 12px}
  .legalpg p,.legalpg li{color:var(--gris);font-size:15.5px;max-width:78ch;margin-bottom:12px}
  .legalpg ul{padding-left:20px}

  footer{background:var(--azul-3);color:rgba(255,255,255,.72);padding:44px 0;font-size:13.5px}
  .fbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:26px;
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
  cuerpo: string;
}

function shell({ titulo, desc, cuerpo }: Pagina): string {
  const nav = NAV.map((n) => `<a href="/#${n.href}">${n.t}</a>`).join("");
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
<meta property="og:image" content="${IMG}/mapa/desarrollo.webp">
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
    <a href="/" class="logo">Ciudad Maderas<span>Terrenos Premium · Asesor autorizado</span></a>
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
        <strong>Ciudad Maderas</strong> · Terrenos Premium<br>
        Asesor autorizado<br>${horario}<br>
        <a href="https://wa.me/${telefonoLink}">Escríbeme por WhatsApp</a>
      </div>
      <div>
        <h4>Explora</h4>
        ${NAV.map((n) => `<a href="/#${n.href}">${n.t}</a>`).join("")}
      </div>
      <div>
        <h4>Desarrollos</h4>
        ${regiones.slice(0, 4).map((r) => `<a href="/proyectos/${r.slug}">${r.ciudad}</a>`).join("")}
      </div>
      <div>
        <h4>&nbsp;</h4>
        ${regiones.slice(4).map((r) => `<a href="/proyectos/${r.slug}">${r.ciudad}</a>`).join("")}
      </div>
      <div>
        <h4>Legal</h4>
        <a href="/aviso-de-privacidad">Aviso de privacidad</a>
        <a href="/terminos-y-condiciones">Términos y condiciones</a>
        ${redes.map((s) => `<a href="${s.url}" rel="noopener">${s.nombre}</a>`).join("")}
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
      garantiza rendimiento alguno. Marcas e imágenes propiedad de Ciudad Maderas, usadas con
      fines informativos.
    </p>
  </div>
</footer>

<script>
// El formulario del sitio oficial no recarga: manda los datos y enseña el
// acuse en el mismo lugar. Aquí igual — y si el navegador no corre esto, el
// POST normal sigue funcionando y cae en /gracias.
document.addEventListener("submit", function (e) {
  var f = e.target;
  if (!f.classList.contains("form")) return;
  e.preventDefault();
  fetch("/contacto", { method: "POST", body: new FormData(f) })
    .then(function () { f.classList.add("enviado"); f.scrollIntoView({ block: "center" }); })
    .catch(function () { f.submit(); });
});
</script>
<script src="/widget.js" defer></script>
</body>
</html>`;
}

// ── Piezas compartidas ──────────────────────────────────────────────────────

// Mismos campos que el formulario del sitio oficial (INTERÉS, DESARROLLO DE
// INTERÉS, nombre, correo, teléfono). En INTERÉS el original ofrece Terrenos
// Premium, Casas Premium, Bosque Memorial y Postventa; aquí solo hay terrenos,
// así que ese selector pregunta PARA QUÉ lo quiere — que además es justo el
// dato que decide si el prospecto es caliente.
const OPC_INTERES = ["Invertir", "Construir mi casa", "Asegurar patrimonio", "Terreno comercial"];

const formulario = `
<form class="form" method="POST" action="/contacto">
  <h3>Contáctanos</h3>
  <div class="ok"><b>¡Gracias!</b><span>Ya me llegaron tus datos. Te busco dentro del horario de atención.</span></div>
  <div class="campo trampa" aria-hidden="true">
    <label for="apellido2">No llenar</label>
    <input type="text" id="apellido2" name="apellido2" tabindex="-1" autocomplete="off">
  </div>
  <div class="campo">
    <label for="f-tipo">Interés</label>
    <select id="f-tipo" name="tipo">
      <option value="">Selecciona tu interés</option>
      ${OPC_INTERES.map((o) => `<option value="${o}">${o}</option>`).join("")}
    </select>
  </div>
  <div class="campo">
    <label for="f-des">Desarrollo de interés</label>
    <select id="f-des" name="desarrollo">
      <option value="">Selecciona el desarrollo</option>
      ${regiones.map((r) => `<option value="${r.ciudad}">${r.ciudad}</option>`).join("")}
      <option value="Aún no lo sé">Aún no lo sé</option>
    </select>
  </div>
  <div class="campo">
    <label for="f-nombre">Nombre</label>
    <input type="text" id="f-nombre" name="nombre" required autocomplete="name" placeholder="Tu nombre">
  </div>
  <div class="campo">
    <label for="f-mail">Correo</label>
    <input type="email" id="f-mail" name="email" autocomplete="email" placeholder="correo@ejemplo.com">
  </div>
  <div class="campo">
    <label for="f-tel">Teléfono</label>
    <input type="tel" id="f-tel" name="telefono" required autocomplete="tel" placeholder="55 0000 0000">
  </div>
  <button class="btn btn-oro" type="submit">Enviar</button>
  <p class="aviso">Al enviar aceptas que te contacte por teléfono, WhatsApp o correo.
     Consulta el <a href="/aviso-de-privacidad">aviso de privacidad</a>.</p>
</form>`;

function bloqueContacto(texto: string): string {
  return `
<section class="contacto" id="contacto">
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="kick">Contáctanos</div>
        <h2>Agenda una asesoría<br>personalizada gratis hoy.</h2>
        <p>${texto}</p>
        <div class="cta" style="margin-top:26px">
          <a class="btn btn-wa" href="${wa("Hola, quiero agendar una asesoría")}">Escríbeme por WhatsApp</a>
          <a class="btn btn-oro" href="#f-nombre">Déjame tus datos</a>
        </div>
        <p class="tel-big">O pregúntale al asistente en el chat de esta página.<br>
           Atiendo ${horario.toLowerCase()}</p>
      </div>
      ${formulario}
    </div>
  </div>
</section>`;
}

function bloqueFacilidades(precio: string): string {
  return `
<section class="facil" id="facilidades">
  <img src="${IMG}/desarrollos/generales/facilidad_fondo.webp" alt="" loading="lazy">
  <div class="wrap">
    <div class="kick">Facilidades de pago</div>
    <h2 class="sec">Tenemos el mejor crédito directo de todo México</h2>
    <div class="precio-mes">
      <i>Terrenos desde</i><b>${precio}</b><i>al mes · *aplican restricciones</i>
    </div>
    <div class="fgrid">
      <div class="fitem"><b>Crédito directo</b><span>Con la desarrolladora, sin intermediarios</span></div>
      <div class="fitem"><b>Sin aval</b><span>No necesitas que alguien más firme por ti</span></div>
      <div class="fitem"><b>Sin revisión de buró</b><span>No se consulta tu historial crediticio</span></div>
      <div class="fitem"><b>Desde 1% de enganche</b><span>Para apartar tu terreno a tu nombre</span></div>
    </div>
    <a class="btn btn-oro" href="#contacto">Quiero mi cotización</a>
  </div>
</section>`;
}

const bloqueEntorno = `
<section class="entorno">
  <div class="wrap">
    <div class="cols sonaste">
      <div>
        <div class="kick">Innovación para tu bienestar</div>
        <h2>Tú lo soñaste</h2>
        <h3>Nosotros lo construimos</h3>
        <p><strong>El entorno a tu favor.</strong> Única desarrolladora inmobiliaria en
           Latinoamérica en aplicar biofísica aplicada y conocimiento clásico oriental Kan Yu.</p>
        <p>Cada espacio está pensado para aprovechar las ondas de energía que se generan en el
           entorno y así mejorar tu calidad de vida.</p>
      </div>
      <img src="${IMG}/biofisica/biofisica.webp" alt="Planeación urbana con biofísica aplicada" loading="lazy">
    </div>
  </div>
</section>`;

// ── Portada ─────────────────────────────────────────────────────────────────

const inicio = shell({
  titulo: "Terrenos Premium | Ciudad Maderas — Asesor autorizado",
  desc:
    "Terrenos en comunidades planificadas con crédito directo desde 1% de enganche, " +
    "sin aval y sin revisión de buró. Asesoría personalizada gratis.",
  cuerpo: `
<div class="hero" id="inicio">
  <img src="${IMG}/mapa/desarrollo.webp" alt="" decoding="async">
  <div class="wrap">
    <h1>Terrenos<b>Premium</b></h1>
    <p>Crédito directo con la desarrolladora, sin aval y sin revisión de buró.
       Comunidades planificadas con más de 30 amenidades de lujo.</p>
    <div class="cta">
      <a class="btn btn-wa" href="${wa("Hola, me interesa un terreno")}">Escríbeme por WhatsApp</a>
      <a class="btn btn-line" href="#desarrollos">Ver desarrollos</a>
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
  <img src="${IMG}/website-ciudad-maderas/somos/colinas-1.webp" alt="" loading="lazy">
  <div class="wrap">
    <h2>Somos <em>creadores</em><br>de ciudades</h2>
  </div>
</div>

<section class="presencia">
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="kick">Nuestra presencia es</div>
        <h2 class="sec">Internacional</h2>
        <p class="sub" style="margin-bottom:0">20 ciudades de México y 4 en Estados Unidos, con
           más de 30 desarrollos y 40 oficinas. Estas son las plazas donde te puedo atender.</p>
      </div>
      <img src="${IMG}/mapa/desarrollo.webp" alt="Desarrollo urbanizado de Ciudad Maderas" loading="lazy">
    </div>
  </div>
</section>

<section class="amen" id="amenidades" style="padding-top:74px">
  <div class="wrap">
    <div class="kick">Nuestras principales</div>
    <h2 class="sec">Amenidades</h2>
    <div class="tabs">${clubs.map((c) => `<span class="tab">${c}</span>`).join("")}</div>
    <div class="grid">
      ${amenidades
        .map((a) => `<figure class="card"><img src="${a.img}" alt="${a.n}" loading="lazy"><figcaption>${a.n}</figcaption></figure>`)
        .join("")}
    </div>
    <p class="nota">El catálogo exacto varía por desarrollo y por etapa, y no todas están
       construidas desde el primer día. Pregúntame por el que te interese y te digo cuáles ya
       existen y cuáles están proyectadas.</p>
  </div>
</section>

<section class="premium">
  <img src="${IMG}/desarrollos/Qro/qro_estilodevida.webp" alt="" loading="lazy">
  <div class="wrap">
    <div class="desde"><i>Mensualidades desde</i><b>$1,244</b><s>*Aplican restricciones</s></div>
    <div class="tag">Crédito directo · Sin aval · Sin revisión de buró</div>
    <h2>Terrenos<b>Premium</b></h2>
    <p>El crédito directo más accesible de todo México, sin banco de por medio.</p>
    <a class="btn btn-oro" href="#desarrollos">Conócelos</a>
  </div>
</section>

<section id="desarrollos">
  <div class="wrap">
    <div class="kick">Elige el mejor estilo de vida</div>
    <h2 class="sec">Nuestros desarrollos</h2>
    <p class="sub">Toca tu ciudad para ver los desarrollos de esa plaza, su plano y desde cuánto
       sale la mensualidad.</p>
    <div class="grid">
      ${regiones
        .map(
          (r) => `<a class="card" href="/proyectos/${r.slug}">
            <img src="${r.card}" alt="Terrenos en ${r.ciudad}" loading="lazy">
            <figcaption><i>${r.region}</i>${r.ciudad}</figcaption>
          </a>`,
        )
        .join("")}
    </div>
  </div>
</section>

${bloqueEntorno}

<section style="background:#fff">
  <div class="wrap">
    <div class="kick">Impacto social</div>
    <h2 class="sec">Fundación Ciudad Maderas</h2>
    <p class="sub">Promueve desarrollo social a través de educación, salud, arte, deporte y
       protección animal, creando impacto humano, inclusión y esperanza.</p>
    <div class="grid">
      ${fundacion
        .map((f) => `<figure class="card"><img src="${f.img}" alt="${f.n}" loading="lazy"><figcaption>${f.n}</figcaption></figure>`)
        .join("")}
    </div>
  </div>
</section>

${bloqueFacilidades("$1,244")}
${bloqueContacto(
  "Cuéntame qué buscas —invertir, construir o asegurar patrimonio— y te muestro las opciones que te hacen sentido en la ciudad que te interese.",
)}`,
});

// ── Página de región ────────────────────────────────────────────────────────

function paginaRegion(r: Region): string {
  const otras = regiones.filter((o) => o.slug !== r.slug).slice(0, 4);
  const logos = r.desarrollos.length
    ? `
<section class="logos">
  <div class="wrap">
    <div class="kick">Desarrollos en ${r.ciudad}</div>
    <h2 class="sec">Dónde puedes elegir tu terreno</h2>
    <div class="lgrid">
      ${r.desarrollos
        .map((d) => `<div class="lg"><img src="${d.logo}" alt="${d.n}" loading="lazy"></div>`)
        .join("")}
    </div>
    <figure class="plano">
      <img src="${r.mapa}" alt="Plano maestro de ${r.ciudad}" loading="lazy">
      <figcaption>Plano maestro. Las etapas abiertas y las superficies disponibles cambian
         seguido — pregúntame por las de hoy.</figcaption>
    </figure>
  </div>
</section>`
    : `
<section class="logos">
  <div class="wrap">
    <div class="kick">${r.ciudad}</div>
    <h2 class="sec">El plano de la plaza</h2>
    <figure class="plano" style="margin-top:8px">
      <img src="${r.mapa}" alt="Plano maestro de ${r.ciudad}" loading="lazy">
      <figcaption>Plano maestro. Las etapas abiertas y las superficies disponibles cambian
         seguido — pregúntame por las de hoy.</figcaption>
    </figure>
  </div>
</section>`;

  return shell({
    titulo: `Eleva tu estilo de vida en ${r.region} | Ciudad Maderas — Asesor autorizado`,
    desc: `Terrenos Ciudad Maderas en ${r.ciudad}. Crédito directo desde 1% de enganche, sin aval y sin revisión de buró. Desde ${r.precio} al mes.`,
    cuerpo: `
<div class="hero">
  <img src="${r.hero}" alt="" decoding="async">
  <div class="wrap">
    <div class="miga"><a href="/#desarrollos">Desarrollos</a> · ${r.region}</div>
    <h1>${r.region}</h1>
    <p>Eleva tu estilo de vida en ${r.ciudad}.</p>
    <div class="cta">
      <a class="btn btn-wa" href="${wa(`Hola, me interesan los terrenos en ${r.ciudad}`)}">Preguntar por ${r.ciudad}</a>
      <a class="btn btn-line" href="#contacto">Pedir cotización</a>
    </div>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="kick">${r.ciudad}</div>
        <h2 class="sec">Eleva tu estilo de vida en ${r.ciudad}</h2>
        <p class="sub" style="margin-bottom:0">${r.desc}</p>
      </div>
      <img src="${r.estilo}" alt="${r.ciudad}" loading="lazy"
           style="border-radius:4px;width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--azul-2)">
    </div>
  </div>
</section>

${logos}
${bloqueEntorno}
${bloqueFacilidades(r.precio)}

<section style="background:#fff">
  <div class="wrap">
    <div class="kick">Otras plazas</div>
    <h2 class="sec">¿Buscabas en otra ciudad?</h2>
    <div class="grid">
      ${otras
        .map(
          (o) => `<a class="card" href="/proyectos/${o.slug}">
            <img src="${o.card}" alt="Terrenos en ${o.ciudad}" loading="lazy">
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

// ── Legales ─────────────────────────────────────────────────────────────────
// Redactados para el ASESOR. No son copia de los del corporativo: un aviso de
// privacidad declara quién responde por los datos, y aquí quien los recibe es
// él. Mismas rutas y mismo lugar en el pie que en el sitio oficial.

const aviso = shell({
  titulo: "Aviso de privacidad | Ciudad Maderas — Asesor autorizado",
  desc: "Cómo se usan los datos que dejas en este sitio.",
  cuerpo: `
<section class="legalpg">
  <div class="wrap">
    <h1>Aviso de privacidad</h1>
    <p class="fecha">Sitio operado por un asesor inmobiliario autorizado de Ciudad Maderas ·
       Contacto: <a href="https://wa.me/${telefonoLink}">WhatsApp</a> o el chat de esta página</p>

    <h2>Quién trata tus datos</h2>
    <p>El responsable del tratamiento de los datos que dejas en este sitio es el asesor
       inmobiliario que lo opera, localizable por
       <a href="https://wa.me/${telefonoLink}">WhatsApp</a> y por el chat de esta página. Este
       sitio no es el sitio oficial de la desarrolladora y no la sustituye.</p>

    <h2>Información que se recaba</h2>
    <p>Únicamente la que tú escribes en el formulario o en el chat: nombre, teléfono, correo
       electrónico, la ciudad que te interesa y para qué buscas el terreno. No se piden ni se
       reciben por este medio datos bancarios, números de tarjeta ni documentos oficiales.</p>

    <h2>Para qué se usan</h2>
    <ul>
      <li>Contactarte para darte información y cotizaciones de terrenos.</li>
      <li>Agendar una asesoría o una visita al desarrollo que te interese.</li>
      <li>Dar seguimiento a tu solicitud hasta que tú pidas que se detenga.</li>
    </ul>
    <p>No se usan para publicidad masiva ni se venden, rentan o comparten con terceros ajenos a
       la operación. Cuando avanzas hacia un apartado, los datos necesarios se transfieren a
       Ciudad Maderas para formalizar la operación.</p>

    <h2>Cuánto tiempo se conservan</h2>
    <p>El tiempo necesario para atender tu solicitud y cumplir las obligaciones legales que
       deriven de ella. Si pides que se eliminen y no hay una obligación legal que lo impida,
       se eliminan.</p>

    <h2>Tus derechos</h2>
    <p>Puedes pedir en cualquier momento acceder a tus datos, rectificarlos, cancelarlos u
       oponerte a su uso, así como revocar tu consentimiento. Basta con pedirlo por
       <a href="https://wa.me/${telefonoLink}">WhatsApp</a> o por el chat de esta página;
       se atiende sin costo.</p>

    <h2>Cambios a este aviso</h2>
    <p>Si cambia la forma en que se tratan los datos, este aviso se actualiza en esta misma
       página.</p>
  </div>
</section>

${bloqueContacto("¿Dudas sobre tus datos o sobre un terreno? Escríbeme y te contesto yo.")}`,
});

const terminos = shell({
  titulo: "Términos y condiciones | Ciudad Maderas — Asesor autorizado",
  desc: "Condiciones de uso del sitio del asesor autorizado.",
  cuerpo: `
<section class="legalpg">
  <div class="wrap">
    <h1>Términos y condiciones</h1>
    <p class="fecha">Sitio operado por un asesor inmobiliario autorizado de Ciudad Maderas ·
       Contacto: <a href="https://wa.me/${telefonoLink}">WhatsApp</a> o el chat de esta página</p>

    <h2>I. Información contenida en el sitio</h2>
    <p>La información de este sitio es de carácter informativo y puede cambiar sin previo
       aviso. Las imágenes, planos y representaciones son ilustrativos y no constituyen una
       reproducción exacta del producto final.</p>

    <h2>II. Marcas comerciales</h2>
    <p>Ciudad Maderas y los nombres de sus desarrollos son marcas de su titular. Se usan aquí
       con fines informativos, en el marco de la autorización otorgada al asesor para
       comercializar dichos desarrollos. Este sitio no es el sitio oficial de la desarrolladora.</p>

    <h2>III. Precios y promociones</h2>
    <p>Todos los montos publicados son cantidades <em>desde</em>: existen para lotes, plazos y
       condiciones específicos, y aplican restricciones. El precio final depende del lote, su
       superficie, su ubicación y la disponibilidad al momento de la cotización. Nada de lo
       publicado aquí constituye una oferta vinculante.</p>

    <h2>IV. Crédito directo</h2>
    <p>El crédito directo lo otorga la desarrolladora, no el asesor. Sus condiciones —enganche,
       plazo, mensualidad— están sujetas a aprobación y a los términos vigentes de la
       desarrolladora al momento de la operación.</p>

    <h2>V. Apartado y pagos</h2>
    <p>Este sitio no procesa pagos ni apartados. Cualquier pago se realiza directamente con
       Ciudad Maderas por los canales oficiales que la desarrolladora indique. Nunca se piden
       datos bancarios ni de tarjeta por chat, WhatsApp o correo.</p>

    <h2>VI. Plusvalía</h2>
    <p>La plusvalía de un inmueble depende del comportamiento del mercado y de la zona. No se
       garantiza rendimiento, revalorización ni retorno alguno, y ninguna comunicación de este
       sitio debe entenderse como tal.</p>

    <h2>VII. Chat y asistente automático</h2>
    <p>El chat de esta página lo atiende un asistente automático que orienta y toma tus datos.
       Sus respuestas son informativas y no sustituyen la confirmación de un asesor ni la
       documentación oficial de la desarrolladora.</p>

    <h2>VIII. Fallas en el sistema</h2>
    <p>Se procura la disponibilidad del sitio, pero no se garantiza que esté libre de
       interrupciones o errores. No se asume responsabilidad por daños derivados de su uso o de
       la imposibilidad de usarlo.</p>

    <h2>IX. Legislación y jurisdicción</h2>
    <p>Estos términos se rigen por la legislación aplicable en los Estados Unidos Mexicanos.</p>
  </div>
</section>

${bloqueContacto("¿Alguna duda sobre estas condiciones? Pregúntame directo.")}`,
});

// Acuse sin JavaScript: el envío normal del formulario cae aquí. Con JS, el
// acuse se pinta dentro del propio formulario y esta página no se ve.
const gracias = shell({
  titulo: "Gracias | Ciudad Maderas — Asesor autorizado",
  desc: "Recibimos tus datos. Te contacto en breve.",
  cuerpo: `
<section style="background:var(--crema);min-height:58vh;display:flex;align-items:center">
  <div class="wrap" style="max-width:70ch;text-align:center">
    <div class="kick" style="text-align:center">Listo</div>
    <h2 class="sec" style="font-size:clamp(28px,4.4vw,42px)">Ya me llegaron tus datos</h2>
    <p class="sub" style="margin-inline:auto">Te busco dentro del horario de atención
       (${horario.toLowerCase()}). Si tienes prisa, escríbeme directo por WhatsApp y te
       contesto ahí mismo.</p>
    <div class="cta" style="justify-content:center">
      <a class="btn btn-wa" href="${wa("Hola, acabo de dejar mis datos en tu página")}">Escribirme por WhatsApp</a>
      <a class="btn btn-oro" href="/#desarrollos">Seguir viendo desarrollos</a>
    </div>
  </div>
</section>`,
});

// ── Registro de rutas ───────────────────────────────────────────────────────
// src/index.ts recorre este mapa y sirve cada entrada. Todo el contenido vive
// aquí, en member/, así que `forjabot update` no lo toca y agregar una página
// no obliga a tocar src/.

export const landingPages: Record<string, string> = {
  "/": inicio,
  "/aviso-de-privacidad": aviso,
  "/terminos-y-condiciones": terminos,
  "/gracias": gracias,
  ...Object.fromEntries(regiones.map((r) => [`/proyectos/${r.slug}`, paginaRegion(r)])),
};

/** La portada. Se conserva con este nombre porque el motor ya la importaba así. */
export const landingHtml = inicio;
