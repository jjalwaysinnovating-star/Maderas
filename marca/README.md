# Marca del asesor — Facebook y Messenger

Las dos imágenes que se suben a la página: `fb-perfil.png` (1000×1000) y
`fb-portada.png` (1640×624).

## La marca

De lejos es un **árbol** —Maderas—; de cerca son **tres lotes apilados** sobre
la línea del terreno. Se llegó ahí después de descartar seis intentos más
conceptuales (parcelas irregulares, curvas de nivel, manzanas divididas): todos
se veían bien en grande y **ninguno se leía a 40 px**, que es como aparece en
Messenger. Este sí, y además dice lo que se vende.

## La portada y el celular

Se sube a 1640×624. En computadora se ve completa; **en celular Facebook recorta
los lados** y deja una franja central de ~1109 px. Por eso todo —sello, títulos
y los cuatro sellos de crédito— vive centrado dentro de esa franja. Si algo se
va a las orillas, desaparece justo en el aparato donde casi todos lo van a ver.
La esquina inferior izquierda se deja vacía a propósito: ahí Facebook encima la
foto de perfil en computadora.

## Rehacerlas

```bash
python3 marca.py   # arma perfil.html y portada.html (baja fuentes y foto solo)
node captura.js    # los convierte en PNG con el Chromium del contenedor
```

`captura.js` necesita `playwright-core` (`npm i playwright-core`). Los insumos
que descarga quedan en `insumos/`, que no se versiona.

Para cambiar colores o textos se edita `marca.py` — es un archivo, sin
dependencias raras.
