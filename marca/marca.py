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
    "aerea.webp": "https://storage.googleapis.com/landing-ciudad-maderas/mapa/desarrollo.webp",
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
FOTO = b64(insumo("aerea.webp"))

AZUL, AZUL2, ORO = "#00263a", "#001a28", "#b4a269"

FUENTES = f"""
@font-face{{font-family:Mont;src:url(data:font/woff2;base64,{MONT}) format('woff2');font-weight:100 900}}
@font-face{{font-family:Goudy;src:url(data:font/woff2;base64,{GOUDY}) format('woff2')}}
"""

# El serif del logo va en VERSALITAS: la inicial a tamaño completo y el resto
# más chico. La fuente web no trae versalitas de verdad, así que se arman con
# dos tamaños — que es exactamente como se ve en su logo original.
CAJA = """
.vs{font-family:Goudy,Georgia,serif;color:#fff;line-height:.96;white-space:nowrap}
.vs i{font-style:normal;font-size:.74em}
.bajada{font-family:Mont,sans-serif;color:#fff;white-space:nowrap}
.bajada b{font-weight:700}
.bajada span{font-weight:300}
.rol{font-family:Goudy,Georgia,serif;color:%s;white-space:nowrap}
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
.p{{width:1000px;height:1000px;
    background:radial-gradient(circle at 50% 38%, #013b58 0%, {AZUL} 55%, {AZUL2} 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}}
</style>
<div class="p">{candado(escala=1.32, apilado=True)}</div>"""


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
.c>img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.38}}
.velo{{position:absolute;inset:0;
       background:linear-gradient(180deg,rgba(0,26,40,.86) 0%,rgba(0,38,58,.70) 45%,rgba(0,26,40,.92) 100%)}}
.wrap{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
       justify-content:center;text-align:center;padding:0 280px}}
.datos{{display:flex;gap:13px;margin-top:34px;flex-wrap:nowrap}}
.datos span{{font-family:Mont,sans-serif;font-weight:600;font-size:17px;letter-spacing:.10em;
             text-transform:uppercase;color:#fff;border:1px solid rgba(180,162,105,.62);
             padding:9px 17px;border-radius:3px;white-space:nowrap}}
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
