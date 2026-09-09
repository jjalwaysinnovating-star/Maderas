# Bot de J&J Always Innovating — el que vende bots

Cerebro listo para el **segundo bot**: el de la página de Facebook
"J&J Always Innovating", que vende chatbots a otros negocios.

Aquí **no hay código**: son los documentos que se le cargan al bot cuando exista.
Se escribieron el 2026-09-09 a partir de `marketing/precios-bots.html`, que ya
tenía los precios reales, las objeciones y a quién venderle.

## Por qué es un bot aparte y no un ajuste del de Maderas

El Worker de Ciudad Maderas es *un solo negocio*: un nombre, una base de
conocimiento, un guion, un panel, un sitio. No hay forma de que conteste distinto
según la página de Facebook por la que entró el mensaje — las dos páginas son el
mismo canal (`messenger`) para el bot.

El reparto por asesor (`member/asesores.local.ts`) tampoco sirve: decide **de
quién es el prospecto**, no de qué habla el bot.

## Cuidado con Zernio

El webhook de Zernio **no se puede filtrar por cuenta**: entrega todo lo que
cuelgue de esa cuenta a la misma dirección. Si la página nueva se conecta a la
**misma cuenta de Zernio** que Ciudad Maderas, sus mensajes entran al Worker de
Maderas y el bot le contestará de terrenos en Querétaro a quien preguntó por
chatbots. No da error: se ve como que el bot enloqueció.

La salida limpia es una **cuenta de Zernio propia** para J&J. El plan actual es
*usage-based*, así que hay que ver el precio en el panel de Zernio antes.

## Qué falta antes de montarlo

1. **Confirmar la licencia con Horizontes IA.** Dos preguntas: (a) ¿la licencia
   cubre un segundo bot?, (b) ¿cubre montar bots para terceros, o hace falta una
   licencia por cliente? Es la primera llamada, antes de cotizarle a nadie —
   está pendiente desde `marketing/precios-bots.html`.
2. **Crear la página de Facebook** "J&J Always Innovating" y no conectarle
   ManyChat ni ninguna otra app.
3. **Cuenta de Zernio propia** para esa página.
4. **Llenar los `[COMPLETA AQUÍ:]`** de estos documentos: teléfono y correo del
   negocio, tiempos de entrega, formas de pago, presentación de J&J y la liga
   para que el prospecto pruebe el bot de Ciudad Maderas.

## Cómo se monta cuando esas cuatro estén

En una carpeta NUEVA, fuera de este repo:

1. `npx forjabot init` — pide la licencia HZN. **Esa clave nunca se pega en el
   chat**; la escribe Joswuar directo en la terminal.
2. Copiar `kb/*.md` de aquí a `member/kb/` del bot nuevo.
3. Pegar `config-sugerido.md` en `member/config.local.ts`.
4. Copiar `member/tools.local.ts` del bot de Ciudad Maderas — ahí vive
   `calificarLead`, que no viene en la plantilla — y ajustar los valores de
   `plazo` y de la tercera pregunta al guion de este bot.
5. Bot de Telegram propio para los avisos (uno nuevo, no el de Maderas).
6. Desplegar y **reindexar la KB**, o el bot contesta con lo viejo.
7. Conectar la página en Zernio y probar con alguien de fuera.

## Reglas que no se relajan

- **"Garantizar" está prohibida entera** y no se prometen resultados ni
  porcentajes (`kb/05-como-hablar-de-resultados.md`).
- **Precios siempre "desde"**, en dólares, y el piso de **$2,000 USD no se baja**.
- **Los costos de operación jamás se le dicen al cliente.**
- **Un dato a la vez** al capturar, y botones solo en las tres preguntas.
- **El único caso real que se menciona es Ciudad Maderas.** No se inventan
  clientes ni testimonios.
