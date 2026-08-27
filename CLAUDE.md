# Bot de Ciudad Maderas — estado y cómo retomar

Chatbot de IA y sitio web para **Ciudad Maderas — Terrenos Premium**, operado por
un **asesor inmobiliario autorizado** (no es la desarrolladora). El bot vive en la
cuenta de Cloudflare del dueño; el código está en `starter/`, bajado con
`npx forjabot init` (plantilla Forja / Horizontes IA).

**SOLO TERRENOS.** El asesor no vende casas. Nada de Casas Premium, modelos ni la
mensualidad de casa — ni en la página, ni en la KB, ni en el prompt. Hay una prueba
que lo vigila (`test/sitio-web.test.ts`, bloque "solo terrenos").

**El dueño no programa.** Corre los comandos por él y explícale en español
sencillo, una pregunta a la vez. Lee `starter/CLAUDE.md` para el mapa del código.

## Dónde vive

| Qué | Dónde |
|---|---|
| Página pública | https://ciudad-maderas.jjalwaysinnovating.workers.dev |
| Panel | …/admin (usuario `admin`; la contraseña la tiene el dueño) |
| Leads | …/admin/leads |
| Worker · D1 · Vectorize | `ciudad-maderas` · `horizontes_bot_starter_ceb06e_db` · `…_kb` |

Si el dueño perdió la contraseña del panel: `wrangler secret put DASHBOARD_PASSWORD`
la reemplaza (no se puede recuperar la anterior).

## Qué está configurado

- **Cerebro:** Claude Haiku 4.5 en ambos niveles. Es el único proveedor para el que
  esta plantilla cachea el prompt (~85% de la entrada), y eso es lo que sostiene el
  costo en ~$0.002–0.003 por respuesta. Gemini quedó comentado en `wrangler.toml`
  como respaldo — sus modelos 2.5 ya no se sirven a cuentas nuevas, por eso están
  fijados los 3.5.
- **Canales:** web, servido por el mismo Worker (`WEB_SITES` lo enciende), y
  **Facebook Messenger vía Zernio** (`/webhooks/zernio`, firma HMAC fail-closed:
  sin `ZERNIO_WEBHOOK_SECRET` correcto el bot rechaza todo con 403). El demo
  público (`DEMO_MODE`) está APAGADO a propósito: era acceso sin autenticar a la
  llave de IA.
- **Avisos:** Telegram al dueño (`@ciudadmaderas_avisos_bot`). Solo se avisa de los
  leads **calientes** — avisar de todos entrena a ignorar los avisos. El aviso NO
  depende del canal: `calificarLead` solo recibe `env` y el id de conversación, así
  que sale igual desde la web que desde Messenger (`test/aviso-lead-caliente.test.ts`
  lo fija). Para comprobar una entrega real:
  `wrangler tail` y buscar `[messageOwner] telegram entregado`. Esa línea sale solo
  cuando Telegram contesta `ok:true`; los rechazos salen como `error`.
- **Calificación de prospectos:** `calificarLead` en `member/tools.local.ts`, con sus
  reglas probadas en `test/calificacion-leads.test.ts`. Sustituye a la cadena
  ManyChat → Make → Sheets → Twilio que el dueño iba a contratar.
- **Guion del bot:** el dueño lo eligió sobre un cuestionario de 28 preguntas. Tres
  decisiones que NO son improvisables: (1) el bot **contesta primero y pregunta
  después**; (2) las tres preguntas que califican van en orden **uso → plazo →
  pago**, luego nombre y teléfono, **una por mensaje**; (3) los **botones tocables
  van SOLO en esas tres**. Vive en `member/config.local.ts` (`customFields`, siempre
  en el prompt) y en `member/kb/08-guion-de-calificacion.md`. `test/guion-bot.test.ts`
  lo vigila.
- **Botones tocables:** encendidos (`buttons_enabled = 1` en la tabla `settings` de
  D1). Nativos en Messenger/WhatsApp; en la web salen como lista numerada — esa
  conversión la hace `/web/poll`, no `sendReply`, porque el canal web no pasa por
  ahí (su `sendReply` es no-op y el navegador lee lo guardado en D1).
- **`captureLead` está APAGADO** (`disabled_tools = captureLead` en `settings`).
  Hacía lo mismo que `calificarLead` pero sin calificar, y el modelo llamaba a las
  dos: cada prospecto entraba DOS veces al panel, una con prioridad y otra sin
  ella. Se vio en la conversación real de Messenger (el lead "Jay" quedó cuatro
  veces). Si algún día vuelven los duplicados, revisa que ese ajuste siga puesto.
- **Reindexar la KB:** el secret `KB_REINDEX_TOKEN` ya está puesto. Después de cada
  deploy que toque `member/kb/`:
  `curl -X POST …/kb/reindex -H "X-Reindex-Token: <token>"`. **Ojo:** si se corre
  antes de que propague el deploy, contesta `indexed: 0` — hay que repetirlo.

## Reglas del negocio que NO se relajan

- **La palabra "garantizar" está prohibida ENTERA**, no solo pegada a "plusvalía", y
  para lo que sea. Probando el bot rechazó "plusvalía garantizada" y a renglón
  seguido escribió "lo que sí garantizamos es el terreno, la ubicación y la
  calidad": junto a una pregunta de plusvalía, eso se lee como promesa de
  rendimiento. Tampoco se afirma cómo se comportó el mercado en el pasado. Las
  formulaciones aprobadas están en
  `starter/member/kb/07-como-hablar-de-plusvalia.md`.
- **Nada de voseo.** La causa de fondo estaba en `src/idioma.ts`: `BOT_LANGUAGE`
  = "es-MX" caía en `es-419`, cuyo texto de prompt decía *"español latinoamericano
  … NUNCA uses 'vosotros'"*. "Latinoamérica" incluye el Río de la Plata y
  *vosotros* es de España, así que el bloque de MÁS autoridad del prompt
  (`<output_language>`, marcado CRITICAL OVERRIDE) autorizaba el voseo mientras el
  campo `tono` lo prohibía más abajo — y ganaba el de arriba. Se agregó **es-MX**
  como idioma propio, con el voseo prohibido por nombre. Pruebas en
  `test/idioma.test.ts`. **Vive en `src/`: `forjabot update` lo borra.**
- **Precios siempre "desde"**, nunca un total cerrado: los confirma un asesor.
- **Un dato a la vez** al capturar (nombre, luego teléfono…), nunca en lista.
- **El bot no narra su proceso** ("déjame buscar", "no encontré en mi información").
- El aviso legal del pie de la página sostiene lo mismo; si cambian los textos
  comerciales, revísalo.

## Dónde se cambia cada cosa

`member/` sobrevive `forjabot update`; `src/` NO — el update lo reemplaza.

| Cambio | Archivo / lugar |
|---|---|
| Precios, ciudades, amenidades | `starter/member/kb/*.md` → luego reindexar |
| Reglas y tono | `starter/member/config.local.ts` (`customFields`) |
| Capacidades nuevas | `starter/member/tools.local.ts` |
| Textos y páginas del sitio | `starter/member/landing.local.ts` |
| Modelo, idioma, moneda | Panel → Configuración |

### El sitio web — réplica de ciudadmaderas.com

Son **12 páginas** servidas por el mismo Worker, todas declaradas en el mapa
`landingPages` de `member/landing.local.ts`. `src/index.ts` solo recorre ese mapa,
así que **agregar una página no requiere tocar `src/`**: basta una entrada más.

`/` · `/proyectos/<region>` (8, mismos slugs del oficial) ·
`/aviso-de-privacidad` · `/terminos-y-condiciones` · `/gracias`

El sitemap del oficial declara 10 páginas: portada, `/casas-premium` y las 8 de
región; el pie agrega las dos legales. **Aquí se replican todas menos
`/casas-premium`** (solo terrenos). El menú de arriba son anclas de la portada,
igual que el original; los portales de cliente (Bosque Memorial, Mis Pagos,
Escrituración, Payments, Apartado, Mi Cuenta) no se replican porque un asesor no
puede prestarlos.

Datos reales sacados del sitio oficial y que **no se inventan**: los desarrollos
por plaza (los logos de su bucket, todos dicen "Terrenos Premium") y la
**mensualidad "desde" propia de cada región** — Querétaro $1,348 · Mérida $1,683 ·
Monterrey $1,474 · Cancún $1,388 · León y SLP $1,288 · Aguascalientes y Puebla
$1,244. Hay una prueba que impide que el precio de una región se cuele en otra.

Los héroes son imágenes fijas, no los videos del original: cada `.webm` de su
bucket pesa ~6.7 MB y esta página se abre casi siempre desde un celular.

Los avisos legales son **del asesor**, no copias de los del corporativo: un aviso
de privacidad declara quién responde por los datos, y aquí quien los recibe es él.

El formulario usa **los mismos nombres de campo que el oficial** (`tipo`,
`desarrollo`, `nombre`, `email`, `telefono`) y hace `POST /contacto`: guarda el
lead en la misma tabla que el bot (aparece en `/admin/leads` con
`origen: formulario_web`) y avisa por Telegram. Trae un campo cebo (`apellido2`)
contra bots de spam. Con JS enseña el acuse en el mismo formulario, como el
original; sin JS cae en `/gracias`.

### La sesión del chat web ya no se cae al cambiar de IP

La plantilla emitía sesión nueva en cuanto cambiaba la IP del visitante — normal en
celular al pasar de WiFi a datos. El bot perdía el hilo y volvía a preguntar lo ya
contestado; probando esto en vivo, un lead que era **caliente** quedó registrado
**tibio** porque se perdió la forma de pago. Ahora `webSend` acepta una sesión que
ya existe en `conversations` aunque venga de otra IP (`sesionConocida()` en
`src/web/widget.ts`). No abre hueco de abuso: el sufijo son 64 bits aleatorios, el
tope por sesión se cuenta por id exacto y el tope global del día —el que protege la
llave de IA— no depende de la IP. Pruebas en `test/web/sesion-ip.test.ts`.
**Vive en `src/`, así que `forjabot update` lo borra:** si tras una actualización el
bot vuelve a repetir preguntas en celular, es esto.

**Tras editar la KB hay que reindexar**, o el bot sigue contestando lo viejo:

```bash
curl -X POST -u "admin:<contraseña>" \
  https://ciudad-maderas.jjalwaysinnovating.workers.dev/admin/kb/reindex
```

El panel basta para KB y comportamiento; solo hace falta un API token de
Cloudflare para desplegar código.

## Pendientes

- **WhatsApp por YCloud** — el dueño eligió coexistencia para NO perder su app de
  WhatsApp Business (Zernio, Twilio y la Cloud API dedican el número y se la
  quitarían). La cuenta y el número ya se enlazaron, pero Meta tiene pendiente la
  verificación del negocio: hasta que llegue su correo, la API de YCloud reporta
  cero números y no hay nada que configurar. Al aprobarse faltan
  `YCLOUD_API_KEY`, `YCLOUD_WEBHOOK_SECRET` y `YCLOUD_WA_FROM`. Guía:
  `starter/skill/references/channel-setup-guides/ycloud-whatsapp.md`.
- **El "Talk to human" de Messenger NO sale de este bot.** Antes de que conteste
  el Worker, a quien escribe le llega un mensaje en inglés —"J&J Always
  Innovating typically replies in 1 day… press the 'Talk to human' button"— con
  su botón. Se comprobó: esa cadena no existe en `src/`, `member/` ni `scripts/`,
  y trae el nombre VIEJO de la página, así que es una automatización guardada
  fuera (Meta Business Suite → Bandeja de entrada → Automatizaciones, o el
  panel de Zernio). El bot sí responde en paralelo — en D1 se ve su respuesta un
  segundo después. Solo el dueño puede apagarla desde esos paneles.
- **Instagram** — cabe como la 2ª cuenta gratis de Zernio cuando el dueño quiera.
- **Saldo de Anthropic** — sin cuota diaria que deje mudo al bot, pero el saldo se
  acaba. Conviene recarga automática antes de abrir WhatsApp.
- **Leads de prueba** — hay nueve falsos en el panel (Ana López, Roberto Salinas,
  Patricia Vega, Jay, Carlos Mendez, Lucia Ramos, "PRUEBA — bórrame" del
  formulario, y Jorge Prueba y Sofía Prueba de la verificación del guion). El panel
  ya tiene botón **Borrar**, desplegado: se abre el detalle del lead y está abajo a
  la derecha.
