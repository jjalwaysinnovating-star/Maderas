# Bot de J&J Always Innovating — el que vende bots

El **segundo bot**: el de la página de Facebook "J&J Always Innovating", que
vende chatbots a otros negocios. El bot vive en `starter/`, bajado con
`npx forjabot init` el 2026-09-09.

**DESPLEGADO Y CONTESTANDO desde el 2026-09-10** (versión
`54186342-365c-465e-b3fc-bcac7082a3c7`) en
https://jj-always-innovating.jjalwaysinnovating.workers.dev — panel en `…/admin`.
Lo que sigue pendiente ya no es código: ver "Lo que falta" al final.

## Por qué es un bot aparte y no un ajuste del de Maderas

El Worker de Ciudad Maderas es *un solo negocio*: un nombre, una base de
conocimiento, un guion, un panel, un sitio. No hay forma de que conteste
distinto según la página de Facebook por la que entró el mensaje — las dos
páginas son el mismo canal (`messenger`) para él.

El reparto por asesor (`member/asesores.local.ts` en Maderas) tampoco sirve:
decide **de quién es el prospecto**, no de qué habla el bot.

## La licencia: contestada, y sin preguntarle a nadie

`forjabot init` **creó una licencia gratis nueva por su cuenta**
(`HZN-LTPC-LF7F-SU3Q`, plan free), sin pedir la del bot de Maderas ni ninguna
autorización. La guía del propio Forja lo dice: *"Arranca GRATIS… por detrás se
crea sola una licencia gratis"*. **Un segundo bot en nivel Starter no necesita
permiso.**

Lo que sigue sin contestar es lo otro: **montar bots para clientes y cobrarles**.
Eso el `init` no lo resolvió y sigue siendo una pregunta para Horizontes IA —
pero ya no bloquea este bot. (Los 15 giros del catálogo sí piden nivel
`community`; este bot usa `generico`, igual que el de Maderas.)

## Qué quedó armado

| Qué | Dónde |
|---|---|
| Los 8 documentos que el bot sabe | `starter/member/kb/` |
| Las 6 reglas duras del prompt | `starter/member/config.local.ts` |
| `calificarLead` (califica + avisa) | `starter/member/tools.local.ts` |
| Las reglas de prioridad, probadas | `starter/test/calificacion-leads.test.ts` |
| Modelo, idioma, nombre del Worker | `starter/wrangler.toml` |

Salieron de `marketing/precios-bots.html`, que ya tenía los precios reales, el
manejo de objeciones y a quién venderle. Nada se inventó: lo que no estaba en
los archivos quedó marcado con `[COMPLETA AQUÍ:]`.

**Todo lo propio de este bot vive en `member/`**, incluido el des-duplicado de
prospectos. En el bot de Maderas esa misma pieza necesitó parches en `src/` que
`forjabot update` borra; aquí no hay ninguno.

Dos decisiones de `wrangler.toml` que no son obvias:

- **Haiku 4.5 en los dos niveles.** El default de la plantilla usa Sonnet para
  el nivel "smart", que cuesta varias veces más por respuesta. Es el mismo
  cerebro del bot de Maderas, y es el proveedor para el que esta plantilla
  cachea el prompt.
- **`BOT_LANGUAGE = "es-MX"`**, no `es-419`: ese otro autoriza el voseo desde el
  bloque de más autoridad del prompt y gana sobre el campo `tono`. Costó
  encontrarlo en el bot de Maderas.

## Reglas que no se relajan

- **"Garantizar" está prohibida entera** y no se prometen resultados ni
  porcentajes (`starter/member/kb/05-como-hablar-de-resultados.md`).
- **Precios siempre "desde"**, en dólares, y el piso de **$2,000 USD no se baja**.
  Si piden pesos, no se inventa tipo de cambio.
- **Los costos de operación jamás se le dicen al cliente.**
- **Un dato a la vez** al capturar, y botones solo en las tres preguntas.
- **El único caso real que se menciona es Ciudad Maderas.** No se inventan
  clientes ni testimonios.

## Cuidado con Zernio

El webhook de Zernio **no se puede filtrar por cuenta**: entrega todo lo que
cuelgue de esa cuenta a la misma dirección. Si la página nueva se conecta a la
**misma cuenta de Zernio** que Ciudad Maderas, sus mensajes entran al Worker de
Maderas y el bot le contestará de terrenos en Querétaro a quien preguntó por
chatbots. No da error: se ve como que el bot enloqueció.

La salida limpia es una **cuenta de Zernio propia** para J&J. El plan actual es
*usage-based*, así que hay que ver el precio en el panel de Zernio antes.

## Al tocar `member/kb/` son DOS pasos, no uno

```bash
cd bot-jj/starter
pnpm kb:reindex     # regenera scripts/kb-fixtures.json desde member/kb/
pnpm run deploy
curl -X POST https://<worker>/kb/reindex -H "X-Reindex-Token: <token>"
```

El primero es fácil de olvidar y falla en silencio: `scripts/kb-fixtures.json`
lo importa el Worker **al construir**, así que sin regenerarlo el bot se
despliega con la base de conocimiento **vacía** y contesta como si no supiera
nada. Nace en `[]` — hoy trae 19 trozos de los 8 documentos.

## Lo que falta (lo tachado ya se hizo)

El bot **ya contesta**. Lo que queda no es código: son cuentas y textos.

1. ~~**`ANTHROPIC_API_KEY`**~~ — **guardada el 2026-09-10** como secret del
   Worker, junto con `DASHBOARD_PASSWORD`. Viajaron por la configuración del
   entorno de Claude Code (`ANTHROPIC_API_KEY_JJ` / `DASHBOARD_PASSWORD_JJ`),
   **nunca por el chat**.
2. ~~**Desplegar**~~ — **hecho el 2026-09-10**. El D1 y el Vectorize ya existían;
   el deploy creó el Worker.
3. ~~**Reindexar la KB**~~ — **hecho**: 19 trozos, a la primera (sin `indexed: 0`).
4. ~~**Apagar `captureLead`**~~ — **puesto el 2026-09-10**:
   `disabled_tools = captureLead` en la tabla `settings`. Hace lo mismo que
   `calificarLead` pero sin calificar, y el modelo llama a las dos: cada
   prospecto entra DOS veces al panel, una con prioridad y otra sin ella. En el
   bot de Maderas pasó con un cliente real —quedó cuatro veces— y no se puede
   dejar puesto antes del deploy porque es un ajuste en D1, no en el código.
5. **Bot de Telegram propio** para los avisos (uno nuevo, no el de Maderas).
6. ~~Crear la página de Facebook~~ — **hecha el 2026-09-09**, se llama
   **"J&J Always Innovating"** (confirmado por el dueño). No conectarle ManyChat
   ni ninguna otra app: dos apps en la misma página contestan en paralelo, que
   es lo que costó días en la página de Ciudad Maderas.
7. **Cuenta de Zernio propia** y conectar la página ahí.
8. Llenar los **`[COMPLETA AQUÍ:]`** (teléfono, correo, tiempos de entrega,
   formas de pago, la liga para probar el bot de Maderas) y reindexar otra vez.
9. **Una pregunta por mensaje.** En la prueba en vivo del 2026-09-10 el bot juntó
   dos ("¿tamaño del negocio?" y "¿cuántos mensajes al mes?") en la misma
   respuesta. La regla es **un dato a la vez**: se ajusta en
   `member/kb/08-guion-de-calificacion.md` y se reindexa.


---

## Cómo retomar (estado al 2026-09-10)

**Ya está desplegado y contestando.** Esta sección dejó de ser una lista de
pasos pendientes; ahora es el mapa de lo que hay.

| Recurso | Nombre / id |
|---|---|
| Worker | `jj-always-innovating` · versión `54186342-365c-465e-b3fc-bcac7082a3c7` |
| Dirección | https://jj-always-innovating.jjalwaysinnovating.workers.dev |
| Panel | …/admin (usuario `admin`; la contraseña la tiene el dueño) |
| D1 | `horizontes_bot_starter_614c0e_db` · `7877e25d-1fad-452e-b5f0-8cfe0d68b662` |
| Vectorize | `horizontes_bot_starter_614c0e_kb` (1024 dim · coseno) |
| Secrets del Worker | `ANTHROPIC_API_KEY` · `DASHBOARD_PASSWORD` |

Las dos llaves viajan por la **configuración del entorno de Claude Code** (donde
ya vive `CLOUDFLARE_API_TOKEN`), **nunca por el chat**, y con nombres distintos a
propósito: `ANTHROPIC_API_KEY_JJ` y `DASHBOARD_PASSWORD_JJ`. El sufijo `_JJ`
evita que la sesión de Claude Code tome `ANTHROPIC_API_KEY` como suya; al
guardarlos en el Worker se les pone el nombre real, sin sufijo.

**Las variables del entorno solo se cargan al arrancar el contenedor**, así que
una sesión que ya estaba abierta cuando se guardaron NO las ve — hay que abrir
sesión nueva. Ese fue el tropiezo del 2026-09-09.

`DASHBOARD_PASSWORD` **no es opcional**: `adminAuth` se lo pasa a `basicAuth` tal
cual y la comprobación compara contra `?? ""`, así que un Worker sin él acepta el
usuario `admin` con contraseña **vacía**. Ya está puesto y comprobado.

### Volver a desplegar

```bash
cd bot-jj/starter
pnpm install
pnpm test                 # 1,373 pruebas
pnpm kb:reindex           # regenera scripts/kb-fixtures.json — NO se puede saltar
pnpm run deploy
curl -X POST -u "admin:<contraseña>" \
  https://jj-always-innovating.jjalwaysinnovating.workers.dev/admin/kb/reindex
```

El reindex en vivo debe contestar **19**; si contesta `indexed: 0`, el deploy no
había propagado — repetir.

### Comprobación después de desplegar

```bash
B=https://jj-always-innovating.jjalwaysinnovating.workers.dev
curl -s -o /dev/null -w "%{http_code}\n" $B/health    # 200
curl -s -o /dev/null -w "%{http_code}\n" $B/admin     # 401
curl -s -o /dev/null -w "%{http_code}\n" -u "admin:" $B/admin   # 401
```

Ese tercero es el que importa de verdad: con contraseña **vacía** debe dar 401.
Si diera 200, el panel quedó abierto y falta el secret.

**`/` da 404, y está bien.** Este bot **no tiene sitio web** — no existe
`member/landing.local.ts`, a diferencia del de Ciudad Maderas, que sirve 12
páginas desde su Worker. Lo que este bot sirve es el panel, `/health`,
`/widget.js` y los webhooks. No busques la portada: nunca se hizo. Si algún día
se quiere una página pública para J&J, es trabajo aparte.

### Lo que se comprobó en vivo el 2026-09-10

Se le escribió *"Hola, ¿cuánto cuesta un bot?"* por `/web/send` y contestó con
los precios "desde", en dólares, con el piso de $2,000 respetado, contestando
primero y preguntando después. La llave de Anthropic funciona.

Un detalle de guion que quedó a la vista y **no es del despliegue**: metió **dos
preguntas en el mismo mensaje** ("¿tamaño del negocio?" y "¿cuántos mensajes al
mes?"), y la regla es **un dato a la vez**. Se corrige en
`member/kb/08-guion-de-calificacion.md` y se reindexa.

Esa plática de prueba quedó en la tabla `messages`. No generó lead (nunca se dio
nombre ni teléfono), así que **el panel de leads sigue en cero**: el primero que
aparezca ya es de verdad.
