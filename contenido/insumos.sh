#!/bin/sh
# Baja a insumos/ las fotos que usan los posts. La carpeta no se versiona —pesa
# de más y las fotos no son nuestras— así que este script es el que la rearma.
#
# Todas salen del bucket público de Ciudad Maderas, el mismo que sirve
# ciudadmaderas.com. Nada de banco de imágenes: un terreno se vende enseñando
# el terreno de verdad.
#
# Las fuentes (mont.woff2, goudy.woff2) NO están aquí: son Montserrat y Sorts
# Mill Goudy de Google Fonts, las mismas de la página, y ya viven en insumos/.
#
#     sh insumos.sh
set -e
cd "$(dirname "$0")"
mkdir -p insumos
B="https://storage.googleapis.com/landing-ciudad-maderas"

baja() {  # baja <url> <destino>
  [ -f "insumos/$2" ] && { echo "ya está  $2"; return; }
  curl -sfL -o "insumos/$2" "$1" && echo "bajado   $2"
}

# Amenidades — para los posts que hablan de los clubes.
baja "$B/amenidades/Alberca.jpg"                        alberca.jpg
baja "$B/amenidades/Albercas%20techadas.webp"           alberca-techada.webp
baja "$B/amenidades/Cancha%20Pa%CC%81del.webp"          padel.webp

# Ciudades y desarrollos — una por plaza, para los posts de precio.
baja "$B/website-ciudad-maderas/somos/colinas-1.webp"   clubes.webp
baja "$B/desarrollos/Qro/qro_estilodevida.webp"         queretaro.webp
baja "$B/desarrollos/quintanaRoo/caribe_estilodevida.webp" caribe.webp
baja "$B/desarrollos/monterrey/mty_estilodevida.webp"   monterrey.webp
baja "$B/desarrollos/guanajuato/gto_invertir.webp"      gto.webp
baja "$B/desarrollos/merida/merida_invertir.webp"       merida.webp
baja "$B/desarrollos/sanLuisPotosi/slp_estilodevida.webp" slp.webp

echo
echo "listo. Ahora: python3 contenido.py && node captura.js"
