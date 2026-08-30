# Bot de Ciudad Maderas — estado y cómo retomar

Chatbot de IA y sitio web para **Ciudad Maderas — Terrenos Premium**, operado por
un **asesor inmobiliario autorizado** (no es la desarrolladora). El bot vive en la
cuenta de Cloudflare del dueño; el código está en `starter/`, bajado con
`npx forjabot init` (plantilla Forja / Horizontes IA).

**Vende a TODO MÉXICO y al extranjero, en línea** (confirmado por él,
2026-08-28). Él vive en Tijuana, pero **eso no va en la publicidad y no se
menciona**: Ciudad Maderas no tiene desarrollos en Baja California, así que un
hashtag de su ciudad atrae a quien busca terreno *ahí* —donde no hay nada que
venderle— y estrecha el alcance sin ganar nada. Los únicos lugares que se
nombran son las 8 plazas.
Antes el proyecto decía "Mexicali" en la KB, en el prompt y en tres comentarios;
nadie lo había dicho — se dedujo de la lada 686 y se quedó escrito como si fuera
un dato suyo. Ya no se nombra ninguna ciudad del asesor en ningún lado.

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
  **Facebook Messenger + Instagram vía Zernio** (`/webhooks/zernio`, firma HMAC
  fail-closed: sin `ZERNIO_WEBHOOK_SECRET` correcto el bot rechaza todo con 403).
  Instagram no necesitó código ni secrets nuevos: el adapter guarda el `platform`
  que venga y solo trata distinto a `whatsapp` (la ventana de 24h), así que
  conectar la cuenta en el panel de Zernio bastó — son las 2 cuentas gratis de su
  plan. La cuenta es `ciudadmaderaswoodcity`, profesional y ligada a la página.
  **Conéctala por "Connect with Facebook", no por "Connect with Instagram":** los
  permisos de mensajes cuelgan de la página, y por la otra puerta no siempre
  vienen. El demo público (`DEMO_MODE`) está APAGADO a propósito: era acceso sin
  autenticar a la llave de IA.
- **El "Talk to human" era ManyChat** (resuelto 2026-08-28). Durante días, antes
  de que contestara el Worker, a quien escribía le llegaba un mensaje en inglés
  —"J&J Always Innovating typically replies in 1 day… press the 'Talk to human'
  button"— con su botón. Se buscó en `src/`, `member/`, `scripts/`, en las
  automatizaciones de Meta Business Suite (todas apagadas menos las FAQ) y en
  Zernio. Era **ManyChat**, que seguía conectado a la página de una prueba vieja:
  Meta entrega los mensajes a TODAS las apps conectadas, así que ManyChat y el
  bot contestaban en paralelo. El nombre viejo de la página fue la pista — el
  texto se escribió cuando la página se llamaba así. Si algún día vuelve a
  aparecer un mensaje que nadie escribió: **revisa qué otras apps están
  conectadas a la página**, no el código.
- **Publicaciones programadas: TAMBIÉN LO HACE ZERNIO** (2026-08-29). No hay que
  programar nada — es la otra mitad del producto. `POST /api/v1/posts` publica en
  Facebook e Instagram a la vez (`publishNow: true`, o `scheduledFor` con
  `timezone`), sirve para post, carrusel, reel e historia, y trae `recycling`
  (se republica solo cada X semanas/meses, tope 10 activos por cuenta) y una cola
  de horarios (`queuedFromProfile`). Las imágenes deben vivir en una URL pública:
  `POST /api/v1/media/upload-direct` (multipart, hasta 25 MB) las sube y devuelve
  la `url`. Conviene pasar el texto por `POST /api/v1/tools/validate/post` antes.
  **IDs de las cuentas** (`GET /api/v1/accounts`, el campo es `_id`, no `id`):
  Facebook `6a8e644777555aae018b7c37` · Instagram `6a91166377555aae013db017`.
  El primer post real salió el 2026-08-29 (el de "Sin aval. Sin buró.", de
  `contenido/salida/post-1-financiamiento.png`): `/p/DcpMWmaiq6b/` en Instagram.
  Instagram tarda ~20 s en pasar de `processing` a `published` — no es un error.
  Cada publicación alimenta sola al bot: post → comentario → DM automático →
  el bot toma la plática. Ahí es donde se cierra el círculo con el embudo.
- **Embudo de comentarios: LO HACE ZERNIO, no nuestro código** (2026-08-29).
  **CUALQUIER comentario** en cualquier publicación —no solo palabras clave—
  recibe un DM automático y una respuesta pública; lo pidió así el dueño, y
  tiene sentido: quien comenta "🔥" también se detuvo en la publicación. El DM
  termina con una PREGUNTA a propósito, porque cuando la persona contesta ese
  mensaje entra por `message.received` y **el bot toma la conversación** con su
  guion normal.
  Con `keywords: []` hay que cuidar una cosa: un reclamo no debe recibir un DM
  de venta. Por eso `excludeKeywords` trae *estafa, fraude, robo, denuncia,
  demanda, pésimo, mentira, no sirve, cuidado* — esos los atiende él a mano.
  Son dos automatizaciones (`GET /api/v1/comment-automations`), una por cuenta:
  Instagram `6a92f975894af1fc0642775c` y Facebook `6a92f9769470b63456aa16c3`.
  **`alsoMatchInDms` va en `false` y NO se debe prender:** el bot ya atiende los
  DMs, y encenderlo haría que a la misma persona le lleguen dos respuestas — el
  problema de ManyChat sembrado de nuevo.
  La plantilla trae su propio `src/channels/comment-funnel.ts`, pero **no se usa**:
  cuelga del webhook oficial de Meta, que aquí no está conectado, y
  `commentFunnels` sigue vacío. No hay que tocarlo.
  El DM no lleva botones a propósito: los de Zernio son de enlace, y un enlace
  NO abre la ventana de 24h de Instagram — solo abre esa ventana un mensaje de
  la persona. Por eso se pide respuesta en vez de un toque.
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
  **Messenger e Instagram cortan a los 80 caracteres el texto de un mensaje CON
  botones** y le pegan "…". No da error: entrega el mensaje mutilado, que es
  peor. Le pasó a un cliente real —*"…potencial de crecim…"*—. Ahora
  `separaPregunta` (en `src/channels/zernio.ts`) parte el último chunk: el
  cuerpo sale como su propio mensaje y los botones viajan con la última frase,
  que en este guion es siempre la pregunta y es corta por diseño. Si ni esa
  cabe, cae a lista numerada — mejor el texto completo sin botones que una
  frase a medias. WhatsApp ya tenía su tope de 1024; Telegram no trunca.
  **Vive en `src/`: `forjabot update` lo borra.**
- **Red de seguridad del lead** (`src/leads/rescate.ts`, enganchada al final de
  `processBuffer`). El modelo tiene la tool y el prompt le ordena llamarla antes
  de prometer nada, y aun así en conversaciones de varios turnos a veces contesta
  "un asesor te contactará" **sin llamar a ninguna herramienta**: pasó con un
  cliente real en Messenger —dio ciudad, pago, plazo, nombre y teléfono— y en el
  panel no quedó nada. Es el peor fallo posible porque por fuera se ve bien.
  Ahora, si la respuesta promete contacto y esa conversación no tiene lead, el
  Worker levanta uno solo (`origen: rescate`, sin calificar), con la
  transcripción en las notas, y **avisa siempre**. Si el cliente da su teléfono
  después, completa esa misma ficha en vez de duplicarla — y **vuelve a avisar**,
  porque ese es el momento en que el asesor por fin puede llamar y era el único
  en que no se le decía nada (el teléfono entraba al panel en silencio).
  Las **preguntas no cuentan como promesa**: "¿tu teléfono para que un asesor te
  contacte?" trae las mismas palabras y es lo contrario — el bot está pidiendo,
  no prometiendo. Sin eso el rescate se disparaba a media plática y mandaba
  "prospecto sin registrar" cuando nada había fallado; avisar de lo que no es
  problema entrena a ignorar los avisos. Ambas cosas salieron de la prueba de
  Instagram con "Jahir". Pruebas en `test/leads/rescate.test.ts`.
  **Vive en `src/`: `forjabot update` lo borra.**
- **Una conversación = un lead, pero solo dentro de 6 horas**
  (`LeadsRepo.VENTANA_MISMA_PLATICA_MS`). `calificarLead` reemplaza el lead
  pendiente de esa plática en vez de agregar otro (un prospecto se registraba al
  dar el plazo y otra vez al dar el teléfono), y la red de seguridad no rescata
  si ya hay uno. **La ventana es imprescindible:** en Messenger el hilo con una
  persona NO se cierra nunca, así que sin ella un lead viejo tapaba al de hoy —
  pasó con "Josa", que escribió desde un Messenger ya usado en una prueba del día
  anterior, calificó caliente y no se registró ni se avisó. Nada de esto pisa los
  leads que el asesor ya movió a contactado o vendido.
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

- **WhatsApp por YCloud — configurado, esperando la verificación del negocio.**
  El dueño eligió coexistencia para NO perder su app de WhatsApp Business
  (Zernio, Twilio y la Cloud API dedican el número y se la quitarían). **De
  nuestro lado ya no falta nada:** `YCLOUD_API_KEY` y `YCLOUD_WEBHOOK_SECRET`
  como secrets, `YCLOUD_WA_FROM = "+526866066613"` en `wrangler.toml`, y el
  webhook dado de alta en YCloud con los dos eventos que pide la coexistencia
  (`whatsapp.inbound_message.received` y `whatsapp.smb.message.echoes` — el
  segundo es el que hace que el bot se calle cuando el asesor contesta desde su
  app). **El webhook nace `disabled`:** YCloud los crea apagados y hay que
  ponerlos en `active` aparte (`PATCH /v2/webhookEndpoints/<id>`, con `active`,
  no `enabled`). Ya está activo.
  Lo que falta no es nuestro: la pantalla del enlace dice *"YCloud will need to
  verify your business. You'll receive an email"*. Hasta ese correo,
  `GET /v2/whatsapp/phoneNumbers` y `/businessAccounts` contestan **cero** y no
  se puede ni mandar ni recibir. Cuando llegue: probar en vivo, nada más.
  El **saldo de YCloud está en $0.50 USD** — alcanza para probar y poco más;
  Meta cobra $0.008–$0.07 por conversación y sale de ese wallet.
  Las **dos API keys del panel (la "default" y la de "Ciudad Maderas") son de la
  misma cuenta** — mismo saldo, mismo webhook. No hay subcuentas que confundan.
  Guía: `starter/skill/references/channel-setup-guides/ycloud-whatsapp.md`.
- **Cuál Instagram es el oficial** — Meta Business Suite muestra
  `jjalwaysinnovating` como el IG de la página, pero el bot vive en
  `ciudadmaderaswoodcity`. No rompe nada (Zernio va directo a la cuenta), pero
  hay que decidir cuál es la del negocio antes de publicar en serio.
- **La página de Facebook se llama "Ciudad Maderas Terrenos y Casas Premium"** —
  con *Casas*, y el asesor solo vende terrenos. Todo lo demás dice lo contrario
  (sitio, KB, prompt, y una prueba que lo vigila). Conviene quitarle "y Casas
  Premium" desde Meta Business Suite.
- **Bot en un solo idioma — decidido así (2026-08-28), no es un olvido.** Vende
  también al extranjero, pero su mercado son sobre todo **mexicanos fuera de
  México**, que escriben en español. El modo espejo (detectar el idioma del
  cliente y responder en ese) existe en la plantilla —`LANG_MIRROR` en
  `src/system-prompt.ts`— pero es **de Forja+**: `settings-loader.ts` exige
  `isPro(env)` y este bot es `free`. Se puede forzar cambiando la descripción
  del idioma en `src/idioma.ts`, y **no se hizo a propósito**: sería saltarse una
  función de pago, y esa decisión es del dueño. Se revisa cuando haya datos
  reales de cuántos escriben en inglés. Mientras, a quien escriba en otro idioma
  el bot le contesta en español avisando del cambio — no se rompe.
- **Saldo de Anthropic** — sin cuota diaria que deje mudo al bot, pero el saldo se
  acaba. Conviene recarga automática (console.anthropic.com/settings/billing →
  Auto-reload) antes de abrir WhatsApp: si se acaba a media plática el bot deja
  de contestar sin error visible para el cliente.
- **Leads de prueba: BORRADOS** (2026-08-29). El panel quedó en cero, así que el
  primer lead que aparezca ya es de verdad. Eran 26 — los 21 inventados en las
  pruebas, más "Jay" (cuatro copias, el caso que destapó el duplicado de
  `captureLead`) y "Josa" (el que destapó el hilo eterno de Messenger); esos dos
  venían de conversaciones reales y el dueño confirmó borrarlos también.
  El panel tiene botón **Borrar** en el detalle de cada lead, abajo a la derecha.
