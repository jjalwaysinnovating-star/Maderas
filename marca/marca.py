# Genera la foto de perfil y la portada de Facebook/Messenger del asesor.
#
# NO se inventa logo. El asesor no es la desarrolladora: un símbolo propio
# compite con la marca y confunde a quien pregunta con quién está tratando.
# Se reproduce el candado real de Ciudad Maderas —"CIUDAD MADERAS" en serif con
# versalitas, y debajo "TERRENOS" en negritas + "PREMIUM" en delgada— y en el
# renglón donde ellos ponen el nombre del desarrollo (Bosques, Corregidora…)
# aquí va ASESOR AUTORIZADO. Así el rol queda dicho en el mismo lugar y con el
# mismo peso con que la marca nombra a sus plazas.
#
# Se baja solo lo que necesita (las fuentes de la marca y la foto aérea del
# bucket de Ciudad Maderas), así que corre en limpio:
#     python3 marca.py && node captura.js
import base64, os, subprocess

DIR = os.path.dirname(os.path.abspath(__file__))
INSUMOS = f"{DIR}/insumos"
os.makedirs(INSUMOS, exist_ok=True)

FUENTE_URL = {
    # Las mismas dos familias que carga ciudadmaderas.com.
    "mont.woff2": "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2",
    "goudy.woff2": "https://fonts.gstatic.com/s/sortsmillgoudy/v16/Qw3GZR9MED_6PSuS_50nEaVrfzgEbHoEjw.woff2",
    # Casa club de un desarrollo real, desde el aire: alberca, cancha de tenis y
    # de fútbol en una sola toma. Es la foto que mejor dice "comunidad con
    # amenidades" en el formato ancho de una portada.
    "desarrollo.webp": "https://storage.googleapis.com/landing-ciudad-maderas/website-ciudad-maderas/somos/colinas-1.webp",
}


def insumo(nombre: str) -> str:
    """Ruta local del archivo; lo baja la primera vez."""
    destino = f"{INSUMOS}/{nombre}"
    if not os.path.exists(destino):
        subprocess.run(["curl", "-sSfL", "-o", destino, FUENTE_URL[nombre]], check=True)
    return destino


b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()

MONT = b64(insumo("mont.woff2"))
GOUDY = b64(insumo("goudy.woff2"))
FOTO = b64(insumo("desarrollo.webp"))

# Muestreados de la foto de perfil real de Ciudad Maderas.
AZUL, AZUL2, ORO = "#11253a", "#001a28", "#b4a269"
ORO_OSCURO, ORO_CLARO = "#8a7c56", "#e8dcae"

FUENTES = f"""
@font-face{{font-family:Mont;src:url(data:font/woff2;base64,{MONT}) format('woff2');font-weight:100 900}}
@font-face{{font-family:Goudy;src:url(data:font/woff2;base64,{GOUDY}) format('woff2')}}
"""

# El serif del logo va en VERSALITAS: la inicial a tamaño completo y el resto
# más chico. La fuente web no trae versalitas de verdad, así que se arman con
# dos tamaños — que es exactamente como se ve en su logo original.
CAJA = """
.vs{font-family:Goudy,Georgia,serif;color:#fff;line-height:.90;white-space:nowrap;
     text-shadow:0 2px 24px rgba(0,20,32,.75)}
.vs i{font-style:normal;font-size:.74em}
.bajada{font-family:Mont,sans-serif;color:#fff;white-space:nowrap;text-shadow:0 2px 16px rgba(0,20,32,.8)}
.bajada b{font-weight:700}
.bajada span{font-weight:300}
.rol{font-family:Goudy,Georgia,serif;color:%s;white-space:nowrap;text-shadow:0 2px 16px rgba(0,20,32,.8)}
.rol i{font-style:normal;font-size:.74em}
""" % ORO


def candado(escala=1.0, apilado=False):
    """El candado de la marca. `apilado` parte CIUDAD / MADERAS en dos renglones
    para que en el círculo del perfil la tipografía quepa grande."""
    nombre = (
        f'<div class="vs" style="font-size:{116*escala:.0f}px">C<i>IUDAD</i></div>'
        f'<div class="vs" style="font-size:{116*escala:.0f}px">M<i>ADERAS</i></div>'
        if apilado
        else f'<div class="vs" style="font-size:{92*escala:.0f}px">C<i>IUDAD</i> M<i>ADERAS</i></div>'
    )
    return f"""
{nombre}
<div class="bajada" style="font-size:{30*escala:.0f}px;letter-spacing:{.055*escala:.3f}em;
     margin-top:{16*escala:.0f}px"><b>TERRENOS</b> <span>PREMIUM</span></div>
<div class="rol" style="font-size:{44*escala:.0f}px;letter-spacing:{.06*escala:.3f}em;
     margin-top:{14*escala:.0f}px">A<i>SESOR AUTORIZADO</i></div>"""


PERFIL = f"""<!doctype html><meta charset="utf-8"><style>
{FUENTES}{CAJA}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1000px;height:1000px;overflow:hidden}}
.p{{width:1000px;height:1000px;position:relative;background:{AZUL};
    display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}}
.aros{{position:absolute;inset:0}}
.tx{{position:relative;z-index:2}}
/* El renglón dorado y el claro debajo son el ritmo del emblema original
   ("TERRENOS Y CASAS" en dorado, "PREMIUM" en claro). Aquí el segundo renglón
   dice el rol, que es lo que cambia respecto de la desarrolladora. */
.producto{{font-family:Mont,sans-serif;font-weight:700;color:{ORO};
           font-size:50px;letter-spacing:.10em;margin-top:30px}}
.rol2{{font-family:Mont,sans-serif;font-weight:400;color:#d7dde3;
       font-size:41px;letter-spacing:.15em;margin-top:12px}}
</style>
<div class="p">
  <svg class="aros" viewBox="0 0 1000 1000" fill="none">
    <defs><linearGradient id="oro" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="{ORO_CLARO}"/><stop offset=".38" stop-color="{ORO}"/>
      <stop offset=".62" stop-color="{ORO_OSCURO}"/><stop offset="1" stop-color="{ORO_CLARO}"/>
    </linearGradient></defs>
    <circle cx="500" cy="500" r="437" stroke="url(#oro)" stroke-width="13"/>
    <circle cx="500" cy="500" r="408" stroke="#ffffff" stroke-width="4" stroke-opacity=".92"/>
  </svg>
  <div class="tx">
    <div class="vs" style="font-size:154px">C<i>IUDAD</i></div>
    <div class="vs" style="font-size:154px">M<i>ADERAS</i></div>
    <div class="producto">TERRENOS PREMIUM</div>
    <div class="rol2">ASESOR AUTORIZADO</div>
  </div>
</div>"""


# ── Portada ────────────────────────────────────────────────────────────────
# Se sube a 1640×624. En computadora se ve completa; en celular Facebook
# RECORTA LOS LADOS y deja una franja central de ~1109 px. Por eso todo el
# contenido vive centrado dentro de esa franja: si se va a las orillas, en el
# teléfono —que es donde casi todos lo van a ver— desaparece. La esquina
# inferior izquierda se deja libre: ahí Facebook encima la foto de perfil.
PORTADA = f"""<!doctype html><meta charset="utf-8"><style>
{FUENTES}{CAJA}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1640px;height:624px;overflow:hidden}}
.c{{width:1640px;height:624px;position:relative;background:{AZUL2};overflow:hidden}}
.c>img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.92}}
/* Velo suave y centrado: deja ver el desarrollo y aun así sostiene el texto.
   Antes tapaba casi toda la foto y no se distinguía qué era. */
.velo{{position:absolute;inset:0;background:
  radial-gradient(ellipse 62% 78% at 50% 50%, rgba(3,22,36,.78) 0%, rgba(3,22,36,.40) 55%, rgba(3,22,36,.26) 100%),
  linear-gradient(180deg, rgba(3,22,36,.40) 0%, rgba(3,22,36,.08) 40%, rgba(3,22,36,.60) 100%)}}
.wrap{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
       justify-content:center;text-align:center;padding:0 280px}}
.datos{{display:flex;gap:13px;margin-top:34px;flex-wrap:nowrap}}
.datos span{{font-family:Mont,sans-serif;font-weight:600;font-size:17px;letter-spacing:.10em;
             text-transform:uppercase;color:#fff;border:1px solid rgba(220,206,158,.72);
             padding:9px 17px;border-radius:3px;white-space:nowrap;background:rgba(3,22,36,.42)}}
.regla{{position:absolute;left:0;right:0;bottom:0;height:7px;background:{ORO}}}
</style>
<div class="c">
  <img src="data:image/webp;base64,{FOTO}" alt="">
  <div class="velo"></div>
  <div class="wrap">
    {candado(escala=0.92)}
    <div class="datos">
      <span>Crédito directo</span><span>Sin aval</span><span>Sin buró</span>
      <span>Desde 1% de enganche</span>
    </div>
  </div>
  <div class="regla"></div>
</div>"""

open(f"{DIR}/perfil.html", "w", encoding="utf-8").write(PERFIL)
open(f"{DIR}/portada.html", "w", encoding="utf-8").write(PORTADA)
print("listo: perfil.html y portada.html")
