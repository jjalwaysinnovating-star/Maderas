# Equipo del panel — guía para bots que YA existían (actualizar a >= 1.0.67)

Léela cuando un miembro con bot instalado pregunte "¿qué cambia en mi panel?",
"¿qué correo pongo?", "¿tengo que hacer algo al actualizar?". Respuesta corta:
**nada cambia hasta que él quiera**. Explícaselo con este guion.

## Qué le pasa a su panel al actualizar

- Entra **igual que siempre**: el navegador le pide usuario y contraseña; usuario
  `admin`, su contraseña de siempre (`DASHBOARD_PASSWORD`). No hay correo que poner.
- Lo ÚNICO nuevo que ve: una tab **Equipo** en el menú, bajo Configuración.
- Sus datos, sus conexiones, su prompt, su KB: intactos. El update no toca nada de eso.

## ¿Y si ve la pantalla nueva de login (la bonita, con la marca)?

Solo aparece **después** de que él mismo cree el primer acceso en la tab Equipo.
Aun así entra como siempre: en "Correo" escribe `admin` (o lo deja vacío) y abajo
su contraseña de siempre. Esa contraseña maestra **siempre funciona**, aunque
cree o borre a todo su equipo.

## Cuándo le conviene usar Equipo

- Va a **entregar el bot a un cliente** (Modo Agencia): le crea un acceso al jefe
  con su correo, rol Administrador, y deja de compartir la contraseña maestra.
- Tiene **empleados** que atienden el panel: cada uno con su correo, rol Equipo,
  y él decide qué secciones ven.
- Quiere saber **quién hizo qué** en el panel (bitácora).

Si nada de eso aplica, no tiene que tocar la tab. Punto.

## Cómo crear el primer acceso (5 minutos)

1. Panel → **Equipo** → "Invitar a alguien": nombre, correo, rol → **Crear invitación**.
2. El panel muestra un **link** (vale 7 días, un solo uso). Se lo manda por WhatsApp.
   (Si el bot tiene correo configurado, también se lo mandamos por correo — opcional.)
3. La persona abre el link y elige su contraseña; ahí también pone su WhatsApp,
   puesto, horario y por dónde quiere que le avisen. Entra directo.
4. Desde ese momento, ese acceso entra con **su correo + su contraseña**; el dueño
   sigue entrando con `admin` + la maestra.

## Preguntas que van a hacer

- **"¿Tengo que pagar algo?"** No. Todo Equipo funciona en Workers Free. Lo único
  opcional que puede costar es el envío automático de correos (ver abajo).
- **"¿Se me olvidó la contraseña maestra?"** Se cambia con
  `npx wrangler secret put DASHBOARD_PASSWORD` desde la carpeta del bot (eso
  además cierra las sesiones de todo el equipo — avísale).
- **"¿Un empleado olvidó la suya?"** Él pulsa "¿Olvidaste tu contraseña?" en el
  login. Con correo configurado le llega un link (1 h). Sin correo, el dueño
  recibe un ticket en el panel con el link y se lo pasa. O desde Equipo: "Nuevo link".
- **"¿Quiero quitarle acceso a alguien ya?"** Equipo → Quitar. Su sesión muere al
  instante (el panel valida el usuario en cada página).
- **"¿Puedo darle solo la bandeja a mi recepcionista?"** Sí: Equipo → "Qué ve el rol
  Equipo" → marca solo Conversaciones. Aplica al menú Y a las URLs directas.

## Correo del panel — opcional; cuéntale los downsides ANTES de configurar

| Opción | Necesita | Costo real | Downside |
|---|---|---|---|
| Cloudflare Email Service | Dominio en Cloudflare DNS onboardeado + `[[send_email]] name="EMAIL"` + `EMAIL_FROM` | **Workers Paid ($5/mes)**; 3,000 correos/mes incluidos | En Workers Free solo entrega a correos verificados de la cuenta — NO sirve para el equipo de un cliente |
| Resend | Cuenta gratis + dominio verificado en Resend + `RESEND_API_KEY` | Gratis (3,000/mes) | Tercero más; sin dominio propio el sandbox solo entrega al dueño de la cuenta |
| Sin correo (default) | Nada | Gratis | Los links se mandan a mano; los avisos de asignación solo por WhatsApp (si hay Twilio+plantilla) o se ven en el panel |

**Seguridad si activa Cloudflare Email**: en el toml, restringe el binding al
remitente del negocio para que nada pueda mandar desde otra dirección:

```toml
[[send_email]]
name = "EMAIL"
allowed_sender_addresses = ["bot@sunegocio.com"]
```

y `EMAIL_FROM = "bot@sunegocio.com"` como var. Sin `allowed_sender_addresses`
el binding acepta cualquier remitente del dominio — mejor acotarlo.

## Texto listo para que el miembro lo mande a SU cliente

> Ya tienes tu propio acceso al panel. Abre este link, elige tu contraseña y listo:
> [LINK]. Vale 7 días. Desde ahí mismo puedes dar acceso a tu equipo en la
> sección Equipo. Si algún día olvidas la contraseña, en el login hay un
> "¿Olvidaste tu contraseña?".
