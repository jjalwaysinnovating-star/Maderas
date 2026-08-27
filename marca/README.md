# Marca del asesor — Facebook y Messenger

Las dos imágenes que se suben a la página: `fb-perfil.png` (1000×1000) y
`fb-portada.png` (1640×624).

## Sin logo propio, a propósito

El asesor **no es la desarrolladora**. Un símbolo inventado compite con la marca
y confunde a quien pregunta con quién está tratando, así que aquí se reproduce
el **candado real de Ciudad Maderas**: "CIUDAD MADERAS" en serif con versalitas,
y debajo "TERRENOS" en negritas junto a "PREMIUM" en delgada.

En el renglón donde la marca pone el nombre del desarrollo —Bosques,
Corregidora, Península— aquí va **ASESOR AUTORIZADO**, en el mismo serif y en
dorado. El rol queda dicho en el lugar y con el peso con que la marca nombra a
sus propias plazas: se lee como parte del sistema, no como un añadido.

Las versalitas se arman con dos tamaños (inicial completa, resto al 74%) porque
la fuente web no las trae de verdad — que es exactamente como se ve el logo
original.

## La portada y el celular

Se sube a 1640×624. En computadora se ve completa; **en celular Facebook recorta
los lados** y deja una franja central de ~1109 px. Por eso todo —candado y los
cuatro sellos de crédito— vive centrado dentro de esa franja. Si algo se va a
las orillas, desaparece justo en el aparato donde casi todos lo van a ver. La
esquina inferior izquierda se deja vacía a propósito: ahí Facebook encima la
foto de perfil en computadora.

Un candado de solo texto no se lee a 48 px, que es el tamaño en Messenger. Es el
costo de no inventar un símbolo, y vale la pena: a ese tamaño Facebook ya
muestra el nombre de la página al lado.

## Rehacerlas

```bash
python3 marca.py   # arma perfil.html y portada.html (baja fuentes y foto solo)
node captura.js    # los convierte en PNG con el Chromium del contenedor
```

`captura.js` necesita `playwright-core` (`npm i playwright-core`). Los insumos
que descarga quedan en `insumos/`, que no se versiona.

Para cambiar colores o textos se edita `marca.py` — es un archivo, sin
dependencias raras.
