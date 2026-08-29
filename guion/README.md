# Guion del asesor — documento de operación

`guion-del-asesor.html` es la fuente del artifact publicado en
https://claude.ai/code/artifact/e567e510-99ad-486e-92a2-6309bc9eaaa5

Para actualizarlo: se edita este archivo y se vuelve a publicar **con esa URL**,
lo que conserva el enlace. Publicar sin la URL crea un artifact nuevo y el que
el dueño tiene guardado se queda viejo.

## Qué es y qué no

Es el documento que el dueño abre y comparte: qué pregunta el bot, en qué orden,
cómo califica, y las 28 respuestas aprobadas.

**Nació como propuesta** —pedía autorización en cuatro puntos y el bot todavía
no existía— y se convirtió en la referencia de lo que ya opera. Si vuelve a
sonar a propuesta ("pendiente de autorización", "no voy a tocar el bot hasta…"),
es que quedó texto viejo.

## La regla que gobierna su contenido

Las 28 respuestas son la voz del bot ante un cliente, así que **cada una debe
poder rastrearse a `starter/member/kb/`**. Si una respuesta afirma algo que la
KB no dice, la que está mal es la respuesta.

Ya pasó una vez: decía "el lote o modelo que elijas", y *modelo* es palabra de
casas — el asesor solo vende terrenos.

## Al cambiarlo

- Los tokens de color están definidos en **tres** bloques (claro, oscuro por
  sistema, oscuro forzado). Un color nuevo va en los tres o se rompe un tema.
- Se revisa en los dos temas antes de publicar.
