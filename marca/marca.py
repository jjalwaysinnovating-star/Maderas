# Genera la foto de perfil y la portada de Facebook/Messenger del asesor.
#
# La idea: para quien vende TERRENOS, el dibujo del plano —los lotes vistos
# desde arriba— es el producto. Ciudad Maderas ya usa ese trazo en sus planos
# maestros, así que la marca del asesor se para en el mismo lenguaje en vez de
# inventar otro. Además resuelve el problema práctico de una foto de perfil:
# a 40 px en Messenger un logo con texto no se lee, pero una figura sí.
#
# Se baja solo lo que necesita (fuentes de la marca y la foto aérea del bucket
# de Ciudad Maderas), así que corre en limpio:
#     python3 marca.py && node captura.js
import base64, os, subprocess

DIR = os.path.dirname(os.path.abspath(__file__))
INSUMOS = f"{DIR}/insumos"
os.makedirs(INSUMOS, exist_ok=True)

FUENTE_URL = {
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

AZUL, AZUL2, ORO, ORO2 = "#00263a", "#001a28", "#b4a269", "#dcce9e"

FUENTES = f"""
@font-face{{font-family:Mont;src:url(data:font/woff2;base64,{MONT}) format('woff2');font-weight:100 900}}
@font-face{{font-family:Goudy;src:url(data:font/woff2;base64,{GOUDY}) format('woff2')}}
"""

# ── La marca ───────────────────────────────────────────────────────────────
def marca(oro=ORO2, piso=0.42):
    """De lejos es un árbol —Maderas—; de cerca son tres lotes apilados sobre
    la línea del terreno. Se eligió después de descartar seis intentos más
    "conceptuales" (parcelas, curvas de nivel, manzanas): a 40 px, que es como
    se ve en Messenger, ninguno se leía. Este sí, y además dice lo que vende."""
    return f"""
<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 20 L131 70 L69 70 Z" fill="{oro}"/>
  <path d="M70 80 L130 78 L145 118 L55 120 Z" fill="{oro}"/>
  <path d="M52 128 L148 126 L166 168 L34 170 Z" fill="{oro}"/>
  <rect x="92" y="170" width="16" height="18" fill="{oro}"/>
  <path d="M16 188 H184" stroke="{oro}" stroke-opacity="{piso}" stroke-width="9" stroke-linecap="round"/>
</svg>"""


PERFIL = f"""<!doctype html><meta charset="utf-8"><style>
{FUENTES}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1000px;height:1000px;overflow:hidden}}
.p{{width:1000px;height:1000px;position:relative;
    background:radial-gradient(circle at 50% 38%, #013b58 0%, {AZUL} 55%, {AZUL2} 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center}}
/* Anillo: ayuda a que se lea como pieza dentro del círculo de Facebook. */
.anillo{{position:absolute;inset:38px;border:3px solid rgba(220,206,158,.34);border-radius:50%}}
.marca{{width:390px;height:390px;margin-top:-14px}}
.nombre{{font-family:Mont,sans-serif;font-weight:800;font-size:57px;letter-spacing:.015em;
         color:#fff;line-height:1;margin-top:14px;white-space:nowrap}}
.rol{{font-family:Mont,sans-serif;font-weight:600;font-size:21px;letter-spacing:.26em;
      color:{ORO2};margin-top:20px;text-transform:uppercase}}
</style>
<div class="p">
  <div class="anillo"></div>
  <div class="marca">{marca()}</div>
  <div class="nombre">CIUDAD MADERAS</div>
  <div class="rol">Asesor autorizado</div>
</div>"""


# ── Portada ────────────────────────────────────────────────────────────────
# Se sube a 1640×624. En computadora se ve completa; en celular Facebook
# RECORTA LOS LADOS y deja una franja central de ~1109 px. Por eso todo el
# texto vive centrado dentro de esa franja: si se va a las orillas, en el
# teléfono —que es donde casi todos lo van a ver— desaparece.
PORTADA = f"""<!doctype html><meta charset="utf-8"><style>
{FUENTES}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1640px;height:624px;overflow:hidden}}
.c{{width:1640px;height:624px;position:relative;background:{AZUL2};overflow:hidden}}
.c>img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42}}
.velo{{position:absolute;inset:0;
       background:linear-gradient(90deg,rgba(0,26,40,.94) 0%,rgba(0,38,58,.62) 45%,rgba(0,26,40,.90) 100%)}}
.wrap{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:56px;
       padding:0 270px}}
.sello{{width:190px;height:190px;flex:none;opacity:.95}}
.tx{{display:flex;flex-direction:column}}
.eyebrow{{font-family:Mont,sans-serif;font-weight:700;font-size:19px;letter-spacing:.34em;
          color:{ORO2};text-transform:uppercase;margin-bottom:16px}}
h1{{font-family:Goudy,serif;font-weight:400;font-size:92px;line-height:.98;color:#fff;
    letter-spacing:.01em}}
h1 b{{display:block;font-family:Mont,sans-serif;font-weight:800;font-size:88px;color:{ORO2};
      letter-spacing:.005em;text-transform:uppercase}}
.datos{{display:flex;gap:14px;margin-top:26px;flex-wrap:wrap}}
.datos span{{font-family:Mont,sans-serif;font-weight:600;font-size:17px;letter-spacing:.10em;
             text-transform:uppercase;color:#fff;border:1px solid rgba(220,206,158,.55);
             padding:9px 16px;border-radius:3px;white-space:nowrap}}
.regla{{position:absolute;left:0;right:0;bottom:0;height:7px;background:{ORO}}}
</style>
<div class="c">
  <img src="data:image/webp;base64,{FOTO}" alt="">
  <div class="velo"></div>
  <div class="wrap">
    <div class="sello">{marca(piso=0.30)}</div>
    <div class="tx">
      <div class="eyebrow">Asesor autorizado</div>
      <h1>Terrenos<b>Premium</b></h1>
      <div class="datos">
        <span>Crédito directo</span><span>Sin aval</span><span>Sin buró</span>
        <span>Desde 1% de enganche</span>
      </div>
    </div>
  </div>
  <div class="regla"></div>
</div>"""

open(f"{DIR}/perfil.html", "w", encoding="utf-8").write(PERFIL)
open(f"{DIR}/portada.html", "w", encoding="utf-8").write(PORTADA)
print("listo: perfil.html y portada.html")
