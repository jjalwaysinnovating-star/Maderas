// Presentación del sistema completo: cómo funciona el bot y su guion.
// Colores y tipografía tomados de la marca real (los mismos de la portada y
// los posts), no de una plantilla genérica.
//
//   node deck.js
const pptx = require("pptxgenjs");
const p = new pptx();
p.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
p.author = "Ciudad Maderas — Asesor autorizado";
p.title = "Sistema de atención automatizada";

const AZUL = "11253A";      // fondo dominante
const AZUL2 = "1B3550";     // tarjetas sobre azul
const ORO = "B4A269";       // acento
const ORO_CL = "E8DCAE";
const BLANCO = "FFFFFF";
const HUMO = "F4F6F8";      // fondo claro
const TINTA = "16232F";     // texto sobre claro
const GRIS = "5C6B78";
const CALIENTE = "C1462F";
const TIBIO = "C08A2E";
const FRIO = "4E7C8C";

const SERIF = "Cambria";
const SANS = "Calibri";

const W = 13.3, H = 7.5, M = 0.7;

// ── ayudantes ──────────────────────────────────────────────────────────────
const s = () => p.addSlide();

/** Fondo de foto con velo, para portadas y separadores. */
function fondoFoto(sl, archivo, opacidad = 62) {
  sl.addImage({ path: `img/${archivo}.jpg`, x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
  sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: AZUL, transparency: 100 - opacidad } });
}

/** Título de sección sobre fondo claro. */
function tituloClaro(sl, texto, bajada) {
  sl.background = { color: HUMO };
  sl.addText(texto, {
    x: M, y: 0.45, w: W - M * 2, h: 0.75, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 34, bold: true, color: AZUL,
  });
  if (bajada) {
    sl.addText(bajada, {
      x: M, y: 1.2, w: W - M * 2, h: 0.45, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 15, color: GRIS,
    });
  }
}

/** Tarjeta con tinte suave — sin franjas de color, que delatan plantilla. */
function tarjeta(sl, x, y, w, h, relleno) {
  sl.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.09,
    fill: { color: relleno || BLANCO },
    line: { color: "DDE3E8", width: 1 },
    shadow: { type: "outer", angle: 90, blur: 10, offset: 2, color: "9AA7B2", opacity: 0.18 },
  });
}

/** Número dentro de un círculo dorado: el motivo que se repite en todo el deck. */
function circulo(sl, x, y, texto, d = 0.52, colorFondo = ORO, colorTexto = AZUL) {
  sl.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: colorFondo } });
  sl.addText(texto, {
    x, y, w: d, h: d, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, bold: true, color: colorTexto,
    align: "center", valign: "middle",
  });
}

/** Botón tocable tal como lo ve el cliente. */
function chip(sl, x, y, w, texto) {
  sl.addShape(p.ShapeType.roundRect, {
    x, y, w, h: 0.46, rectRadius: 0.22,
    fill: { color: BLANCO }, line: { color: ORO, width: 1.5 },
  });
  sl.addText(texto, {
    x, y, w, h: 0.46, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13, bold: true, color: AZUL,
    align: "center", valign: "middle",
  });
}

/** Burbuja de chat. `mia` = la del bot (clara, izquierda). */
function burbuja(sl, x, y, w, texto, mia, alto) {
  const h = alto || 0.62;
  sl.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.14,
    fill: { color: mia ? BLANCO : AZUL2 },
    line: mia ? { color: "DDE3E8", width: 1 } : { color: AZUL2, width: 1 },
  });
  sl.addText(texto, {
    x: x + 0.16, y, w: w - 0.32, h, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 12.5, color: mia ? TINTA : BLANCO, valign: "middle",
  });
}

// ═══ 1 · Portada ═══════════════════════════════════════════════════════════
{
  const sl = s();
  fondoFoto(sl, "clubes", 68);
  sl.addText("CIUDAD MADERAS · ASESOR AUTORIZADO", {
    x: M, y: 2.1, w: W - M * 2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13, bold: true, color: ORO_CL, charSpacing: 3,
  });
  sl.addText("Atención automatizada\ny captura de prospectos", {
    x: M, y: 2.6, w: 9.5, h: 1.9, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 44, bold: true, color: BLANCO, lineSpacing: 46,
  });
  sl.addText(
    "Cómo trabaja el sistema las 24 horas, qué le pregunta a cada prospecto, y cómo decide a quién hay que llamar hoy.",
    { x: M, y: 4.7, w: 8.6, h: 0.8, isTextBox: true, margin: 0, fontFace: SANS, fontSize: 15, color: "D6DEE5" },
  );
  sl.addNotes("Presentación del sistema completo. Arrancar diciendo qué problema resuelve, no cómo está hecho.");
}

// ═══ 2 · El problema ═══════════════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "El problema que resuelve", "Lo que pasa cuando un prospecto escribe y nadie contesta a tiempo.");
  const datos = [
    ["Escriben a cualquier hora", "La mayoría de los mensajes llegan de noche y en fin de semana, cuando nadie está en el teléfono."],
    ["El interés se enfría rápido", "Quien pregunta por un terreno está preguntando en varios lados al mismo tiempo. Contesta el primero."],
    ["Se pierde quién era quién", "Sin un registro, a los tres días ya no se sabe cuál de todos los mensajes era el comprador serio."],
  ];
  datos.forEach(([t, d], i) => {
    const x = M + i * 4.15;
    tarjeta(sl, x, 2.05, 3.75, 2.75);
    circulo(sl, x + 0.35, 2.4, String(i + 1));
    sl.addText(t, {
      x: x + 0.35, y: 3.1, w: 3.05, h: 0.6, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 18, bold: true, color: AZUL,
    });
    sl.addText(d, {
      x: x + 0.35, y: 3.7, w: 3.05, h: 1.0, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: GRIS,
    });
  });
  sl.addText("El sistema no reemplaza al asesor: le entrega al prospecto ya calificado y con teléfono.", {
    x: M, y: 5.25, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: AZUL,
  });
}

// ═══ 3 · El recorrido ══════════════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "El recorrido, de principio a fin", "Lo que pasa entre que alguien se interesa y el asesor levanta el teléfono.");
  const pasos = [
    ["Llega", "Comenta o escribe\nen redes, web o\nWhatsApp"],
    ["Responde", "El bot contesta al\ninstante y resuelve\nsus dudas"],
    ["Califica", "Tres preguntas:\nuso, plazo y\nforma de pago"],
    ["Registra", "Nombre y teléfono\nquedan guardados\nen el panel"],
    ["Avisa", "Si es caliente,\nel asesor recibe\naviso al momento"],
  ];
  const w = 2.28, gap = 0.24;
  pasos.forEach(([t, d], i) => {
    const x = M + i * (w + gap);
    tarjeta(sl, x, 2.15, w, 2.6, i === 4 ? "FBF7EA" : BLANCO);
    circulo(sl, x + w / 2 - 0.26, 2.42, String(i + 1));
    sl.addText(t, {
      x, y: 3.1, w, h: 0.4, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 17, bold: true, color: AZUL, align: "center",
    });
    sl.addText(d, {
      x: x + 0.15, y: 3.55, w: w - 0.3, h: 1.05, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 11.5, color: GRIS, align: "center",
    });
    if (i < 4) {
      sl.addText("›", {
        x: x + w, y: 3.15, w: gap, h: 0.4, isTextBox: true, margin: 0,
        fontFace: SANS, fontSize: 20, bold: true, color: ORO, align: "center",
      });
    }
  });
  sl.addText("Todo esto ocurre en segundos, a cualquier hora, sin que nadie esté al pendiente.", {
    x: M, y: 5.2, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: AZUL,
  });
}

// ═══ 4 · Dónde atiende ═════════════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "Dónde atiende", "El mismo bot, el mismo guion y el mismo registro en los cuatro lugares.");
  const canales = [
    ["Página web", "Chat propio en el sitio de terrenos, con las 8 plazas y sus mensualidades.", "Activo"],
    ["Facebook Messenger", "Contesta los mensajes de la página y los comentarios de las publicaciones.", "Activo"],
    ["Instagram", "Mensajes directos y comentarios, incluidos los de las solicitudes.", "Activo"],
    ["WhatsApp", "Coexistencia: el bot atiende y el asesor puede tomar el chat desde su propio teléfono.", "En verificación"],
  ];
  canales.forEach(([t, d, estado], i) => {
    const x = M + (i % 2) * 6.15;
    const y = 2.05 + Math.floor(i / 2) * 1.72;
    tarjeta(sl, x, y, 5.75, 1.5);
    sl.addText(t, {
      x: x + 0.35, y: y + 0.2, w: 3.4, h: 0.4, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 18, bold: true, color: AZUL,
    });
    const activo = estado === "Activo";
    sl.addShape(p.ShapeType.roundRect, {
      x: x + 4.05, y: y + 0.22, w: 1.4, h: 0.34, rectRadius: 0.17,
      fill: { color: activo ? "E8F1EA" : "FBF1DC" }, line: { color: activo ? "9DBFA6" : "D9BE7E", width: 1 },
    });
    sl.addText(estado, {
      x: x + 4.05, y: y + 0.22, w: 1.4, h: 0.34, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 10.5, bold: true, color: activo ? "3C6B4A" : "8A6A24",
      align: "center", valign: "middle",
    });
    sl.addText(d, {
      x: x + 0.35, y: y + 0.68, w: 5.05, h: 0.7, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: GRIS,
    });
  });
  sl.addText("Un prospecto que empieza en Instagram y sigue en WhatsApp queda como una sola ficha, no como dos.", {
    x: M, y: 5.6, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: AZUL,
  });
}

// ═══ 5 · Embudo de comentarios ═════════════════════════════════════════════
{
  const sl = s();
  sl.background = { color: HUMO };
  sl.addImage({ path: "img/caribe.jpg", x: 7.9, y: 0, w: 5.4, h: H, sizing: { type: "cover", w: 5.4, h: H } });
  sl.addShape(p.ShapeType.rect, { x: 7.9, y: 0, w: 5.4, h: H, fill: { color: AZUL, transparency: 55 } });
  sl.addText("De un comentario\na una conversación", {
    x: M, y: 0.7, w: 6.7, h: 1.1, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 32, bold: true, color: AZUL, lineSpacing: 36,
  });
  const pasos = [
    ["Alguien comenta", "Cualquier comentario cuenta, no solo los que piden precio. Quien comentó ya se detuvo en la publicación."],
    ["Le llega un mensaje", "Recibe un mensaje privado al instante, y una respuesta pública debajo de su comentario."],
    ["El bot toma la plática", "El mensaje termina con una pregunta. Cuando la persona responde, arranca el guion completo."],
  ];
  pasos.forEach(([t, d], i) => {
    const y = 2.15 + i * 1.35;
    circulo(sl, M, y, String(i + 1), 0.46);
    sl.addText(t, {
      x: M + 0.68, y: y - 0.04, w: 6.0, h: 0.35, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 18, bold: true, color: AZUL,
    });
    sl.addText(d, {
      x: M + 0.68, y: y + 0.32, w: 6.0, h: 0.8, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: GRIS,
    });
  });
  sl.addText("Los reclamos quedan fuera a propósito: esos los atiende el asesor en persona.", {
    x: M, y: 6.35, w: 6.7, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 12.5, italic: true, color: AZUL,
  });
}

// ═══ 6 · Separador: el guion ═══════════════════════════════════════════════
{
  const sl = s();
  fondoFoto(sl, "queretaro", 72);
  sl.addText("SEGUNDA PARTE", {
    x: M, y: 2.5, w: 8, h: 0.35, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13, bold: true, color: ORO_CL, charSpacing: 3,
  });
  sl.addText("El guion del bot", {
    x: M, y: 2.95, w: 9, h: 1.0, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 42, bold: true, color: BLANCO,
  });
  sl.addText("Qué pregunta, en qué orden, y cómo decide a quién hay que llamar hoy mismo.", {
    x: M, y: 4.1, w: 8.6, h: 0.6, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, color: "D6DEE5",
  });
}

// ═══ 7 · Regla de oro ══════════════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "Regla de oro: contesta primero, pregunta después", "Un bot que interroga antes de dar información se siente ansioso, y la gente se va.");
  // Mal
  tarjeta(sl, M, 2.0, 5.75, 3.1);
  sl.addText("Así NO", {
    x: M + 0.35, y: 2.2, w: 2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13, bold: true, color: CALIENTE, charSpacing: 2,
  });
  burbuja(sl, M + 0.35, 2.68, 3.6, "¿Cuánto cuesta un terreno?", false);
  burbuja(sl, M + 0.35, 3.42, 4.6, "¿Para qué estás buscando el terreno?", true);
  sl.addText("No contestó lo que le preguntaron.", {
    x: M + 0.35, y: 4.3, w: 5.05, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 12, italic: true, color: GRIS,
  });
  // Bien
  tarjeta(sl, M + 6.15, 2.0, 5.75, 3.1, "FBF7EA");
  sl.addText("Así SÍ", {
    x: M + 6.5, y: 2.2, w: 2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13, bold: true, color: "3C6B4A", charSpacing: 2,
  });
  burbuja(sl, M + 6.5, 2.68, 3.6, "¿Cuánto cuesta un terreno?", false);
  burbuja(sl, M + 6.5, 3.42, 5.05,
    "Desde alrededor de $550,000, y la mensualidad desde $1,244 según la ciudad. Para darte tu número, ¿para qué buscas el terreno?", true, 1.05);
  sl.addText("Responde, y la pregunta va pegada al final.", {
    x: M + 6.5, y: 4.6, w: 5.05, h: 0.4, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 12, italic: true, color: GRIS,
  });
  sl.addText("Además: una sola pregunta por mensaje. Nunca dos, ni una con dos partes. Y nunca repetir algo ya contestado.", {
    x: M, y: 5.4, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: AZUL,
  });
}

// ═══ 8-10 · Las tres preguntas ═════════════════════════════════════════════
const preguntas = [
  {
    n: 1, titulo: "Para qué lo busca",
    pregunta: "¿Para qué estás buscando el terreno?",
    botones: ["Invertir", "Construir mi casa", "Solo información"],
    porque: "Abre la conversación sin sonar a interrogatorio, y desde aquí el bot sabe si hablarle de plusvalía o de su casa.",
    dato: "No sube ni baja la calificación por sí solo, pero desempata: un inversionista de contado vale más que un curioso.",
  },
  {
    n: 2, titulo: "Para cuándo",
    pregunta: "¿Para cuándo lo estás pensando?",
    botones: ["Este mes", "3 a 6 meses", "Solo cotizando"],
    porque: "Va en segundo lugar a propósito: es la pregunta que más separa al curioso del comprador.",
    dato: "Quien contesta \"solo cotizando\" nunca queda como caliente, pague como pague. Es la regla que evita falsas alarmas.",
  },
  {
    n: 3, titulo: "Cómo lo pagaría",
    pregunta: "¿Cómo lo estarías viendo?",
    botones: ["De contado", "Con financiamiento", "Aún no sé"],
    porque: "Cierra el cuadro. Con el plazo y la forma de pago ya se puede calificar, aunque falte todo lo demás.",
    dato: "En cuanto se sabe esto, el prospecto queda registrado en el panel — antes de pedirle el nombre.",
  },
];
preguntas.forEach((q) => {
  const sl = s();
  tituloClaro(sl, `Pregunta ${q.n} · ${q.titulo}`, null);
  // La pregunta, como la ve el cliente
  tarjeta(sl, M, 1.75, 7.1, 2.5);
  circulo(sl, M + 0.35, 2.0, String(q.n), 0.46);
  sl.addText("Lo que ve el cliente", {
    x: M + 1.0, y: 2.05, w: 4, h: 0.35, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 11.5, bold: true, color: GRIS, charSpacing: 2,
  });
  burbuja(sl, M + 0.35, 2.62, 6.4, q.pregunta, true);
  const anchos = q.botones.map((b) => Math.max(1.5, 0.28 + b.length * 0.095));
  let bx = M + 0.35;
  q.botones.forEach((b, i) => {
    chip(sl, bx, 3.45, anchos[i], b);
    bx += anchos[i] + 0.16;
  });
  sl.addText("Los botones son tocables: un dedo y listo. Solo estas tres preguntas los llevan.", {
    x: M + 0.35, y: 4.02, w: 6.4, h: 0.3, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 10.5, italic: true, color: GRIS,
  });
  // Por qué
  tarjeta(sl, M + 7.5, 1.75, 4.4, 2.5, AZUL);
  sl.addText("POR QUÉ ESTA PREGUNTA", {
    x: M + 7.85, y: 2.0, w: 3.7, h: 0.3, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 10.5, bold: true, color: ORO, charSpacing: 2,
  });
  sl.addText(q.porque, {
    x: M + 7.85, y: 2.45, w: 3.7, h: 1.6, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13, color: BLANCO,
  });
  // Dato
  tarjeta(sl, M, 4.55, 11.9, 1.15, "FBF7EA");
  sl.addText(q.dato, {
    x: M + 0.4, y: 4.55, w: 11.1, h: 1.15, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 13.5, color: AZUL, valign: "middle",
  });
  sl.addNotes(q.porque);
});

// ═══ 11 · Nombre y teléfono ════════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "Después, los datos — uno a la vez", "Nunca los dos en la misma pregunta, y nunca en lista.");
  const pasos = [
    ["Primero el nombre", "¿Cómo te llamas?"],
    ["Luego el teléfono", "Mucho gusto, Jorge. ¿A qué número te busca el asesor?"],
  ];
  pasos.forEach(([t, texto], i) => {
    const x = M + i * 6.15;
    tarjeta(sl, x, 2.05, 5.75, 2.1);
    circulo(sl, x + 0.35, 2.3, String(i + 1), 0.46);
    sl.addText(t, {
      x: x + 1.0, y: 2.35, w: 4.4, h: 0.35, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 18, bold: true, color: AZUL,
    });
    burbuja(sl, x + 0.35, 2.95, 5.05, texto, true, 0.85);
  });
  tarjeta(sl, M, 4.5, 11.9, 1.35, "FBF7EA");
  sl.addText(
    "Estas dos NO llevan botones: son preguntas abiertas. Pedir nombre y teléfono juntos es la forma más rápida de que alguien deje de contestar.",
    { x: M + 0.4, y: 4.5, w: 11.1, h: 1.35, isTextBox: true, margin: 0, fontFace: SANS, fontSize: 13.5, color: AZUL, valign: "middle" },
  );
}

// ═══ 12 · Cómo califica ════════════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "Cómo queda calificado cada prospecto", "Con el plazo y la forma de pago basta. El uso solo desempata.");
  const nivel = [
    [CALIENTE, "Caliente", "Compra este mes y ya sabe cómo va a pagar.\n\nTambién el inversionista de contado a 3–6 meses.",
      "Aviso inmediato al asesor"],
    [TIBIO, "Tibio", "De 3 a 6 meses, o compra pronto pero sin definir todavía cómo paga.",
      "Queda en la lista, sin aviso"],
    [FRIO, "Frío", "Solo está cotizando. Pague como pague, nunca sube de aquí.",
      "Se guarda, sin aviso"],
  ];
  nivel.forEach(([color, t, d, accion], i) => {
    const x = M + i * 4.15;
    tarjeta(sl, x, 2.0, 3.75, 3.35);
    sl.addShape(p.ShapeType.ellipse, { x: x + 0.35, y: 2.28, w: 0.34, h: 0.34, fill: { color } });
    sl.addText(t, {
      x: x + 0.82, y: 2.24, w: 2.6, h: 0.42, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 22, bold: true, color,
    });
    sl.addText(d, {
      x: x + 0.35, y: 2.85, w: 3.05, h: 1.5, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 13, color: GRIS,
    });
    sl.addShape(p.ShapeType.roundRect, {
      x: x + 0.35, y: 4.5, w: 3.05, h: 0.58, rectRadius: 0.1,
      fill: { color: i === 0 ? "FBEDE9" : HUMO }, line: { color: i === 0 ? "E0B5AA" : "DDE3E8", width: 1 },
    });
    sl.addText(accion, {
      x: x + 0.35, y: 4.5, w: 3.05, h: 0.58, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 11.5, bold: true, color: i === 0 ? CALIENTE : GRIS,
      align: "center", valign: "middle",
    });
  });
  sl.addText("Solo el caliente interrumpe al asesor. Avisar de todos entrena a ignorar los avisos — y entonces el aviso que importa también se ignora.", {
    x: M, y: 5.65, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: AZUL,
  });
}

// ═══ 13 · La tabla de puntos ═══════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "La cuenta exacta", "No es una corazonada del bot: es una suma con reglas fijas, iguales para todos.");
  const filas = [
    ["Plazo", "Este mes", "3", "3 a 6 meses", "2", "Solo cotizando", "1"],
    ["Forma de pago", "De contado", "3", "Financiamiento o crédito", "2", "Aún no sé", "1"],
  ];
  const cols = [2.3, 2.35, 0.75, 3.0, 0.75, 2.0, 0.75];
  let y = 2.05;
  // encabezado
  let cx = M;
  ["Qué se pregunta", "Respuesta", "Pts", "Respuesta", "Pts", "Respuesta", "Pts"].forEach((h, i) => {
    sl.addText(h, {
      x: cx, y, w: cols[i], h: 0.4, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 11, bold: true, color: GRIS, charSpacing: 1,
      align: i % 2 === 0 && i > 0 ? "center" : "left",
    });
    cx += cols[i];
  });
  y += 0.45;
  filas.forEach((f) => {
    sl.addShape(p.ShapeType.roundRect, { x: M, y, w: 11.9, h: 0.62, rectRadius: 0.07, fill: { color: BLANCO }, line: { color: "DDE3E8", width: 1 } });
    cx = M + 0.15;
    f.forEach((c, i) => {
      const esPts = i > 0 && i % 2 === 0;
      sl.addText(c, {
        x: cx, y, w: cols[i] - (i === 0 ? 0.15 : 0), h: 0.62, isTextBox: true, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: i === 0 || esPts,
        color: esPts ? ORO : (i === 0 ? AZUL : GRIS),
        align: esPts ? "center" : "left", valign: "middle",
      });
      cx += cols[i];
    });
    y += 0.72;
  });
  // Reglas
  tarjeta(sl, M, 4.05, 5.75, 1.85, AZUL);
  sl.addText("CUÁNDO ES CALIENTE", {
    x: M + 0.35, y: 4.28, w: 5.05, h: 0.3, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 10.5, bold: true, color: ORO, charSpacing: 2,
  });
  sl.addText(
    [{ text: "Compra este mes y no dijo \"aún no sé\" cómo paga.", options: { bullet: true, breakLine: true } },
     { text: "O suma 6 o más puntos, contando +1 si es inversionista de contado.", options: { bullet: true } }],
    { x: M + 0.35, y: 4.65, w: 5.05, h: 1.05, isTextBox: true, margin: 0, fontFace: SANS, fontSize: 12.5, color: BLANCO, paraSpaceAfter: 6 },
  );
  tarjeta(sl, M + 6.15, 4.05, 5.75, 1.85, "FBF7EA");
  sl.addText("LA REGLA QUE MANDA SOBRE TODAS", {
    x: M + 6.5, y: 4.28, w: 5.05, h: 0.3, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 10.5, bold: true, color: CALIENTE, charSpacing: 2,
  });
  sl.addText(
    "Quien dice \"solo cotizando\" queda frío siempre, aunque pague de contado. Sin esa regla, el asesor recibiría avisos de gente que apenas está viendo.",
    { x: M + 6.5, y: 4.65, w: 5.05, h: 1.05, isTextBox: true, margin: 0, fontFace: SANS, fontSize: 12.5, color: AZUL },
  );
}

// ═══ 14 · El aviso ═════════════════════════════════════════════════════════
{
  const sl = s();
  sl.background = { color: AZUL };
  sl.addText("El aviso de lead caliente", {
    x: M, y: 0.6, w: 7, h: 0.75, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 34, bold: true, color: BLANCO,
  });
  sl.addText("Llega al teléfono del asesor en el momento, sin importar por qué canal escribió el prospecto.", {
    x: M, y: 1.35, w: 6.4, h: 0.7, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, color: "C3CEd8",
  });
  const puntos = [
    ["Al instante", "En cuanto el prospecto termina de contestar las tres preguntas."],
    ["Solo los calientes", "Los tibios y fríos quedan en el panel, sin sonar el teléfono."],
    ["Con todo lo necesario", "Nombre, teléfono, plazo, forma de pago y para qué lo quiere."],
  ];
  puntos.forEach(([t, d], i) => {
    const y = 2.35 + i * 1.25;
    circulo(sl, M, y, String(i + 1), 0.44);
    sl.addText(t, {
      x: M + 0.64, y: y - 0.04, w: 5.6, h: 0.32, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 17, bold: true, color: ORO_CL,
    });
    sl.addText(d, {
      x: M + 0.64, y: y + 0.3, w: 5.6, h: 0.7, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: "C3CEd8",
    });
  });
  // Simulación del aviso
  sl.addShape(p.ShapeType.roundRect, {
    x: 7.6, y: 1.55, w: 4.9, h: 4.35, rectRadius: 0.16,
    fill: { color: BLANCO }, shadow: { type: "outer", angle: 90, blur: 16, offset: 3, color: "000000", opacity: 0.3 },
  });
  sl.addText("🔥 Lead caliente — contáctalo hoy", {
    x: 7.95, y: 1.85, w: 4.2, h: 0.42, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, bold: true, color: CALIENTE,
  });
  const campos = [["Nombre", "Jorge Ramírez"], ["Contacto", "686 111 2233"], ["Ciudad", "Cancún"],
                  ["Plazo", "Este mes"], ["Pago", "Financiamiento"], ["Uso", "Inversión"]];
  campos.forEach(([k, v], i) => {
    const y = 2.42 + i * 0.44;
    sl.addText(k, {
      x: 7.95, y, w: 1.5, h: 0.36, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12, color: GRIS, valign: "middle",
    });
    sl.addText(v, {
      x: 9.45, y, w: 2.7, h: 0.36, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, bold: true, color: AZUL, valign: "middle",
    });
  });
  sl.addText("Ver en el panel  ›", {
    x: 7.95, y: 5.2, w: 4.2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 12.5, bold: true, color: ORO,
  });
  sl.addText("Ejemplo del aviso tal como llega", {
    x: 7.6, y: 6.05, w: 4.9, h: 0.3, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 11, italic: true, color: "8FA0AD", align: "center",
  });
}

// ═══ 15 · Red de seguridad ═════════════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "La red de seguridad", "Qué pasa si el bot promete una llamada y se le olvida registrar al prospecto.");
  tarjeta(sl, M, 2.0, 5.75, 2.9);
  sl.addText("El riesgo", {
    x: M + 0.35, y: 2.25, w: 4, h: 0.4, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 20, bold: true, color: CALIENTE,
  });
  sl.addText(
    "Pasó de verdad: un cliente dio ciudad, pago, plazo, nombre y teléfono. El bot le dijo que un asesor lo contactaría — y no quedó registrado en ningún lado.\n\nEs el peor fallo posible, porque por fuera todo se ve bien y nadie tiene motivo para ir a revisar.",
    { x: M + 0.35, y: 2.75, w: 5.05, h: 1.95, isTextBox: true, margin: 0, fontFace: SANS, fontSize: 12.5, color: GRIS },
  );
  tarjeta(sl, M + 6.15, 2.0, 5.75, 2.9, "FBF7EA");
  sl.addText("La solución", {
    x: M + 6.5, y: 2.25, w: 4, h: 0.4, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 20, bold: true, color: "3C6B4A",
  });
  sl.addText(
    "Ahora el sistema vigila cada respuesta. Si el bot promete contacto y no registró a nadie, el prospecto se levanta solo — con la conversación completa guardada — y el asesor recibe aviso.\n\nY cuando el teléfono llega después, avisa otra vez: ese es el momento en que por fin se le puede llamar.",
    { x: M + 6.5, y: 2.75, w: 5.05, h: 1.95, isTextBox: true, margin: 0, fontFace: SANS, fontSize: 12.5, color: AZUL },
  );
  sl.addText("El sistema no confía en que todo salga bien: revisa que haya salido bien.", {
    x: M, y: 5.2, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 15, italic: true, color: AZUL,
  });
}

// ═══ 16 · Reglas que no se rompen ══════════════════════════════════════════
{
  const sl = s();
  tituloClaro(sl, "Lo que el bot nunca hace", "Un mensaje queda escrito, y en bienes raíces una promesa de más se cobra cara.");
  const reglas = [
    ["Nunca dice \"garantizar\"", "Ni plusvalía garantizada, ni rendimiento asegurado, ni siquiera para cosas que sí son ciertas. Junto a una pregunta de inversión, todo eso se lee como promesa de ganancia."],
    ["Los precios siempre son \"desde\"", "Nunca un total cerrado. La cifra exacta depende del lote y del plazo, y la confirma el asesor."],
    ["Solo terrenos", "No ofrece casas ni modelos, porque el asesor no los vende. Prometer lo que no se tiene se descubre en la primera llamada."],
    ["No pide datos bancarios", "Ni tarjetas, ni comprobantes, ni documentos por el chat. Tampoco aparta lotes ni recibe pagos."],
  ];
  reglas.forEach(([t, d], i) => {
    const y = 1.95 + i * 1.05;
    sl.addShape(p.ShapeType.ellipse, { x: M, y: y + 0.08, w: 0.4, h: 0.4, fill: { color: AZUL } });
    sl.addText("✕", {
      x: M, y: y + 0.08, w: 0.4, h: 0.4, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, bold: true, color: ORO, align: "center", valign: "middle",
    });
    // El título necesita 2 renglones en el caso más largo ("Los precios
    // siempre son 'desde'"), así que la caja va alta y ancha a propósito.
    sl.addText(t, {
      x: M + 0.62, y: y - 0.09, w: 3.95, h: 0.82, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 17, bold: true, color: AZUL, valign: "middle",
    });
    sl.addText(d, {
      x: M + 4.75, y, w: 7.15, h: 0.9, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 12.5, color: GRIS, valign: "middle",
    });
  });
  sl.addText("Estas reglas están escritas en el sistema y se verifican solas — no dependen de que el bot tenga un buen día.", {
    x: M, y: 6.35, w: W - M * 2, h: 0.5, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 14, italic: true, color: AZUL,
  });
}

// ═══ 17 · Cierre ═══════════════════════════════════════════════════════════
{
  const sl = s();
  fondoFoto(sl, "monterrey", 74);
  sl.addText("En resumen", {
    x: M, y: 1.5, w: 8, h: 0.8, isTextBox: true, margin: 0,
    fontFace: SERIF, fontSize: 36, bold: true, color: BLANCO,
  });
  const puntos = [
    ["Contesta en segundos", "a cualquier hora, en cuatro canales"],
    ["Pregunta lo que importa", "uso, plazo y forma de pago — una por mensaje"],
    ["Registra a todos", "y avisa solo de los que hay que llamar hoy"],
    ["No promete de más", "precios desde, sin garantías, solo terrenos"],
  ];
  puntos.forEach(([t, d], i) => {
    const y = 2.75 + i * 0.85;
    sl.addShape(p.ShapeType.ellipse, { x: M, y: y + 0.06, w: 0.32, h: 0.32, fill: { color: ORO } });
    sl.addText(t, {
      x: M + 0.55, y, w: 4.3, h: 0.45, isTextBox: true, margin: 0,
      fontFace: SERIF, fontSize: 19, bold: true, color: BLANCO, valign: "middle",
    });
    sl.addText(d, {
      x: M + 4.95, y, w: 7.0, h: 0.45, isTextBox: true, margin: 0,
      fontFace: SANS, fontSize: 14, color: "C9D4DC", valign: "middle",
    });
  });
  sl.addText("CIUDAD MADERAS · TERRENOS PREMIUM · ASESOR AUTORIZADO", {
    x: M, y: 6.5, w: W - M * 2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: SANS, fontSize: 11.5, bold: true, color: ORO_CL, charSpacing: 3,
  });
}

p.writeFile({ fileName: "sistema-ciudad-maderas.pptx" }).then((f) => console.log("listo:", f));
