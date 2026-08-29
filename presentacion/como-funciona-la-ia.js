// "Cómo funciona la IA que contesta" — presentación para explicárselo a otros.
//
// Deliberadamente SIN nombres de modelos, precios ni tamaños concretos: esos
// cambian cada pocos meses y volverían la presentación vieja en semanas. Lo
// que se explica aquí —predicción, contexto, herramientas— es lo que no
// cambia, y es justo lo que la gente entiende mal.
//
//   node como-funciona-la-ia.js
const pptx = require("pptxgenjs");
const p = new pptx();
p.layout = "LAYOUT_WIDE";
p.title = "Cómo funciona la IA que contesta";

// Paleta de aula: papel claro, tinta azulada, un azul eléctrico para la
// "señal" (lo que la máquina predice) y un naranja para los límites.
const TINTA = "171A2B";
const PAPEL = "FFFFFF";
const PAPEL2 = "EEF1F4";
const SEC = "5F6B7A";
const AZUL = "2F5BEA";
const NARANJA = "E8623C";
const VERDE = "2E8B63";
const LINEA = "D8DEE5";

const SERIF = "Century Schoolbook";
const SANS = "Calibri";
const MONO = "Courier New";

const W = 13.3, H = 7.5, M = 0.75;
const s = (fondo) => { const sl = p.addSlide(); sl.background = { color: fondo || PAPEL2 }; return sl; };

function tag(sl, x, y, texto, color = AZUL) {
  sl.addText(texto, {
    x, y, w: 6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 11.5, bold: true, color, charSpacing: 1.5,
  });
}

function titulo(sl, texto, bajada, etiqueta, colorTexto) {
  if (etiqueta) tag(sl, M, 0.52, etiqueta);
  sl.addText(texto, {
    x: M, y: etiqueta ? 0.9 : 0.6, w: W - M * 2, h: 0.85, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 33, bold: true, color: colorTexto || TINTA,
  });
  if (bajada) {
    sl.addText(bajada, {
      x: M, y: etiqueta ? 1.72 : 1.42, w: W - M * 2 - 1.0, h: 0.5, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 15.5, color: SEC,
    });
  }
}

function tarjeta(sl, x, y, w, h, relleno, borde) {
  sl.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: relleno || PAPEL }, line: { color: borde || LINEA, width: 1 },
  });
}

function cierre(sl, texto, color) {
  sl.addText(texto, {
    x: M, y: 6.45, w: W - M * 2, h: 0.55, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, italic: true, color: color || TINTA,
  });
}

/** Palabra suelta, como ficha de texto. Sirve para mostrar la predicción. */
function ficha(sl, x, y, w, texto, color, relleno) {
  sl.addShape(p.ShapeType.roundRect, {
    x, y, w, h: 0.5, rectRadius: 0.07,
    fill: { color: relleno || PAPEL }, line: { color: color || LINEA, width: color ? 1.5 : 1 },
  });
  sl.addText(texto, {
    x, y, w, h: 0.5, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 13, bold: true, color: color || TINTA,
    align: "center", valign: "middle",
  });
}

// ═══ 1 · Portada ═══════════════════════════════════════════════════════════
{
  const sl = s(TINTA);
  tag(sl, M, 2.3, "// PARA ENTENDERLA Y PODER EXPLICARLA", "8FA6F5");
  sl.addText("Cómo funciona\nla IA que contesta", {
    x: M, y: 2.7, w: 10.5, h: 1.9, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 44, bold: true, color: PAPEL, lineSpacing: 50,
  });
  sl.addText("Sin tecnicismos, pero sin mentiras piadosas. Al terminar vas a poder explicarle a alguien más qué es, qué no es, y por qué falla cuando falla.", {
    x: M, y: 4.85, w: 9.2, h: 0.9, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 16, color: "AEB8C6",
  });
  sl.addNotes("Arrancar preguntando al público: ¿qué creen que hace la IA cuando le escriben?");
}

// ═══ 2 · Lo que no es ══════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Empecemos por lo que NO es", "Tres ideas equivocadas que hacen que la gente la use mal.", "// LOS TRES MITOS");
  const mitos = [
    ["No es una persona", "No entiende como tú. No tiene intenciones, ni ganas, ni opinión propia. Parece que sí porque escribe como nosotros."],
    ["No es un buscador", "No va a internet a consultar cada vez que le preguntas. Contesta con lo que quedó en ella, y eso tiene fecha."],
    ["No es una base de datos", "No guarda tus datos ni los de nadie en una tabla que pueda consultar. No hay dónde ir a buscar el dato exacto."],
  ];
  mitos.forEach(([t, d], i) => {
    const x = M + i * 4.05;
    tarjeta(sl, x, 2.45, 3.7, 3.5);
    sl.addShape(p.ShapeType.ellipse, { x: x + 0.35, y: 2.8, w: 0.44, h: 0.44, fill: { color: NARANJA } });
    sl.addText("✕", {
      x: x + 0.35, y: 2.8, w: 0.44, h: 0.44, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 15, bold: true, color: PAPEL, align: "center", valign: "middle",
    });
    sl.addText(t, {
      x: x + 0.35, y: 3.45, w: 3.0, h: 0.75, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 20, bold: true, color: TINTA,
    });
    sl.addText(d, {
      x: x + 0.35, y: 4.3, w: 3.0, h: 1.5, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13.5, color: SEC,
    });
  });
  cierre(sl, "Casi todos los problemas con la IA vienen de esperar que sea una de estas tres cosas.");
}

// ═══ 3 · Lo que sí es ══════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Lo que sí es: adivina lo que sigue", "Una máquina entrenada para continuar un texto. Nada más. Y nada menos.", "// LA IDEA CENTRAL");
  tarjeta(sl, M, 2.5, 11.8, 1.55, PAPEL);
  sl.addText("El cielo está", {
    x: M + 0.5, y: 2.5, w: 3.4, h: 1.55, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 19, color: TINTA, valign: "middle",
  });
  sl.addText("→", {
    x: M + 3.9, y: 2.5, w: 0.6, h: 1.55, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 22, bold: true, color: SEC, align: "center", valign: "middle",
  });
  [["azul", "87%"], ["nublado", "9%"], ["cayendo", "1%"]].forEach(([pal, prob], i) => {
    const x = M + 4.7 + i * 2.35;
    ficha(sl, x, 2.85, 2.1, pal, i === 0 ? AZUL : LINEA, i === 0 ? "EAEFFE" : PAPEL);
    sl.addText(prob, {
      x, y: 3.42, w: 2.1, h: 0.45, isTextBox: true, margin: 0,
      fontFace: MONO, fontSize: 12, bold: true, color: i === 0 ? AZUL : SEC, align: "center",
    });
  });
  sl.addText("Escoge la más probable, la escribe, y vuelve a empezar con la palabra nueva ya incluida. Así, una por una, hasta armar el párrafo completo.", {
    x: M, y: 4.35, w: 11.8, h: 0.75, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15.5, color: TINTA,
  });
  tarjeta(sl, M, 5.2, 11.8, 1.05, "EAEFFE", AZUL);
  sl.addText("Todo lo demás —que conteste preguntas, que traduzca, que resuma— sale de esa sola habilidad, hecha muy muy bien.", {
    x: M + 0.45, y: 5.2, w: 11.0, h: 1.05, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, bold: true, color: TINTA, valign: "middle",
  });
}

// ═══ 4 · Cómo aprendió ═════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Cómo aprendió a hacer eso", "Nadie le escribió reglas de gramática ni le cargó una enciclopedia.", "// EL ENTRENAMIENTO");
  const pasos = [
    ["01", "Leyó muchísimo", "Cantidades de texto que una persona no alcanzaría a leer en miles de vidas: libros, artículos, conversaciones, código."],
    ["02", "Jugó a adivinar", "Se le tapaba la palabra siguiente y tenía que adivinarla. Millones de millones de veces. Cada error la corregía un poquito."],
    ["03", "Le enseñaron modales", "Después, personas le mostraron qué respuestas eran útiles y cuáles no. De ahí sale que conteste en vez de solo continuar el texto."],
  ];
  pasos.forEach(([n, t, d], i) => {
    const y = 2.5 + i * 1.42;
    tarjeta(sl, M, y, 11.8, 1.2);
    tag(sl, M + 0.4, y + 0.22, n);
    sl.addText(t, {
      x: M + 1.15, y, w: 3.5, h: 1.2, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 19, bold: true, color: TINTA, valign: "middle",
    });
    sl.addText(d, {
      x: M + 4.9, y, w: 6.6, h: 1.2, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13.5, color: SEC, valign: "middle",
    });
  });
  cierre(sl, "De tanto adivinar la palabra siguiente, terminó aprendiendo cómo funciona el mundo del que habla ese texto.");
}

// ═══ 5 · Por qué inventa ═══════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Por qué inventa cosas", "Y por qué las inventa con el mismo tono seguro con que dice las verdades.", "// LA FALLA MÁS FAMOSA");
  tarjeta(sl, M, 2.5, 5.65, 3.4, PAPEL, NARANJA);
  tag(sl, M + 0.4, 2.8, "LO QUE PASA", NARANJA);
  sl.addText("Su trabajo es continuar el texto de forma convincente — no decir la verdad. Cuando no tiene el dato, no se queda callada: escribe lo que MÁS SE PARECE a un dato correcto.\n\nUn nombre plausible. Una cifra redonda. Una fecha creíble.", {
    x: M + 0.4, y: 3.25, w: 4.85, h: 2.4, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, color: TINTA,
  });
  tarjeta(sl, M + 6.15, 2.5, 5.65, 3.4, PAPEL, VERDE);
  tag(sl, M + 6.55, 2.8, "QUÉ SE HACE AL RESPECTO", VERDE);
  sl.addText([
    { text: "Darle los datos buenos junto con la pregunta", options: { bullet: true, breakLine: true } },
    { text: "Decirle por escrito qué NO tiene permitido afirmar", options: { bullet: true, breakLine: true } },
    { text: "Dejarle claro que puede decir \"no sé\"", options: { bullet: true, breakLine: true } },
    { text: "Y revisar lo que importa antes de publicarlo", options: { bullet: true } },
  ], {
    x: M + 6.55, y: 3.25, w: 4.85, h: 2.4, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, color: TINTA, paraSpaceAfter: 9,
  });
  cierre(sl, "No es que mienta: es que no distingue entre saber y sonar bien. Esa distinción se la tienes que poner tú.", NARANJA);
}

// ═══ 6 · No lee letras ═════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "No lee letras: lee pedazos", "Esto explica varias de sus fallas más raras, las que parecen tontas.", "// CÓMO VE EL TEXTO");
  sl.addText("Antes de leer, el texto se parte en pedacitos. A veces un pedazo es una palabra entera, a veces solo un trozo:", {
    x: M, y: 2.4, w: 11.8, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, color: TINTA,
  });
  const trozos = ["Ciu", "dad", " Ma", "der", "as"];
  let x = M;
  trozos.forEach((t) => {
    const w = 0.35 + t.length * 0.32;
    ficha(sl, x, 3.05, w, t, AZUL, "EAEFFE");
    x += w + 0.14;
  });
  sl.addText("Ella nunca vio la palabra completa: vio esos cinco pedazos.", {
    x: M, y: 3.72, w: 11.8, h: 0.4, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13, italic: true, color: SEC,
  });
  const fallas = [
    ["Contar letras", "Pídele cuántas erres tiene una palabra y se equivoca: no está viendo letras."],
    ["Deletrear al revés", "Igual. Está trabajando con pedazos, no con el abecedario."],
    ["Matemáticas largas", "No calcula: predice cómo se ve un resultado. Por eso conviene darle calculadora."],
  ];
  fallas.forEach(([t, d], i) => {
    const cx = M + i * 4.05;
    tarjeta(sl, cx, 4.35, 3.7, 1.9);
    sl.addText(t, {
      x: cx + 0.35, y: 4.55, w: 3.0, h: 0.4, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 16, bold: true, color: TINTA,
    });
    sl.addText(d, {
      x: cx + 0.35, y: 5.0, w: 3.0, h: 1.1, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: SEC,
    });
  });
  cierre(sl, "Cuando falla en algo que a un niño le sale fácil, casi siempre es por esto.");
}

// ═══ 7 · No tiene memoria ══════════════════════════════════════════════════
{
  const sl = s(TINTA);
  titulo(sl, "No tiene memoria", "Esta es la que más cuesta creer, y la que más cambia cómo la usas.", "// LO MÁS IMPORTANTE", PAPEL);
  tarjeta(sl, M, 2.6, 5.65, 3.3, "232742", "3D4463");
  tag(sl, M + 0.4, 2.9, "LO QUE PARECE", "8FA6F5");
  sl.addText("Que se acuerda de lo que le dijiste hace rato, porque lo menciona sin que se lo repitas.", {
    x: M + 0.4, y: 3.35, w: 4.85, h: 2.2, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, color: "C9D2E4",
  });
  tarjeta(sl, M + 6.15, 2.6, 5.65, 3.3, "232742", AZUL);
  tag(sl, M + 6.55, 2.9, "LO QUE PASA DE VERDAD", "8FA6F5");
  sl.addText("Cada vez que contesta, se le vuelve a mandar TODA la conversación desde el principio. Lee todo otra vez, contesta, y olvida todo.\n\nEl que recuerda es el programa que la usa, no ella.", {
    x: M + 6.55, y: 3.35, w: 4.85, h: 2.2, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, color: PAPEL,
  });
  sl.addText("Es como un empleado brillante con amnesia total: cada mañana le entregas el expediente completo, resuelve, y al día siguiente no te conoce.", {
    x: M, y: 6.2, w: W - M * 2, h: 0.7, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, italic: true, color: "AEB8C6",
  });
}

// ═══ 8 · El contexto ═══════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Todo lo que cabe en la mesa", "A eso que se le manda cada vez se le llama contexto. Tiene un límite.", "// EL CONTEXTO");
  const capas = [
    ["Las instrucciones", "Quién es, cómo debe hablar, qué no puede decir", AZUL],
    ["Lo que sabe del negocio", "Los pedazos de tus documentos que hacen falta hoy", AZUL],
    ["La conversación", "Todo lo que se han dicho hasta ahora", AZUL],
    ["Y por fin, tu pregunta", "Que es la parte más chica de todo", VERDE],
  ];
  capas.forEach(([t, d, color], i) => {
    const y = 2.5 + i * 0.95;
    tarjeta(sl, M, y, 8.3, 0.8, i === 3 ? "EAF5EE" : PAPEL, i === 3 ? VERDE : LINEA);
    sl.addText(t, {
      x: M + 0.4, y, w: 3.2, h: 0.8, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14.5, bold: true, color: TINTA, valign: "middle",
    });
    sl.addText(d, {
      x: M + 3.8, y, w: 4.3, h: 0.8, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: SEC, valign: "middle",
    });
  });
  tarjeta(sl, M + 8.9, 2.5, 2.9, 3.3, "FDF0EC", NARANJA);
  tag(sl, M + 9.25, 2.8, "EL LÍMITE", NARANJA);
  sl.addText("La mesa tiene tamaño. Cuando ya no cabe, lo más viejo se cae.\n\nPor eso una conversación larguísima empieza a olvidar el principio.", {
    x: M + 9.25, y: 3.25, w: 2.2, h: 2.35, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 12.5, color: TINTA,
  });
  cierre(sl, "Todo lo que quieras que tome en cuenta tiene que estar en esa mesa. Lo que no está, para ella no existe.");
}

// ═══ 9 · Por eso cuesta ════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Por eso cada mensaje cuesta", "No se paga por tiempo ni por usuario: se paga por texto.", "// EL COSTO");
  const partes = [
    ["Lo que entra", "Todo lo que se le manda: instrucciones, documentos y la conversación entera. Suele ser mucho más de lo que la persona escribió.", AZUL],
    ["Lo que sale", "Su respuesta. Es la parte chica, pero se cobra más caro por pedazo.", VERDE],
  ];
  partes.forEach(([t, d, color], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.5, 5.65, 2.5, PAPEL, color);
    sl.addText(t, {
      x: x + 0.4, y: 2.8, w: 4.85, h: 0.5, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 21, bold: true, color: TINTA,
    });
    sl.addText(d, {
      x: x + 0.4, y: 3.4, w: 4.85, h: 1.3, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13.5, color: SEC,
    });
  });
  tarjeta(sl, M, 5.25, 11.8, 1.3, "EAEFFE", AZUL);
  sl.addText("Consecuencia práctica: mientras más larga la conversación, más caro cada mensaje siguiente — porque se vuelve a mandar todo. Un buen sistema recorta lo que ya no sirve.", {
    x: M + 0.45, y: 5.25, w: 11.0, h: 1.3, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, bold: true, color: TINTA, valign: "middle",
  });
}

// ═══ 10 · Por qué no contesta igual ════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Por qué no contesta igual dos veces", "La misma pregunta, dos respuestas distintas. No está fallando.", "// EL AZAR");
  sl.addText("Cuando escoge la palabra siguiente, no siempre toma la más probable. A veces toma la segunda o la tercera, a propósito.", {
    x: M, y: 2.45, w: 11.8, h: 0.6, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15.5, color: TINTA,
  });
  const modos = [
    ["Sin variación", "Siempre la más probable. Repetitiva, pero predecible.", "para datos y cifras", VERDE],
    ["Con variación", "Escoge entre las buenas. Suena natural y no se repite.", "para conversar", AZUL],
    ["Mucha variación", "Se atreve más. Creativa, y también más propensa a irse por las ramas.", "para ideas sueltas", NARANJA],
  ];
  modos.forEach(([t, d, uso, color], i) => {
    const x = M + i * 4.05;
    tarjeta(sl, x, 3.25, 3.7, 2.6, PAPEL, color);
    sl.addText(t, {
      x: x + 0.35, y: 3.5, w: 3.0, h: 0.45, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 18, bold: true, color: TINTA,
    });
    sl.addText(d, {
      x: x + 0.35, y: 4.0, w: 3.0, h: 1.1, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13, color: SEC,
    });
    ficha(sl, x + 0.35, 5.15, 3.0, uso, color, PAPEL);
  });
  cierre(sl, "Se ajusta. Un bot que da precios se configura distinto de uno que escribe publicaciones.");
}

// ═══ 11 · Separador ════════════════════════════════════════════════════════
{
  const sl = s(TINTA);
  tag(sl, M, 2.7, "// SEGUNDA PARTE", "8FA6F5");
  sl.addText("Cómo se le hace útil\npara un negocio", {
    x: M, y: 3.1, w: 11, h: 1.7, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 40, bold: true, color: PAPEL, lineSpacing: 46,
  });
  sl.addText("Hasta aquí es una máquina de texto muy capaz que no sabe nada de ti. Esto es lo que la convierte en algo que trabaja.", {
    x: M, y: 5.0, w: 9.5, h: 0.7, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 16, color: "AEB8C6",
  });
}

// ═══ 12 · Las tres formas ══════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Tres formas de que sepa lo tuyo", "Se parecen, pero cuestan y sirven para cosas muy distintas.", "// HACER QUE SEPA");
  const formas = [
    ["Decírselo cada vez", "Le mandas las reglas y los datos junto con la pregunta.",
      ["Barato y rápido", "Cambiarlo es editar un texto", "Pero ocupa lugar en la mesa"], VERDE],
    ["Que lo busque", "Guardas tus documentos aparte, y en cada pregunta se buscan solo los pedazos que hacen falta.",
      ["Aguanta mucha información", "Se actualiza sin tocar nada más", "Es lo que usa casi todo el mundo"], AZUL],
    ["Reentrenarla", "Le enseñas con miles de ejemplos hasta cambiarle el comportamiento de fondo.",
      ["Caro y lento", "Se re-hace con cada cambio", "Casi nunca hace falta"], NARANJA],
  ];
  formas.forEach(([t, d, puntos, color], i) => {
    const x = M + i * 4.05;
    tarjeta(sl, x, 2.5, 3.7, 3.85, PAPEL, color);
    sl.addText(t, {
      x: x + 0.35, y: 2.75, w: 3.0, h: 0.5, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 19, bold: true, color: TINTA,
    });
    sl.addText(d, {
      x: x + 0.35, y: 3.3, w: 3.0, h: 1.15, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13, color: SEC,
    });
    puntos.forEach((pt, k) => {
      sl.addText("· " + pt, {
        x: x + 0.35, y: 4.55 + k * 0.5, w: 3.0, h: 0.45, isTextBox: true, margin: 0,
        fontFace: SANS, fontSize: 12.5, color: TINTA, valign: "middle",
      });
    });
  });
  cierre(sl, "Casi todo lo que la gente cree que necesita reentrenar se resuelve con las dos primeras.");
}

// ═══ 13 · De hablar a hacer ════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "De hablar a hacer: las herramientas", "Sola solo escribe. Con herramientas, actúa.", "// LAS HERRAMIENTAS");
  sl.addText("Se le da una lista de cosas que puede pedir —buscar un dato, guardar un registro, mandar un aviso— y ella decide cuándo usarlas. No las ejecuta: las pide, y el programa las ejecuta por ella.", {
    x: M, y: 2.4, w: 11.8, h: 0.85, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, color: TINTA,
  });
  const flujo = [
    ["Lee la petición", "\"Apúntame para el martes\""],
    ["Escoge la herramienta", "agendar(fecha)"],
    ["El programa la ejecuta", "y le devuelve el resultado"],
    ["Contesta con eso", "\"Listo, quedó el martes\""],
  ];
  const w = 2.75, gap = 0.28;
  flujo.forEach(([t, d], i) => {
    const x = M + i * (w + gap);
    tarjeta(sl, x, 3.4, w, 2.15, PAPEL, i === 2 ? VERDE : LINEA);
    tag(sl, x + 0.25, 3.62, String(i + 1).padStart(2, "0"), i === 2 ? VERDE : AZUL);
    sl.addText(t, {
      x: x + 0.25, y: 4.0, w: w - 0.5, h: 0.7, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 15.5, bold: true, color: TINTA,
    });
    sl.addText(d, {
      x: x + 0.25, y: 4.7, w: w - 0.5, h: 0.65, isTextBox: true, margin: 0,
      fontFace: MONO, fontSize: 11, color: SEC,
    });
  });
  tarjeta(sl, M, 5.75, 11.8, 0.95, "EAEFFE", AZUL);
  sl.addText("Este es el salto grande de los últimos años: de un chat que informa, a algo que hace cosas por ti.", {
    x: M + 0.45, y: 5.75, w: 11.0, h: 0.95, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, bold: true, color: TINTA, valign: "middle",
  });
}

// ═══ 14 · Bueno y malo ═════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "En qué es buena y en qué no", "Saber esto de antemano ahorra la mayoría de las decepciones.", "// LÍMITES REALES");
  tarjeta(sl, M, 2.5, 5.65, 3.75, PAPEL, VERDE);
  tag(sl, M + 0.4, 2.8, "BUENA", VERDE);
  sl.addText([
    { text: "Escribir, resumir y traducir", options: { bullet: true, breakLine: true } },
    { text: "Conversar sin cansarse ni perder el tono", options: { bullet: true, breakLine: true } },
    { text: "Encontrar lo que importa en un montón de texto", options: { bullet: true, breakLine: true } },
    { text: "Repetir un mismo procedimiento sin desviarse", options: { bullet: true, breakLine: true } },
    { text: "Estar disponible siempre, a la misma velocidad", options: { bullet: true } },
  ], {
    x: M + 0.4, y: 3.25, w: 4.85, h: 2.75, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13.5, color: TINTA, paraSpaceAfter: 8,
  });
  tarjeta(sl, M + 6.15, 2.5, 5.65, 3.75, PAPEL, NARANJA);
  tag(sl, M + 6.55, 2.8, "MALA", NARANJA);
  sl.addText([
    { text: "Datos exactos que no le diste (los inventa)", options: { bullet: true, breakLine: true } },
    { text: "Cuentas largas sin calculadora", options: { bullet: true, breakLine: true } },
    { text: "Saber qué pasó ayer, si nadie se lo contó", options: { bullet: true, breakLine: true } },
    { text: "Decir \"no sé\" cuando no se lo enseñaron", options: { bullet: true, breakLine: true } },
    { text: "Decisiones donde alguien sale perjudicado", options: { bullet: true } },
  ], {
    x: M + 6.55, y: 3.25, w: 4.85, h: 2.75, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13.5, color: TINTA, paraSpaceAfter: 8,
  });
  cierre(sl, "La regla corta: es excelente con el lenguaje, y hay que desconfiar de ella con los hechos.");
}

// ═══ 15 · La persona detrás ════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Por qué siempre hay una persona detrás", "No por desconfianza: por cómo está hecha.", "// EL LÍMITE QUE NO SE QUITA");
  const razones = [
    ["Se equivoca con el mismo tono", "Cuando acierta y cuando inventa suena idéntica. No hay señal de alarma en su voz."],
    ["No sabe lo que no le contaron", "Lo que se acordó por teléfono, lo que no conviene decir, el cliente que ya viene enojado."],
    ["No responde por sus errores", "Si promete algo que no se puede cumplir, el que responde eres tú. La responsabilidad no se delega."],
  ];
  razones.forEach(([t, d], i) => {
    const y = 2.5 + i * 1.32;
    tarjeta(sl, M, y, 11.8, 1.12);
    sl.addShape(p.ShapeType.ellipse, { x: M + 0.4, y: y + 0.34, w: 0.42, h: 0.42, fill: { color: TINTA } });
    sl.addText(String(i + 1), {
      x: M + 0.4, y: y + 0.34, w: 0.42, h: 0.42, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, bold: true, color: PAPEL, align: "center", valign: "middle",
    });
    sl.addText(t, {
      x: M + 1.1, y, w: 4.0, h: 1.12, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 17, bold: true, color: TINTA, valign: "middle",
    });
    sl.addText(d, {
      x: M + 5.35, y, w: 6.1, h: 1.12, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13.5, color: SEC, valign: "middle",
    });
  });
  cierre(sl, "Bien usada no reemplaza a nadie: le quita lo repetitivo y le deja lo que sí necesita criterio.");
}

// ═══ 16 · Cierre ═══════════════════════════════════════════════════════════
{
  const sl = s(TINTA);
  tag(sl, M, 1.3, "// PARA EXPLICARLO EN UN MINUTO", "8FA6F5");
  sl.addText("Si te quedas con cinco frases,\nque sean estas.", {
    x: M, y: 1.72, w: 11.5, h: 1.6, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 32, bold: true, color: PAPEL, lineSpacing: 40,
  });
  const frases = [
    "Adivina la palabra que sigue. Todo lo demás sale de ahí.",
    "No tiene memoria: cada vez se le vuelve a contar todo.",
    "Cuando no sabe, no se calla — inventa algo que suena bien.",
    "Sabe de tu negocio solo lo que le pongas enfrente.",
    "Con herramientas deja de solo hablar y empieza a hacer.",
  ];
  frases.forEach((f, i) => {
    const y = 3.6 + i * 0.72;
    sl.addShape(p.ShapeType.ellipse, { x: M, y: y + 0.1, w: 0.26, h: 0.26, fill: { color: i === 2 ? NARANJA : "8FA6F5" } });
    sl.addText(f, {
      x: M + 0.55, y, w: 11.2, h: 0.46, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 16, color: PAPEL, valign: "middle",
    });
  });
}

p.writeFile({ fileName: "como-funciona-la-ia.pptx" }).then((f) => console.log("listo:", f));
