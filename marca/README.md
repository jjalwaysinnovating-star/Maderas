# Marca del asesor — Facebook y Messenger

Las dos imágenes que se suben a la página: `fb-perfil.png` (1000×1000) y
`fb-portada.png` (1640×624).

## Sin logo propio, a propósito

El asesor **no es la desarrolladora**. Un símbolo inventado compite con la marca
y confunde a quien pregunta con quién está tratando.

El **perfil** replica el emblema circular que Ciudad Maderas usa como foto de
perfil: fondo `#11253a` (muestreado de la suya), aro exterior dorado con
degradado metálico, aro interior blanco delgado, y adentro "CIUDAD MADERAS" en
serif con versalitas. Debajo va el mismo ritmo de dos renglones que el original
—uno dorado y uno claro—, pero diciendo lo que aquí sí aplica: **TERRENOS
PREMIUM** (no "y casas", que el asesor no vende) y **ASESOR AUTORIZADO**.

La **portada** usa el candado horizontal, como el encabezado de su sitio, sobre
una **foto real de un desarrollo**: la casa club vista desde el aire (alberca,
cancha de tenis y de fútbol en una sola toma), del propio bucket de Ciudad
Maderas. Se eligió esa de entre ocho candidatas porque es la única que dice
"comunidad con amenidades" completa en el formato ancho de una portada.

El velo encima es suave y centrado, no una cortina: oscurece lo justo debajo del
texto y deja ver el desarrollo. Un primer intento lo tapaba tanto que no se
distinguía qué era la foto, que era justamente el punto de ponerla.

Las versalitas se arman con dos tamaños (inicial completa, resto al 74%) porque
la fuente web no las trae de verdad — que es exactamente como se ve el original.

## La portada y el celular

Se sube a 1640×624. En computadora se ve completa; **en celular Facebook recorta
los lados** y deja una franja central de ~1109 px. Por eso todo —candado y los
cuatro sellos de crédito— vive centrado dentro de esa franja. Si algo se va a
las orillas, desaparece justo en el aparato donde casi todos lo van a ver. La
esquina inferior izquierda se deja vacía a propósito: ahí Facebook encima la
foto de perfil en computadora.

A 48 px —el tamaño en Messenger— el emblema se lee como un disco azul con aro
dorado, igual que el de la desarrolladora. Es el costo de no inventar un
símbolo, y vale la pena: a ese tamaño Facebook ya muestra el nombre de la
página al lado.

## Rehacerlas

```bash
python3 marca.py   # arma perfil.html y portada.html (baja fuentes y foto solo)
node captura.js    # los convierte en PNG con el Chromium del contenedor
```

`captura.js` necesita `playwright-core` (`npm i playwright-core`). Los insumos
que descarga quedan en `insumos/`, que no se versiona.

Para cambiar colores o textos se edita `marca.py` — es un archivo, sin
dependencias raras.
