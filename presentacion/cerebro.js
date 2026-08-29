// "Detrás de cámara": el cerebro, y el ciclo maestro–alumno.
//
// Todo lo que se afirma aquí salió de leer el código, no de suponer:
// src/upgrade/modelSelector.ts (las reglas del selector), src/agent.ts (el
// guardia de presupuesto y el caché del prompt), src/flywheel/detect.ts y
// apply.ts (el maestro), src/tools/searchKb.ts (topK 5).
//
//   node cerebro.js && python3 vista.py detras-de-camara.pptx && node foto.js
const pptx = require("pptxgenjs");
const p = new pptx();
p.layout = "LAYOUT_WIDE";
p.author = "Sistema";
p.title = "Detrás de cámara";

// Paleta de sala de máquinas: grafito de fondo, turquesa de osciloscopio para
// la señal (el alumno) y ámbar para quien enseña (el maestro).
const GRAFITO = "1A1F24";
const SUP = "252D35";      // superficie de tarjeta
const SUP2 = "2F3941";     // superficie elevada
const TEXTO = "E8EDF1";
const SEC = "92A0AC";
const SENAL = "4FD1C5";    // el alumno / la señal viva
const AMBAR = "E0A458";    // el maestro / lo que enseña
const ALERTA = "E06C5A";
const LINEA = "3A454E";

const DISPLAY = "Bookman Old Style";
const SANS = "Calibri";
const MONO = "Courier New";

const W = 13.3, H = 7.5, M = 0.75;
const s = () => { const sl = p.addSlide(); sl.background = { color: GRAFITO }; return sl; };

/** Etiqueta monoespaciada: el motivo que se repite y dice "máquina". */
function tag(sl, x, y, texto, color = SENAL, tam = 11.5) {
  sl.addText(texto, {
    x, y, w: 5, h: 0.3, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: tam, bold: true, color, charSpacing: 1.5,
  });
}

function titulo(sl, texto, bajada, etiqueta) {
  if (etiqueta) tag(sl, M, 0.5, etiqueta);
  sl.addText(texto, {
    x: M, y: etiqueta ? 0.88 : 0.6, w: W - M * 2, h: 0.8, isTextBox: true, margin: 0,
    fontFace: DISPLAY, fontSize: 32, bold: true, color: TEXTO,
  });
  if (bajada) {
    sl.addText(bajada, {
      x: M, y: etiqueta ? 1.68 : 1.4, w: W - M * 2 - 1.5, h: 0.5, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 15, color: SEC,
    });
  }
}

function tarjeta(sl, x, y, w, h, relleno, borde) {
  sl.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: relleno || SUP },
    line: { color: borde || LINEA, width: 1 },
  });
}

/** Pastilla de dato — para valores concretos (15 s, topK 5, $25). */
function pastilla(sl, x, y, w, texto, color = SENAL) {
  sl.addShape(p.ShapeType.roundRect, {
    x, y, w, h: 0.42, rectRadius: 0.21,
    fill: { color: GRAFITO }, line: { color, width: 1.25 },
  });
  sl.addText(texto, {
    x, y, w, h: 0.42, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 12, bold: true, color,
    align: "center", valign: "middle",
  });
}

// ═══ 1 · Portada ═══════════════════════════════════════════════════════════
{
  const sl = s();
  tag(sl, M, 2.35, "// SISTEMA", SENAL, 13);
  sl.addText("Detrás de cámara", {
    x: M, y: 2.75, w: 10, h: 1.1, isTextBox: true, margin: 0,
    fontFace: DISPLAY, fontSize: 46, bold: true, color: TEXTO,
  });
  sl.addText("El cerebro que responde, y el ciclo que lo hace mejorar solo.", {
    x: M, y: 4.0, w: 9, h: 0.55, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 18, color: SEC,
  });
  ["Dos cerebros, no uno", "Quién decide cuál", "El maestro y el alumno"].forEach((t, i) => {
    pastilla(sl, M + i * 3.35, 5.05, 3.1, t, i === 2 ? AMBAR : SENAL);
  });
  sl.addNotes("No habla de un negocio en particular: habla de la máquina.");
}

// ═══ 2 · Qué pasa entre el mensaje y la respuesta ══════════════════════════
{
  const sl = s();
  titulo(sl, "Qué pasa entre el mensaje y la respuesta",
    "Al cliente le parece instantáneo. Adentro son cinco pasos, siempre los mismos.", "// EL RECORRIDO");
  const pasos = [
    ["Espera", "Junta los mensajes\nseguidos antes de\npensar", "15 s"],
    ["Recuerda", "Recupera la plática\ny lo que sabe del\nnegocio", "5 trozos"],
    ["Elige", "Decide con cuál de\nlos dos cerebros\nresponder", "rápido | listo"],
    ["Responde", "Escribe, y si hace\nfalta usa sus\nherramientas", "tools"],
    ["Anota", "Guarda el costo,\nel resultado y\nqué falló", "D1"],
  ];
  const w = 2.28, gap = 0.24;
  pasos.forEach(([t, d, dato], i) => {
    const x = M + i * (w + gap);
    tarjeta(sl, x, 2.35, w, 3.55);
    tag(sl, x + 0.22, 2.6, String(i + 1).padStart(2, "0"), SENAL, 12);
    sl.addText(t, {
      x, y: 3.0, w, h: 0.42, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 18, bold: true, color: TEXTO, align: "center",
    });
    sl.addText(d, {
      x: x + 0.18, y: 3.5, w: w - 0.36, h: 1.5, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: SEC, align: "center",
    });
    pastilla(sl, x + 0.28, 5.25, w - 0.56, dato);
  });
  sl.addText("Cada paso deja rastro. Por eso, cuando algo sale mal, se puede señalar exactamente dónde.", {
    x: M, y: 6.35, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 3 · Qué es el cerebro ═════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "El cerebro no sabe nada de tu negocio",
    "Y esa es la parte que más confunde a quien lo ve por fuera.", "// EL CEREBRO");
  tarjeta(sl, M, 2.4, 5.9, 3.6);
  tag(sl, M + 0.4, 2.7, "LO QUE TRAE DE FÁBRICA", SEC, 11);
  sl.addText("Sabe idioma, tono y cómo conversar. Puede razonar sobre lo que le pongas enfrente.\n\nPero de tus precios, tus plazas o tus reglas: nada. Nunca las ha visto.", {
    x: M + 0.4, y: 3.15, w: 5.1, h: 2.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, color: TEXTO,
  });
  tarjeta(sl, M + 6.35, 2.4, 5.9, 3.6, SUP2, SENAL);
  tag(sl, M + 6.75, 2.7, "LO QUE LE DAMOS EN CADA MENSAJE", SENAL, 11);
  sl.addText([
    { text: "Las reglas del negocio, escritas", options: { bullet: true, breakLine: true } },
    { text: "Los pedazos de conocimiento que hacen falta", options: { bullet: true, breakLine: true } },
    { text: "Lo que ya se dijo en esta conversación", options: { bullet: true, breakLine: true } },
    { text: "Las herramientas que puede usar", options: { bullet: true } },
  ], {
    x: M + 6.75, y: 3.15, w: 5.1, h: 2.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, color: TEXTO, paraSpaceAfter: 8,
  });
  sl.addText("El cerebro es el motor. Lo que lo vuelve TU bot es todo lo que le llega alrededor.", {
    x: M, y: 6.35, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 4 · Dos cerebros ══════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Dos cerebros, no uno",
    "Uno barato que atiende casi todo, y uno caro que entra cuando el turno se pone difícil.",
    "// LOS DOS NIVELES");
  const niveles = [
    [SENAL, "RÁPIDO", "El de todos los días",
      "Contesta el 90% de los mensajes: precios, ubicaciones, dudas normales. Cuesta centavos.",
      "por defecto"],
    [AMBAR, "LISTO", "El refuerzo",
      "Entra solo cuando el turno lo amerita. Cuesta varias veces más, y por eso no se usa siempre.",
      "solo cuando toca"],
  ];
  niveles.forEach(([color, clave, t, d, nota], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.45, 5.65, 3.5, SUP, color);
    tag(sl, x + 0.4, 2.75, clave, color, 13);
    sl.addText(t, {
      x: x + 0.4, y: 3.15, w: 4.85, h: 0.5, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 24, bold: true, color: TEXTO,
    });
    sl.addText(d, {
      x: x + 0.4, y: 3.8, w: 4.85, h: 1.4, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, color: SEC,
    });
    pastilla(sl, x + 0.4, 5.2, 2.3, nota, color);
  });
  sl.addText("Tener dos es lo que hace que el costo por respuesta se quede en centavos sin que la calidad se caiga cuando importa.", {
    x: M, y: 6.35, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 5 · El selector ═══════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Quién decide cuál usar",
    "No lo decide el cerebro. Lo decide una regla escrita, antes de pensar, en cada mensaje.",
    "// EL SELECTOR");
  const reglas = [
    ["El bot toma pedidos o citas", "Esos flujos son de varios pasos y el barato los aplasta en un solo mensaje"],
    ["Ya usó herramientas más de 3 veces", "Señal de que el turno se enredó"],
    ["La búsqueda en su conocimiento salió floja", "Si no encontró buen material, necesita más cabeza para no inventar"],
    ["El cliente suena molesto", "Palabras de frustración: ahí no se puede quedar corto"],
    ["Una imagen que ya falló una vez", "El segundo intento va con el bueno"],
  ];
  reglas.forEach(([t, d], i) => {
    const y = 2.4 + i * 0.82;
    tarjeta(sl, M, y, 11.8, 0.7, SUP, LINEA);
    sl.addText(t, {
      x: M + 0.35, y, w: 5.0, h: 0.7, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, bold: true, color: TEXTO, valign: "middle",
    });
    sl.addText(d, {
      x: M + 5.5, y, w: 5.0, h: 0.7, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: SEC, valign: "middle",
    });
    pastilla(sl, M + 10.75, y + 0.14, 0.85, "LISTO", AMBAR);
  });
  sl.addText("Si ninguna se cumple, va el rápido. Es la respuesta por defecto, no la excepción.", {
    x: M, y: 6.65, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 6 · El guardia del gasto ══════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "El guardia del gasto",
    "Un bot en bucle puede quemar una tarjeta en una noche. Por eso hay dos frenos, no uno.",
    "// PRESUPUESTO");
  const frenos = [
    [AMBAR, "AL LLEGAR AL TOPE", "Baja a barato", "Sigue contestando a todos, nada más que con el cerebro económico. El cliente no nota nada."],
    [ALERTA, "AL DOBLE DEL TOPE", "Se detiene y avisa", "Deja de gastar y le manda aviso al dueño. Es el freno de mano, para una fuga."],
  ];
  frenos.forEach(([color, clave, t, d], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.5, 5.65, 2.75, SUP, color);
    tag(sl, x + 0.4, 2.8, clave, color, 11);
    sl.addText(t, {
      x: x + 0.4, y: 3.2, w: 4.85, h: 0.5, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 22, bold: true, color: TEXTO,
    });
    sl.addText(d, {
      x: x + 0.4, y: 3.8, w: 4.85, h: 1.2, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13.5, color: SEC,
    });
  });
  tarjeta(sl, M, 5.5, 11.8, 1.15, SUP2, LINEA);
  sl.addText("Si la cuenta del gasto falla, el turno NO se bloquea: la respuesta sale igual. Más vale contestar de más que dejar a alguien hablando solo.", {
    x: M + 0.45, y: 5.5, w: 11.0, h: 1.15, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, color: TEXTO, valign: "middle",
  });
}

// ═══ 7 · Las dos memorias ══════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Las dos memorias",
    "Una guarda la conversación. La otra guarda lo que el negocio sabe. No se mezclan.",
    "// MEMORIA");
  const mem = [
    ["LA DE LA PLÁTICA", "Vive mientras dure la conversación con esa persona. Recuerda lo que ya se dijo para no volver a preguntarlo.",
      ["Una por cliente", "Se despierta al llegar un mensaje"]],
    ["LA DEL NEGOCIO", "Es todo lo que sabe: precios, procesos, reglas. No se le manda entera — en cada mensaje se buscan solo los pedazos que hacen falta.",
      ["5 trozos por consulta", "Buscados por significado, no por palabra"]],
  ];
  mem.forEach(([clave, d, datos], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.45, 5.65, 3.6, SUP, i === 0 ? SENAL : AMBAR);
    tag(sl, x + 0.4, 2.75, clave, i === 0 ? SENAL : AMBAR, 12);
    sl.addText(d, {
      x: x + 0.4, y: 3.2, w: 4.85, h: 1.7, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, color: TEXTO,
    });
    datos.forEach((dd, k) => {
      pastilla(sl, x + 0.4, 4.95 + k * 0.55, 4.85, dd, i === 0 ? SENAL : AMBAR);
    });
  });
  sl.addText("Buscar por significado es lo que permite que alguien pregunte \"¿me dan chance de pagarlo en partes?\" y encuentre el documento que dice \"financiamiento\".", {
    x: M, y: 6.45, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 8 · El caché ══════════════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Por qué cuesta centavos y no dólares",
    "En cada mensaje se le manda al cerebro un texto largo con todas las reglas. Eso se cobra.",
    "// EL AHORRO");
  tarjeta(sl, M, 2.5, 5.65, 3.3, SUP, LINEA);
  tag(sl, M + 0.4, 2.8, "SIN CACHÉ", ALERTA, 12);
  sl.addText("Cada mensaje paga el texto completo otra vez. Las mismas reglas, cobradas una y otra vez, toda la conversación.", {
    x: M + 0.4, y: 3.25, w: 4.85, h: 2.0, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, color: SEC,
  });
  tarjeta(sl, M + 6.15, 2.5, 5.65, 3.3, SUP2, SENAL);
  tag(sl, M + 6.55, 2.8, "CON CACHÉ", SENAL, 12);
  sl.addText("El bloque de reglas se guarda del lado del proveedor. Del segundo mensaje en adelante se cobra a una fracción del precio.", {
    x: M + 6.55, y: 3.25, w: 4.85, h: 1.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14.5, color: TEXTO,
  });
  pastilla(sl, M + 6.55, 5.0, 4.85, "la mayor parte de la entrada, mucho más barata", SENAL);
  sl.addText("Es el detalle técnico que más cambia la cuenta a fin de mes — y decide qué proveedor conviene, no la moda.", {
    x: M, y: 6.2, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 9 · Separador ═════════════════════════════════════════════════════════
{
  const sl = s();
  sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: "10161B" } });
  tag(sl, M, 2.6, "// SEGUNDA PARTE", AMBAR, 13);
  sl.addText("El maestro y el alumno", {
    x: M, y: 3.0, w: 11, h: 1.1, isTextBox: true, margin: 0,
    fontFace: DISPLAY, fontSize: 44, bold: true, color: TEXTO,
  });
  sl.addText("Cómo el sistema aprende de sus propias fallas — sin que nadie le enseñe a mano.", {
    x: M, y: 4.25, w: 9.5, h: 0.6, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 17, color: SEC,
  });
}

// ═══ 10 · Alumno y maestro ═════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Dos turnos distintos", "El mismo cerebro barato hace los dos trabajos. Lo que cambia es cuándo y para qué.",
    "// LOS DOS PAPELES");
  const papeles = [
    [SENAL, "EL ALUMNO", "De día, con clientes",
      "Contesta. No se detiene a analizarse: su trabajo es responder rápido y bien.",
      "en cada mensaje"],
    [AMBAR, "EL MAESTRO", "De noche, a solas",
      "Lee lo que pasó en el día, busca dónde falló el alumno, y escribe qué debería hacer distinto.",
      "una vez al día"],
  ];
  papeles.forEach(([color, clave, t, d, cuando], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.45, 5.65, 3.5, SUP, color);
    tag(sl, x + 0.4, 2.75, clave, color, 13);
    sl.addText(t, {
      x: x + 0.4, y: 3.15, w: 4.85, h: 0.45, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 22, bold: true, color: TEXTO,
    });
    sl.addText(d, {
      x: x + 0.4, y: 3.75, w: 4.85, h: 1.4, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, color: SEC,
    });
    pastilla(sl, x + 0.4, 5.2, 2.5, cuando, color);
  });
  sl.addText("El maestro corre en el cerebro barato a propósito: revisar no necesita brillantez, necesita constancia.", {
    x: M, y: 6.35, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 11 · Qué busca el maestro ═════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Qué busca el maestro", "Dos señales, y las dos son fallas del alumno. No busca aciertos.",
    "// LOS DOS DETECTORES");
  const det = [
    ["01", "Preguntas que no supo contestar",
      "Cuando alguien preguntó algo y el bot no encontró respuesta en lo que sabe, ahí hay un hueco.",
      "Escribe el documento que faltaba"],
    ["02", "Momentos en que el dueño contestó a mano",
      "Si una persona tuvo que meterse a responder, es porque el bot no supo. Ahí hay una regla que nadie le dijo.",
      "Escribe la regla que debió seguir"],
  ];
  det.forEach(([n, t, d, resultado], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.45, 5.65, 3.75, SUP, AMBAR);
    tag(sl, x + 0.4, 2.75, n, AMBAR, 14);
    sl.addText(t, {
      x: x + 0.4, y: 3.15, w: 4.85, h: 0.85, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 19, bold: true, color: TEXTO,
    });
    sl.addText(d, {
      x: x + 0.4, y: 4.05, w: 4.85, h: 1.35, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13.5, color: SEC,
    });
    pastilla(sl, x + 0.4, 5.5, 4.85, resultado, AMBAR);
  });
  sl.addText("Fijarse solo en lo que falló es lo que hace que el ciclo sirva: los aciertos no enseñan nada nuevo.", {
    x: M, y: 6.55, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 12 · La regla de oro ══════════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "El maestro propone. El dueño aprueba.",
    "Esta es la decisión más importante de todo el diseño, y es una decisión de confianza.",
    "// LA REGLA DE ORO");
  const flujo = [
    [SENAL, "El alumno falla", "Queda registrado"],
    [AMBAR, "El maestro propone", "Redacta la lección o el documento"],
    [TEXTO, "El dueño revisa", "Lo lee en su panel"],
    [SENAL, "Un clic", "Y entra al sistema"],
  ];
  const w = 2.75, gap = 0.28;
  flujo.forEach(([color, t, d], i) => {
    const x = M + i * (w + gap);
    tarjeta(sl, x, 2.55, w, 2.3, SUP, i === 2 ? AMBAR : LINEA);
    tag(sl, x + 0.25, 2.8, String(i + 1).padStart(2, "0"), color === TEXTO ? AMBAR : color, 12);
    sl.addText(t, {
      x: x + 0.25, y: 3.2, w: w - 0.5, h: 0.75, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 17, bold: true, color: TEXTO,
    });
    sl.addText(d, {
      x: x + 0.25, y: 3.95, w: w - 0.5, h: 0.75, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: SEC,
    });
  });
  tarjeta(sl, M, 5.15, 11.8, 1.5, SUP2, AMBAR);
  sl.addText("Un sistema que se cambia a sí mismo sin permiso es un sistema en el que nadie puede confiar. Aquí nada entra al bot sin que una persona lo lea primero — y por eso se puede dormir tranquilo.", {
    x: M + 0.45, y: 5.15, w: 11.0, h: 1.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, color: TEXTO, valign: "middle",
  });
}

// ═══ 13 · Qué pasa al aprobar ══════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Qué pasa cuando el dueño aprueba", "Dos caminos distintos, según lo que se aprendió.",
    "// AL APLICAR");
  const caminos = [
    ["UNA LECCIÓN", "Se agrega a la lista de reglas aprendidas, y desde el siguiente mensaje viaja dentro de las instrucciones del bot.",
      ["Entra al prompt", "La lista tiene tope: lo viejo sale"]],
    ["UN DOCUMENTO", "Se guarda en la base de conocimiento y se indexa de inmediato, para que se pueda encontrar por significado.",
      ["Buscable al instante", "Cierra el hueco en el próximo mensaje"]],
  ];
  caminos.forEach(([clave, d, datos], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.45, 5.65, 3.6, SUP, SENAL);
    tag(sl, x + 0.4, 2.75, clave, SENAL, 13);
    sl.addText(d, {
      x: x + 0.4, y: 3.2, w: 4.85, h: 1.7, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, color: TEXTO,
    });
    datos.forEach((dd, k) => pastilla(sl, x + 0.4, 4.95 + k * 0.55, 4.85, dd, SENAL));
  });
  sl.addText("El ciclo se cierra ahí: la misma pregunta que hoy no supo contestar, mañana ya tiene respuesta.", {
    x: M, y: 6.45, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 14 · Por qué no automático ════════════════════════════════════════════
{
  const sl = s();
  titulo(sl, "Por qué no se aplica solo", "La pregunta que siempre sale, y tiene tres respuestas.",
    "// LA DECISIÓN");
  const razones = [
    ["Un error se multiplica", "Si el maestro entiende mal una conversación y esa lección entra sola, el bot repite ese error con todos los clientes que sigan."],
    ["Nadie se daría cuenta", "Un bot que cambia solo se ve igual por fuera. Cuando se note el problema, ya llevará semanas pasando."],
    ["El dueño sabe cosas que el sistema no", "Por qué se dijo algo así, qué se prometió por fuera, qué no conviene decir. Eso no está en ningún registro."],
  ];
  razones.forEach(([t, d], i) => {
    const y = 2.5 + i * 1.35;
    tarjeta(sl, M, y, 11.8, 1.15, SUP, LINEA);
    tag(sl, M + 0.4, y + 0.2, String(i + 1).padStart(2, "0"), AMBAR, 12);
    sl.addText(t, {
      x: M + 1.15, y, w: 3.9, h: 1.15, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 17, bold: true, color: TEXTO, valign: "middle",
    });
    sl.addText(d, {
      x: M + 5.3, y, w: 6.2, h: 1.15, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13.5, color: SEC, valign: "middle",
    });
  });
  sl.addText("Aprobar toma diez segundos. Es el precio de que el sistema no se desvíe sin que nadie lo note.", {
    x: M, y: 6.65, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: SEC,
  });
}

// ═══ 15 · Cierre ═══════════════════════════════════════════════════════════
{
  const sl = s();
  sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: "10161B" } });
  tag(sl, M, 1.3, "// EN UNA FRASE", SENAL, 13);
  sl.addText("Un motor prestado,\nafinado con lo que aquí pasa.", {
    x: M, y: 1.75, w: 11.5, h: 1.7, isTextBox: true, margin: 0,
    fontFace: DISPLAY, fontSize: 34, bold: true, color: TEXTO, lineSpacing: 42,
  });
  const cierre = [
    ["El cerebro es de fábrica", "no sabe nada del negocio hasta que se le cuenta"],
    ["Son dos, y una regla elige", "el barato por defecto, el caro cuando el turno lo pide"],
    ["Dos frenos cuidan el gasto", "baja de nivel al tope, se detiene al doble"],
    ["Y aprende de lo que falla", "pero nada entra sin que una persona lo apruebe"],
  ];
  cierre.forEach(([t, d], i) => {
    const y = 3.8 + i * 0.78;
    sl.addShape(p.ShapeType.ellipse, { x: M, y: y + 0.09, w: 0.26, h: 0.26, fill: { color: i === 3 ? AMBAR : SENAL } });
    sl.addText(t, {
      x: M + 0.5, y, w: 4.5, h: 0.45, isTextBox: true, margin: 0,
      fontFace: DISPLAY, fontSize: 17, bold: true, color: TEXTO, valign: "middle",
    });
    sl.addText(d, {
      x: M + 5.2, y, w: 6.9, h: 0.45, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, color: SEC, valign: "middle",
    });
  });
}

p.writeFile({ fileName: "detras-de-camara.pptx" }).then((f) => console.log("listo:", f));
