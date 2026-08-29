# Contenido para Instagram y Facebook

Tres posts y un reel, con las fotos reales de los desarrollos y la misma marca
que la portada. Los textos para copiar y pegar están en `textos.md`.

| Archivo | Qué es | Medida |
|---|---|---|
| `salida/post-1-financiamiento.png` | Sin aval, sin buró | 1080×1350 |
| `salida/post-2-cancun.png` | Cancún desde $1,388 al mes | 1080×1350 |
| `salida/post-3-ciudades.png` | Las 8 ciudades | 1080×1350 |
| `salida/reel-terrenos.mp4` | Reel de 12 s, **sin audio** | 1080×1920 |

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

## Rehacerlas o hacer más

```bash
python3 contenido.py   # arma los HTML (posts y placas del reel)
node captura.js        # los convierte en PNG con el Chromium del contenedor
python3 reel.py        # arma el mp4 con ffmpeg
```

`captura.js` necesita `playwright-core` (`npm i playwright-core`) y `reel.py`
usa el ffmpeg de `imageio-ffmpeg` (`pip install imageio-ffmpeg`). Las fotos y
las fuentes quedan en `insumos/`, que no se versiona — se vuelven a bajar solas.

Para un post nuevo se agrega una llamada a `post(...)` en `contenido.py` y su
nombre a la lista de `captura.js`. Los precios por ciudad viven en
`starter/member/landing.local.ts` (campo `precio` de cada región) — de ahí se
copian, no se inventan.
