# Contenido para Instagram y Facebook

**29 posts (1080×1350) y 8 reels (1080×1920)**, todos con fotos reales del
bucket de Ciudad Maderas. Los textos para copiar y pegar están en `textos.md`;
los archivos, en `salida/`.

| Familia | Posts | De dónde sale |
|---|---|---|
| Ciudades y precio | 2, 4, 6, 10–14 | tabla de mensualidades por plaza, `kb/02` |
| Cuánto cuesta | 3, 9 | `kb/02` |
| Financiamiento | 1, 22, 23, 24 | `kb/03` |
| Amenidades | 5, 19, 20, 21 | `kb/05` |
| El terreno y trámites | 7, 25, 26, 27 | `kb/05`, `kb/06` |
| La desarrolladora | 15, 16, 17, 18 | `kb/01`, `kb/05` |
| Por qué / plusvalía / trato | 8, 28, 29 | `kb/05`, `kb/07`, `kb/01` |

| Reel | Idea |
|---|---|
| `reel-terrenos.mp4` | A · sin buró |
| `reel-ciudades.mp4` | B · en qué ciudad |
| `reel-pasos.mp4` | C · los cuatro pasos |
| `reel-porque.mp4` | D · por qué un terreno |
| `reel-amenidades.mp4` | E · más de 30 amenidades |
| `reel-cuanto.mp4` | F · cuánto cuesta |
| `reel-trayectoria.mp4` | G · 40 años, +124,000 lotes |
| `reel-servicios.mp4` | H · urbanización completa |

## Hasta aquí llega la base de conocimiento

Los 29 posts y 8 reels son **todos** los ángulos que `member/kb/` sostiene sin
repetirse. A 1 post al día y 2 reels por semana, el calendario llega al 26 de
septiembre y ahí se acaba. Para seguir hay dos caminos honestos:
repetir los mejores cuando ya tengan más de dos semanas, o que el asesor aporte
datos nuevos que pueda sostener. Inventar un dato para llenar un hueco del
calendario es exactamente lo que no se hace: un post queda escrito y cualquiera
lo captura.

Dos fotos del bucket se descartaron a propósito: la de niños en un salón
(`fundacion/Educación.webp`) porque son caras de menores identificables y eso no
va en publicidad de venta, y las versiones `_mobile` de cada plaza porque son de
375×580 y no dan la resolución.

## Los números van en Montserrat, no en la serif

Sorts Mill Goudy trae números de estilo antiguo: el "30" salía como "3o" —con
una o chiquita— y el "1" de la lista de pasos era idéntico a una I mayúscula.
Se leían como errores de dedo. Por eso existe la clase `.num` y por eso
`.pasos b` usa Montserrat. Los números que ya salen bien en la serif (el "8" de
"8 estados") se quedan como están.

## El velo baja más que antes

El renglón dorado de arriba del precio se perdía sobre piedra clara: en el post
de León, "LEÓN, GUANAJUATO · MENSUALIDAD DESDE" era ilegible en la mitad
derecha, encima del Arco. Se bajó el velo en la franja donde vive el texto y el
`.eyebrow` pasó al oro claro con sombra propia. La foto se ve un poco menos,
pero un post cuyo trabajo es enseñar un precio primero tiene que leerse.

## Por qué 4:5 y no cuadrado

Los posts van en 1080×1350 porque ocupan más alto en el feed del celular, que
es donde tu gente los va a ver. Instagram y Facebook los aceptan igual.

## El reel va sin audio a propósito

La música se le pone **al subirlo**, desde la biblioteca de Instagram. No es un
descuido: usar un audio que esté sonando ayuda al alcance mucho más que
cualquier pista incrustada en el archivo — y una pista propia puede además
traer problemas de derechos.

## Lo que se verifica antes de publicar

Un post queda escrito y cualquiera lo captura, así que las reglas del negocio
pesan aquí más que en el chat:

- **Nunca la palabra "garantizar"**, en ninguna forma.
- **Precios siempre "desde"**, y pegado a la cifra — no en la letra chica.
  Por eso el post de Cancún dice "Mensualidad desde" justo encima del número.
- **Solo terrenos.** Ninguna pieza menciona casas.
- **"Asesor autorizado"** va arriba en todas: él no es la desarrolladora, y esa
  confusión es la que hay que evitar.

Dos afirmaciones se cayeron en la revisión y **no deben volver**: "sin
intereses" y "escrituración incluida". Ninguna está respaldada por la base de
conocimiento — la KB dice expresamente que intereses y plazos no se improvisan,
y de escrituración solo que sí se escritura, con costos y tiempos que explica un
asesor. En su lugar van "sin comprobante de ingresos" y "crédito directo con la
desarrolladora", que sí están en `starter/member/kb/03-financiamiento.md`.

También se cayó "a un paso de la playa" en el post de Cancún: la marca habla de
clima caribeño y paisajes, nunca de distancia a la playa. Una cercanía inventada
es de las que el cliente comprueba al llegar.

**Regla para lo que venga después: si un dato no está en la KB, no va en un
post.** Ahí es donde vive lo que el asesor puede sostener.

## Plaza ≠ desarrollo

Trampa fácil y ya cayó una vez. **Caribe, Península, Bajío** son los nombres con
que Ciudad Maderas llama a sus **plazas** (Quintana Roo, Yucatán, Guanajuato),
no desarrollos con ese nombre. El post decía "Ciudad Maderas Caribe, en Cancún"
como si fuera un desarrollo con dirección; ahora dice "es la plaza de Cancún".

En Querétaro, León, Mérida y San Luis Potosí la marca **sí** publica los nombres
de cada desarrollo, y esos se pueden usar tal cual (están en `landing.local.ts`).
En **Cancún, Monterrey, Aguascalientes y Puebla no los publica** — ahí se nombra
la ciudad y el detalle lo da un asesor.

## Los posts se programan; los reels NO

Los posts de foto salen solos por la API de Zernio. Los reels **no se pueden
programar**: Instagram no deja ponerle música de su biblioteca a un reel
publicado por API — eso es de Meta, no de Zernio, y ninguna herramienta lo
resuelve. Como el audio que esté sonando es lo que más ayuda al alcance,
conviene más subirlos a mano.

Por eso cada reel tiene un **recordatorio** programado en vez de una
publicación: el día que toca llega el aviso con el archivo y el texto, y solo
hay que subirlo desde el celular.

## Los titulares serif necesitan separación de verdad

En la itálica de Sorts Mill Goudy las letras vuelan sobre la siguiente, y un
espacio normal —o un `&nbsp;`— se lo come el voladizo: "UN TERRENO" salía
"UNTERRENO" y "YA ES TUYO" salía pegado. Para eso está la clase `.gap`, que se
pone en la palabra de la **izquierda** del choque. Vale la pena revisar cada
titular nuevo antes de publicarlo; no se nota hasta que se ve renderizado.

## Rehacerlas o hacer más

```bash
sh insumos.sh          # baja las fotos del bucket de Ciudad Maderas
python3 contenido.py   # arma los HTML (posts y placas del reel)
node captura.js        # los convierte en PNG con el Chromium del contenedor
python3 reel.py        # arma el mp4 con ffmpeg
```

`captura.js` necesita `playwright-core` (`npm i playwright-core`) y `reel.py`
usa el ffmpeg de `imageio-ffmpeg` (`pip install imageio-ffmpeg`). Las fotos y
las fuentes viven en `insumos/`, que **no se versiona** (pesa de más y las fotos
no son nuestras): `insumos.sh` la rearma bajando cada foto del bucket público,
y se salta las que ya estén.

Para un post nuevo se agrega una llamada a `post(...)` en `contenido.py` y su
nombre a la lista de `captura.js`. Los precios por ciudad viven en
`starter/member/landing.local.ts` (campo `precio` de cada región) — de ahí se
copian, no se inventan.
