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


def foto(n):
    """Devuelve (base64, mime). Las fotos del bucket vienen en webp y alguna en
    jpg — se busca la que exista en vez de fijar la extensión."""
    for ext, mime in (("webp", "image/webp"), ("jpg", "image/jpeg")):
        ruta = f"{INSUMOS}/{n}.{ext}"
        if os.path.exists(ruta):
            return b64(ruta), mime
    raise FileNotFoundError(f"no hay foto '{n}' en insumos/")

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
                  rgba(6,20,32,.74) 60%, rgba(6,20,32,.95) 100%)}}
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
/* El dorado oscuro se perdía sobre piedra clara y cielo: el renglón de arriba
   del precio ("LEÓN · MENSUALIDAD DESDE") quedaba ilegible en la mitad
   derecha. Va el oro claro y con sombra propia, no solo la del velo. */
.eyebrow{{font-family:Mont,sans-serif;font-weight:700;color:{ORO_CLARO};
          text-transform:uppercase;
          text-shadow:0 2px 14px rgba(0,16,28,.95),0 0 34px rgba(0,16,28,.75)}}
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
/* Lista numerada para el post del proceso. El número va en oro y con su propia
   columna, para que los cuatro pasos se lean de un vistazo aunque la foto de
   atrás tenga textura. */
.pasos{{margin-top:30px;display:flex;flex-direction:column;gap:17px}}
.pasos li{{list-style:none;display:flex;align-items:baseline;gap:18px;
  font-family:Mont,sans-serif;font-size:28px;color:#fff;line-height:1.3;
  text-shadow:0 2px 18px rgba(0,16,28,.85)}}
/* Los números también en Montserrat, por lo mismo que el "30": en Goudy el 1
   salía igualito a una I y el 3 y el 4 colgaban bajo la línea. */
.pasos b{{font-family:Mont,sans-serif;font-weight:700;font-size:32px;
  color:{ORO_CLARO};min-width:44px;line-height:1}}
.pasos i{{font-style:normal;color:#c9d1d8;font-size:24px}}
/* Goudy trae números de estilo antiguo: el "30" salía como "3o" —con una o
   chiquita— y se leía como error de dedo. Los números dentro de un titular
   serif van en Montserrat. */
.num{{font-family:Mont,sans-serif;font-weight:800;font-size:.82em;
      letter-spacing:-.01em}}
"""


def cabecera(rol="Asesor autorizado"):
    return f'<div class="top"><div class="rol">{rol}</div><div class="lin"></div></div>'


def post(nombre: str, imagen: str, cuerpo: str):
    datos, mime = foto(imagen)
    html = f"""<!doctype html><meta charset="utf-8"><style>{POST_CSS}</style>
<div class="lienzo">
  <img src="data:{mime};base64,{datos}" alt="">
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
<!-- "Caribe" es la PLAZA de Quintana Roo, no un desarrollo con ese nombre: la
     marca no publica nombres por separado en Cancún (ver la KB). Decirlo como
     desarrollo suena bien y es falso. -->
<div class="pie">Ciudad Maderas Caribe es la plaza de Cancún: terrenos premium
  con Club Acuático y amenidades. La mensualidad exacta depende del lote y del
  plazo — te la calculo.</div>
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

# ── Segunda tanda ──────────────────────────────────────────────────────────
# Todo lo que dicen estos cinco sale de member/kb/: los precios de la tabla por
# región (02), los cuatro clubes y las amenidades (05), los cuatro pasos (06) y
# el porqué de un terreno (05). Si un dato no está en la KB, no va en un post.

# 4 · Monterrey con SU mensualidad. La tabla de la KB es por plaza y dice
#     expresamente "no usar la de una ciudad para otra": $1,474 es de Monterrey.
post(
    "post-4-monterrey",
    "monterrey",
    """
<div class="eyebrow">Monterrey · Mensualidad desde</div>
<div class="cifra">$1,474</div>
<div class="grande" style="font-size:52px;margin-top:12px">al mes</div>
<div class="pie">Terrenos premium en la plaza de Monterrey. La mensualidad
  exacta depende del lote y del plazo que elijas — te la calculo.</div>
<div class="cta">Comenta INFO</div>""",
)

# 5 · Las amenidades. Es lo que separa un terreno premium de uno pelón, y la KB
#     las agrupa en cuatro clubes con nombre propio. Va el "más de 30" que dice
#     la KB, y la advertencia de que el catálogo varía por etapa — sin eso se
#     lee como promesa de que todo ya está construido.
post(
    "post-5-amenidades",
    "alberca",
    """
<div class="eyebrow">Cuatro clubes</div>
<div class="grande" style="font-size:76px">M<i>ÁS DE</i> <span class="num">30</span><br>A<i>MENIDADES</i></div>
<div class="chips"><span>Casa Club</span><span>Family Club</span>
  <span>Club Deportivo</span><span>Club Acuático</span></div>
<div class="pie">Albercas semiolímpicas, canchas de pádel y tenis, gimnasio y
  áreas infantiles, entre otras. El catálogo varía por desarrollo y etapa.</div>
<div class="cta">Comenta INFO</div>""",
)

# 6 · León. La plaza más barata junto con SLP ($1,288) — el precio de entrada
#     más bajo del catálogo después de Ags y Puebla, y con foto de la ciudad.
post(
    "post-6-leon",
    "gto",
    """
<div class="eyebrow">León, Guanajuato · Mensualidad desde</div>
<div class="cifra">$1,288</div>
<div class="grande" style="font-size:52px;margin-top:12px">al mes</div>
<div class="pie">Sin aval, sin buró y desde 1% de enganche. Te digo qué lotes
  hay disponibles y cuánto quedaría tu mensualidad.</div>
<div class="cta">Comenta INFO</div>""",
)

# 7 · El proceso. Quien nunca ha comprado un terreno no sabe qué sigue después
#     de preguntar, y esa duda frena más que el precio. Los cuatro pasos son
#     los de la KB, tal cual, sin prometer tiempos de escrituración.
post(
    "post-7-proceso",
    "slp",
    """
<div class="eyebrow">Así se compra</div>
<div class="grande" style="font-size:80px">C<i>UATRO</i><br>P<i>ASOS</i></div>
<ol class="pasos">
  <li><b>1</b><span>Platicamos <i>— qué ciudad, qué superficie y para qué lo quieres.</i></span></li>
  <li><b>2</b><span>Se cotiza <i>— los lotes disponibles hoy, con enganche y mensualidad.</i></span></li>
  <li><b>3</b><span>Apartas <i>— el lote queda a tu nombre y se firma el contrato.</i></span></li>
  <li><b>4</b><span>Pagas y escrituras <i>— directo con la desarrolladora.</i></span></li>
</ol>
<div class="pie">Sin compromiso desde el primer paso.</div>
<div class="cta">Comenta INFO</div>""",
)

# 8 · Por qué un terreno. Lleva a propósito la frase honesta de la KB ("si
#     necesitas mudarte el mes que entra, un terreno no es lo tuyo"): decir a
#     quién NO le sirve es lo que hace creíble todo lo demás, y ahorra citas
#     perdidas. No se nombra ninguna ciudad — la foto es de contexto.
post(
    "post-8-por-que-terreno",
    "merida",
    """
<div class="eyebrow">Patrimonio</div>
<!-- El margen no es adorno: la N inclinada de Goudy se monta sobre la T y se
     leía "UNTERRENO". Un espacio normal no basta —el voladizo de la itálica se
     lo come—, por eso va separación de verdad. -->
<div class="grande" style="font-size:70px">¿P<i>OR QUÉ</i><br><i style="margin-right:.5em">UN</i>T<i>ERRENO</i>?</div>
<div class="pie">La entrada y la mensualidad son bastante menores que algo ya
  construido, construyes a tu gusto y a tu ritmo, y mientras tanto ya tienes el
  patrimonio a tu nombre.<br><br>
  Si necesitas mudarte el mes que entra, un terreno no es lo tuyo — te lo digo
  de una vez.</div>
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

print("listo: 8 posts y 4 placas de reel")
