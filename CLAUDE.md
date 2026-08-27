# Bot de Ciudad Maderas — estado y cómo retomar

Chatbot de IA para **Ciudad Maderas — Terrenos y Casas Premium**, operado por un
**asesor inmobiliario autorizado** (no es la desarrolladora). El bot vive en la
cuenta de Cloudflare del dueño; el código está en `starter/`, bajado con
`npx forjabot init` (plantilla Forja / Horizontes IA).

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
  leads **calientes** — avisar de todos entrena a ignorar los avisos.
- **Calificación de prospectos:** `calificarLead` en `member/tools.local.ts`, con sus
  reglas probadas en `test/calificacion-leads.test.ts`. Sustituye a la cadena
  ManyChat → Make → Sheets → Twilio que el dueño iba a contratar.

## Reglas del negocio que NO se relajan

- **Nunca "plusvalía garantizada"** ni equivalentes ("inversión segura", "no
  pierdes"). Es una promesa de rendimiento y es legalmente riesgosa en venta
  inmobiliaria. Las formulaciones aprobadas están en
  `starter/member/kb/09-como-hablar-de-plusvalia.md`.
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
| Textos de la página | `starter/member/landing.local.ts` |
| Modelo, idioma, moneda | Panel → Configuración |

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
- **Instagram** — cabe como la 2ª cuenta gratis de Zernio cuando el dueño quiera.
- **Saldo de Anthropic** — sin cuota diaria que deje mudo al bot, pero el saldo se
  acaba. Conviene recarga automática antes de abrir WhatsApp.
- **Leads de prueba** — hay seis falsos (Ana López, Roberto Salinas, Patricia Vega,
  Jay, Carlos Mendez, Lucia Ramos) en el panel. El panel ya tiene botón **Borrar**
  (dentro del detalle de cada lead), pero **vive en `src/` y aún no está desplegado**:
  hace falta un deploy con un API token de Cloudflare. Mientras tanto se pueden
  marcar "Perdido" desde el menú de estado.
- **Sesión web atada a la IP** — el canal web reemite la sesión si cambia la IP del
  visitante, así que en celular (WiFi → datos) se puede perder el hilo a media
  conversación. Es la defensa antiabuso de la plantilla. En WhatsApp/Instagram no
  aplica: ahí la identidad es el número o la cuenta.
