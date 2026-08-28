# Arma los posts de Instagram/Facebook y las placas del reel.
#
# Todo sale de la misma marca que la portada (marca/marca.py): serif con
# versalitas para el nombre, Montserrat para los datos, azul #11253a y el oro.
# Las fotos son REALES, del bucket de Ciudad Maderas — nada de banco de
# imágenes: un terreno se vende enseñando el terreno.
#
# Las reglas del negocio valen MÁS aquí que en el chat, porque un post queda
# escrito y cualquiera lo captura:
#   · nunca la palabra "garantizar", ni "plusvalía garantizada"
#   · precios SIEMPRE "desde", nunca un total cerrado
#   · SOLO TERRENOS — el asesor no vende casas
#   · se lee "asesor autorizado": él no es la desarrolladora
#
#     python3 contenido.py && node captura.js && python3 reel.py
import base64, os

DIR = os.path.dirname(os.path.abspath(__file__))
INSUMOS = f"{DIR}/insumos"
os.makedirs(f"{DIR}/salida", exist_ok=True)

b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
MONT = b64(f"{INSUMOS}/mont.woff2")
GOUDY = b64(f"{INSUMOS}/goudy.woff2")
foto = lambda n: b64(f"{INSUMOS}/{n}.webp")

AZUL, ORO, ORO_CLARO = "#11253a", "#b4a269", "#e8dcae"

BASE = f"""
@font-face{{font-family:Mont;src:url(data:font/woff2;base64,{MONT}) format('woff2');font-weight:100 900}}
@font-face{{font-family:Goudy;src:url(data:font/woff2;base64,{GOUDY}) format('woff2')}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{overflow:hidden}}
.lienzo{{position:relative;overflow:hidden;background:{AZUL}}}
.lienzo>img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
/* Velo de abajo hacia arriba: oscurece donde vive el texto y deja limpio el
   cielo o la alberca, que es lo que hace que la foto se vea. */
.velo{{position:absolute;inset:0;background:
  linear-gradient(180deg, rgba(6,20,32,.62) 0%, rgba(6,20,32,.10) 30%,
                  rgba(6,20,32,.55) 62%, rgba(6,20,32,.93) 100%)}}
.marco{{position:absolute;inset:0;display:flex;flex-direction:column;
        justify-content:space-between}}
/* Encabezado: el rol va ARRIBA y chico. Decir "asesor autorizado" no es letra
   chica legal, es lo que evita que lo confundan con la desarrolladora. */
.top{{display:flex;align-items:center;gap:14px}}
.top .lin{{flex:1;height:1px;background:rgba(232,220,174,.45)}}
.rol{{font-family:Mont,sans-serif;font-weight:600;color:{ORO_CLARO};
      text-transform:uppercase;white-space:nowrap}}
.vs{{font-family:Goudy,Georgia,serif;color:#fff;line-height:.92;
     text-shadow:0 3px 30px rgba(0,16,28,.8)}}
.vs i{{font-style:normal;font-size:.74em}}
.eyebrow{{font-family:Mont,sans-serif;font-weight:700;color:{ORO};
          text-transform:uppercase}}
.grande{{font-family:Goudy,Georgia,serif;color:#fff;line-height:.98;
         text-shadow:0 3px 30px rgba(0,16,28,.85)}}
.cifra{{font-family:Mont,sans-serif;font-weight:800;color:#fff;line-height:1;
        text-shadow:0 3px 30px rgba(0,16,28,.85)}}
.pie{{font-family:Mont,sans-serif;font-weight:400;color:#c9d1d8}}
.regla{{position:absolute;left:0;right:0;bottom:0;background:{ORO}}}
.cta{{font-family:Mont,sans-serif;font-weight:700;color:{AZUL};
      background:{ORO_CLARO};text-transform:uppercase;display:inline-block}}
"""

# ── Posts de feed: 1080x1350 (4:5) ─────────────────────────────────────────
# 4:5 y no cuadrado a propósito: ocupa más alto en el feed del celular, que es
# donde se ve todo. Instagram lo acepta igual y Facebook lo respeta.
W, H = 1080, 1350

POST_CSS = f"""
{BASE}
body{{width:{W}px;height:{H}px}}
.lienzo{{width:{W}px;height:{H}px}}
.marco{{padding:64px 68px 78px}}
.rol{{font-size:20px;letter-spacing:.20em}}
.eyebrow{{font-size:25px;letter-spacing:.22em;margin-bottom:22px}}
.grande{{font-size:96px}}
.cifra{{font-size:132px}}
.pie{{font-size:25px;line-height:1.5;margin-top:26px;max-width:88%}}
.cta{{font-size:23px;letter-spacing:.13em;padding:17px 30px;margin-top:38px;
      border-radius:3px}}
.regla{{height:9px}}
.chips{{display:flex;flex-wrap:wrap;gap:11px;margin-top:30px}}
.chips span{{font-family:Mont,sans-serif;font-weight:600;font-size:21px;
  letter-spacing:.09em;text-transform:uppercase;color:#fff;
  border:1px solid rgba(232,220,174,.6);padding:11px 19px;border-radius:3px;
  background:rgba(6,20,32,.42)}}
"""


def cabecera(rol="Asesor autorizado"):
    return f'<div class="top"><div class="rol">{rol}</div><div class="lin"></div></div>'


def post(nombre: str, imagen: str, cuerpo: str):
    html = f"""<!doctype html><meta charset="utf-8"><style>{POST_CSS}</style>
<div class="lienzo">
  <img src="data:image/webp;base64,{foto(imagen)}" alt="">
  <div class="velo"></div>
  <div class="marco">
    {cabecera()}
    <div>{cuerpo}</div>
  </div>
  <div class="regla"></div>
</div>"""
    open(f"{DIR}/{nombre}.html", "w", encoding="utf-8").write(html)


# 1 · El financiamiento. Es su gancho más fuerte: quien no califica en un banco
#     cree que no puede comprar un terreno, y aquí sí. Va primero por eso.
post(
    "post-1-financiamiento",
    "clubes",
    f"""
<div class="eyebrow">Crédito directo</div>
<div class="grande">S<i>IN AVAL.</i><br>S<i>IN BURÓ.</i></div>
<div class="chips"><span>Desde 1% de enganche</span>
  <span>Sin comprobante de ingresos</span>
  <span>Crédito directo con la desarrolladora</span></div>
<div class="pie">Terrenos premium en 8 estados de México.
  Te digo cuánto quedaría tu mensualidad.</div>
<div class="cta">Comenta INFO</div>""",
)

# 2 · Una ciudad concreta con su mensualidad REAL. El precio manda: es lo
#     primero que la gente busca y lo que hace que se detenga en el feed.
post(
    "post-2-cancun",
    "caribe",
    f"""
<div class="eyebrow">Cancún · Mensualidad desde</div>
<div class="cifra">$1,388</div>
<div class="grande" style="font-size:52px;margin-top:12px">al mes</div>
<div class="pie">Ciudad Maderas Caribe: terrenos premium con club acuático y
  amenidades, a un paso del Caribe. La mensualidad exacta depende del lote y
  del plazo — te la calculo.</div>
<div class="cta">Comenta INFO</div>""",
)

# 3 · Dónde hay. Resuelve la primera pregunta de todos ("¿y en mi ciudad?") y
#     de paso enseña que no es un solo terreno suelto.
post(
    "post-3-ciudades",
    "queretaro",
    f"""
<div class="eyebrow">Dónde puedes invertir</div>
<div class="grande" style="font-size:74px">8 <i>ESTADOS</i><br>D<i>E</i>&nbsp; M<i>ÉXICO</i></div>
<div class="chips"><span>Querétaro</span><span>León</span><span>Mérida</span>
  <span>Cancún</span><span>Monterrey</span><span>Aguascalientes</span>
  <span>San Luis Potosí</span><span>Puebla</span></div>
<div class="pie">Mensualidades desde $1,244. Dime tu ciudad y te paso los
  desarrollos disponibles.</div>
<div class="cta">Comenta INFO</div>""",
)

# ── Placas del reel: 1080x1920 (9:16), transparentes ───────────────────────
# Solo el TEXTO. El movimiento de la foto lo hace ffmpeg (reel.py) y estas
# placas se le encinan encima: así el zoom no deforma la tipografía.
RW, RH = 1080, 1920

REEL_CSS = f"""
{BASE}
body{{width:{RW}px;height:{RH}px;background:transparent}}
.lienzo{{width:{RW}px;height:{RH}px;background:transparent}}
.marco{{padding:120px 80px 150px}}
.rol{{font-size:23px;letter-spacing:.20em}}
.eyebrow{{font-size:30px;letter-spacing:.22em;margin-bottom:26px}}
.grande{{font-size:118px}}
.cifra{{font-size:170px}}
.pie{{font-size:32px;line-height:1.45;margin-top:30px}}
.cta{{font-size:30px;letter-spacing:.13em;padding:22px 38px;margin-top:44px;
      border-radius:4px}}
.chips{{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}}
.chips span{{font-family:Mont,sans-serif;font-weight:600;font-size:27px;
  letter-spacing:.09em;text-transform:uppercase;color:#fff;
  border:1px solid rgba(232,220,174,.65);padding:14px 24px;border-radius:3px;
  background:rgba(6,20,32,.45)}}
"""


def placa(nombre: str, cuerpo: str, con_rol=True):
    # El velo va DENTRO de la placa, no en ffmpeg. Los filtros de ffmpeg pintan
    # rectángulos de borde duro y se veía una raya horizontal a media pantalla
    # —parecía un error de render—; un degradado de CSS baja parejo.
    html = f"""<!doctype html><meta charset="utf-8"><style>{REEL_CSS}</style>
<div class="lienzo">
  <div class="velo"></div>
  <div class="marco">
    {cabecera() if con_rol else "<div></div>"}
    <div>{cuerpo}</div>
  </div>
</div>"""
    open(f"{DIR}/{nombre}.html", "w", encoding="utf-8").write(html)


# El reel cuenta una sola idea en cuatro tiempos: gancho → prueba → dónde →
# qué hacer. Nada de meter todo en la primera placa; el primer segundo decide
# si se quedan.
placa("reel-1", """
<div class="eyebrow">Terrenos premium</div>
<div class="grande">¿T<i>E DIJERON</i><br><i>QUE NO</i><br><i>CALIFICAS?</i></div>
<div class="pie">Aquí no revisamos buró.</div>""")

placa("reel-2", """
<div class="eyebrow">Crédito directo</div>
<div class="grande">S<i>IN AVAL.</i><br>S<i>IN BURÓ.</i></div>
<div class="chips"><span>Desde 1% de enganche</span>
  <span>Sin comprobante de ingresos</span></div>""")

placa("reel-3", """
<div class="eyebrow">Mensualidades desde</div>
<div class="cifra">$1,244</div>
<div class="chips"><span>Querétaro</span><span>Cancún</span><span>Monterrey</span>
  <span>Mérida</span><span>León</span><span>Puebla</span></div>""")

placa("reel-4", """
<div class="grande" style="font-size:92px">E<i>SCRÍBEME</i><br><i>HOY</i></div>
<div class="pie">Te digo cuánto quedaría tu mensualidad,<br>sin compromiso.</div>
<div class="cta">Comenta INFO</div>""")

print("listo: 3 posts y 4 placas de reel")
