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
/* Separación de verdad entre dos palabras de un titular. En la itálica de
   Goudy las letras vuelan sobre la siguiente y un espacio normal —o un
   &nbsp;— se lo come el voladizo: "UN TERRENO" salía "UNTERRENO" y
   "YA ES TUYO" salía "ES TUYO" pegado. Se pone en la palabra de la IZQUIERDA
   del choque. */
.gap{{margin-right:.42em}}
/* Goudy trae números de estilo antiguo: el "30" salía como "3o" —con una o
   chiquita— y se leía como error de dedo. Los números dentro de un titular
   serif van en Montserrat. */
.num{{font-family:Mont,sans-serif;font-weight:800;font-size:.82em;
      letter-spacing:-.01em}}
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
<div class="grande" style="font-size:70px">¿P<i>OR QUÉ</i><br><i class="gap">UN</i>T<i>ERRENO</i>?</div>
<div class="pie">La entrada y la mensualidad son bastante menores que algo ya
  construido, construyes a tu gusto y a tu ritmo, y mientras tanto ya tienes el
  patrimonio a tu nombre.<br><br>
  Si necesitas mudarte el mes que entra, un terreno no es lo tuyo — te lo digo
  de una vez.</div>
<div class="cta">Comenta INFO</div>""",
)

# 9 · Cuánto cuesta el terreno completo. Los otros posts hablan de la
#     mensualidad; esta es la otra pregunta que todo el mundo hace y que
#     ninguno contestaba. El "desde" pegado a la cifra, como manda la KB: el
#     precio final depende de ciudad, metros y ubicación, y lo confirma un
#     asesor.
post(
    "post-9-cuanto-cuesta",
    "mapa",
    """
<div class="eyebrow">El terreno completo · Desde</div>
<div class="cifra" style="font-size:118px">$550,000</div>
<div class="grande" style="font-size:46px;margin-top:14px">o <span class="num">$1,244</span> al mes</div>
<div class="pie">El precio final depende de la ciudad, los metros y la ubicación
  dentro del desarrollo. Te cotizo el lote que te guste, sin costo.</div>
<div class="cta">Comenta INFO</div>""",
)

# ── Tercera tanda: el calendario de 2 posts al día ─────────────────────────
# Todo sale de member/kb/. Los ángulos son distintos entre sí a propósito: si
# se repiten, el feed se lee como si el asesor no tuviera nada más que decir.
#
# La tabla de mensualidades es POR PLAZA y la KB dice expresamente "no usar la
# de una ciudad para otra" — por eso hay un post por ciudad y no uno genérico.


def ciudad(nombre, imagen, titulo, cifra, pie):
    """Un post de precio de ciudad. Todos comparten molde para que el feed se
    lea como una serie, y solo cambian la ciudad, la foto y la cifra."""
    post(
        nombre,
        imagen,
        f"""
<div class="eyebrow">{titulo} · Mensualidad desde</div>
<div class="cifra">{cifra}</div>
<div class="grande" style="font-size:52px;margin-top:12px">al mes</div>
<div class="pie">{pie}</div>
<div class="cta">Comenta INFO</div>""",
    )


ciudad("post-10-queretaro", "queretaro", "Querétaro", "$1,348",
       "Terrenos premium en la plaza de Querétaro. La mensualidad exacta "
       "depende del lote y del plazo que elijas — te la calculo.")

ciudad("post-11-merida", "merida", "Mérida", "$1,683",
       "Terrenos premium en la plaza Península, en Mérida. Sin aval, sin buró "
       "y desde 1% de enganche.")

ciudad("post-12-aguascalientes", "ags", "Aguascalientes", "$1,244",
       "Es la mensualidad de arranque más baja del catálogo, junto con Puebla. "
       "Te digo qué lotes hay disponibles hoy.")

ciudad("post-13-slp", "slp", "San Luis Potosí", "$1,288",
       "Terrenos premium en la plaza de San Luis Potosí, con crédito directo: "
       "sin aval y sin revisión de buró.")

ciudad("post-14-puebla", "puebla", "Puebla", "$1,244",
       "Terrenos premium en la plaza de Puebla. Dime cuánto puedes dar de "
       "enganche y te calculo la mensualidad.")


# La trayectoria de la desarrolladora. Son los números de la KB (01) y no se
# redondean hacia arriba: 124,000 lotes ENTREGADOS es un dato comprobable y
# vale más que cualquier adjetivo.
post(
    "post-15-trayectoria",
    "clubes",
    """
<div class="eyebrow">La desarrolladora detrás</div>
<div class="cifra" style="font-size:120px">40 <span class="grande" style="font-size:56px">años</span></div>
<div class="chips"><span>+124,000 lotes entregados</span>
  <span>28 desarrollos</span></div>
<div class="pie">Comunidades planificadas con más de cuatro décadas de
  trayectoria en el sector. Yo soy su asesor autorizado.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-16-presencia",
    "caribe",
    """
<div class="eyebrow">Dónde está Ciudad Maderas</div>
<div class="grande" style="font-size:72px"><span class="num">20</span> <i>CIUDADES</i><br><i class="gap">EN</i>M<i>ÉXICO</i></div>
<div class="chips"><span>4 en Estados Unidos</span><span>40 oficinas</span>
  <span>28 desarrollos</span></div>
<div class="pie">Yo comercializo terrenos en 8 estados, y te atiendo en línea
  estés donde estés — también desde el extranjero.</div>
<div class="cta">Comenta INFO</div>""",
)

# Kan Yu y biofísica aplicada. Es el dato más raro del catálogo y por eso
# funciona: nadie más lo dice. Va con las palabras exactas de la KB (05).
post(
    "post-17-kanyu",
    "biofisica",
    """
<div class="eyebrow">Cómo se planean</div>
<div class="grande" style="font-size:72px">K<i class="gap">AN</i>Y<i>U</i> <i>Y</i><br>B<i>IOFÍSICA</i><br>A<i>PLICADA</i></div>
<div class="pie">Calles, avenidas, jardines, montañas y lagos se conectan en una
  gran red, buscando un flujo constante enfocado en la calidad de vida de quien
  vive ahí. Es la única desarrolladora en Latinoamérica que lo aplica.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-18-fundacion",
    "mascotas",
    """
<div class="eyebrow">Fundación Ciudad Maderas</div>
<div class="grande" style="font-size:78px">N<i>O SOLO</i><br>V<i>ENDEN</i><br>T<i>ERRENOS</i></div>
<div class="chips"><span>Educación</span><span>Salud</span><span>Arte</span>
  <span>Deporte</span><span>Protección animal</span></div>
<div class="pie">La desarrolladora tiene su propia fundación. Vale la pena
  saber con quién estás firmando.</div>
<div class="cta">Comenta INFO</div>""",
)


# Las amenidades, una por una. La KB (05) las lista pero NO dice cuál pertenece
# a cuál club, así que ningún post se lo inventa: se nombran las amenidades y
# se repite la advertencia de que el catálogo varía por desarrollo y etapa.
post(
    "post-19-albercas",
    "alberca-techada",
    """
<div class="eyebrow">Entre más de 30 amenidades</div>
<div class="grande" style="font-size:72px">A<i>LBERCAS</i><br>S<i>EMIOLÍMPICAS</i><br><i>Y</i>&nbsp; T<i>ECHADAS</i></div>
<div class="pie">Para nadar todo el año, no solo en temporada. El catálogo
  exacto varía por desarrollo y etapa — te digo qué hay en el que te guste.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-20-canchas",
    "tenis",
    """
<div class="eyebrow">Entre más de 30 amenidades</div>
<div class="grande" style="font-size:84px">C<i>ANCHAS DE</i><br>P<i>ÁDEL</i> <i>Y</i>&nbsp; T<i>ENIS</i></div>
<div class="chips"><span>Gimnasio</span><span>Casa club</span></div>
<div class="pie">Dentro del desarrollo, con acceso controlado. El catálogo
  varía por desarrollo y etapa.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-21-familia",
    "chapoteadero",
    """
<div class="eyebrow">Entre más de 30 amenidades</div>
<div class="grande" style="font-size:82px">C<i>HAPOTEADEROS</i><br><i>Y</i>&nbsp; Á<i>REAS</i><br>I<i>NFANTILES</i></div>
<div class="pie">Si el terreno es para la familia, esto pesa más que los metros.
  El catálogo varía por desarrollo y etapa.</div>
<div class="cta">Comenta INFO</div>""",
)


# Financiamiento, desmenuzado. Es el bloque que más convence según la KB (03),
# así que cada facilidad tiene su propio post en vez de ir todas apretadas.
post(
    "post-22-enganche",
    "alberca",
    """
<div class="eyebrow">Enganche desde</div>
<div class="cifra" style="font-size:230px">1<span class="grande" style="font-size:110px">%</span></div>
<div class="pie">No necesitas una entrada fuerte para empezar a construir
  patrimonio. Es de las mayores facilidades del sector.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-23-buro",
    "monterrey",
    """
<div class="eyebrow">Si te descartaste solo, léelo</div>
<div class="grande" style="font-size:80px">E<i>STAR EN</i><br>B<i>URÓ NO TE</i><br>L<i>O IMPIDE</i></div>
<div class="pie">No se revisa buró en ningún momento del proceso. El crédito es
  directo con la desarrolladora, no con un banco — por eso puede haber
  condiciones que un banco no da.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-24-formas-de-pago",
    "gto",
    """
<div class="eyebrow">Formas de pago</div>
<div class="grande" style="font-size:82px">T<i>RES</i><br>C<i>AMINOS</i></div>
<div class="chips"><span>Crédito directo</span><span>Transferencia</span>
  <span>Contado</span></div>
<div class="pie">Si es de contado, con más razón vale que te cotice un asesor:
  esas condiciones se manejan caso por caso.</div>
<div class="cta">Comenta INFO</div>""",
)


# El terreno y los trámites. Son las preguntas que frenan a quien nunca ha
# comprado, y cada una lleva su matiz de la KB — la etapa, el contrato, el
# asesor — porque sin el matiz se convierten en promesas.
post(
    "post-25-urbanizacion",
    "mapa",
    """
<div class="eyebrow">¿El terreno tiene servicios?</div>
<div class="grande" style="font-size:76px">U<i>RBANIZACIÓN</i><br>C<i>OMPLETA</i></div>
<div class="chips"><span>Calles</span><span>Banquetas</span><span>Agua</span>
  <span>Luz</span><span>Drenaje</span><span>Acceso controlado</span></div>
<div class="pie">Lo que ya está listo hoy depende de la etapa. Te digo
  exactamente en qué va la del lote que te interese.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-26-revender",
    "merida",
    """
<div class="eyebrow">¿Se puede rentar o revender?</div>
<div class="grande" style="font-size:74px">S<i>Í, Y MUCHA</i><br>G<i>ENTE</i><br>C<i>OMPRA</i><br><i>POR ESO</i></div>
<div class="pie">Las condiciones de traspaso y los tiempos los explica un asesor
  según tu contrato.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-27-papeles",
    "ags",
    """
<div class="eyebrow">¿Qué papeles necesito?</div>
<div class="grande" style="font-size:84px">P<i>ARA</i><br>A<i>RRANCAR,</i><br>C<i>ASI NADA</i></div>
<div class="chips"><span>Sin buró</span><span>Sin aval</span>
  <span>Sin comprobante de ingresos</span></div>
<div class="pie">Los documentos de firma los revisa el asesor contigo llegado el
  momento. Nunca por chat.</div>
<div class="cta">Comenta INFO</div>""",
)

post(
    "post-28-horario",
    "queretaro",
    """
<div class="eyebrow">Horario de atención</div>
<div class="grande" style="font-size:62px">L<i>UNES</i> <i>A</i>&nbsp; D<i>OMINGO</i><br><span class="num">8</span> <i>A</i>&nbsp;<span class="num">6</span></div>
<div class="pie">Y si escribes fuera de ese horario, igual te contesto y tomo
  tus datos: te respondo en cuanto abro.</div>
<div class="cta">Comenta INFO</div>""",
)

# Plusvalía. El terreno legalmente delicado: van EXACTAMENTE las formulaciones
# aprobadas de la KB (07) y ninguna otra. Nada de "garantizar", ningún
# porcentaje, ninguna afirmación sobre cómo se comportó el mercado antes.
post(
    "post-29-plusvalia",
    "slp",
    """
<div class="eyebrow">Hablemos de plusvalía</div>
<div class="grande" style="font-size:78px">Z<i>ONAS DE</i><br>A<i>LTO</i><br>C<i>RECIMIENTO</i></div>
<div class="pie">Fuerte potencial de plusvalía, en comunidades planificadas con
  más de 40 años de trayectoria. No te voy a aventar un porcentaje que no te
  pueda sostener — lo que sí, te enseño cómo se ha movido la zona que te
  interesa.</div>
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


# ── Reel B · ¿en qué ciudad? ────────────────────────────────────────────────
# El mismo molde de cuatro tiempos, con otra idea: aquí el gancho es la
# pregunta que se hace todo el mundo antes que el precio.
placa("reelb-1", """
<div class="eyebrow">Terrenos premium</div>
<div class="grande" style="font-size:100px">¿E<i>N QUÉ</i><br>C<i>IUDAD</i><br><i class="gap">LO</i>Q<i>UIERES</i>?</div>""")

placa("reelb-2", """
<div class="eyebrow">Dónde puedes invertir</div>
<div class="grande" style="font-size:104px">8 <i>ESTADOS</i><br>D<i>E</i>&nbsp; M<i>ÉXICO</i></div>
<div class="chips"><span>Querétaro</span><span>León</span><span>Mérida</span>
  <span>Cancún</span></div>""")

placa("reelb-3", """
<div class="eyebrow">Mensualidades desde</div>
<div class="cifra">$1,244</div>
<div class="chips"><span>Monterrey</span><span>Aguascalientes</span>
  <span>San Luis Potosí</span><span>Puebla</span></div>""")

placa("reelb-4", """
<div class="grande" style="font-size:96px">D<i>IME TU</i><br>C<i>IUDAD</i></div>
<div class="pie">Y te paso los desarrollos disponibles<br>con su mensualidad.</div>
<div class="cta">Comenta INFO</div>""")


# ── Reel C · los cuatro pasos ───────────────────────────────────────────────
# Va dirigido a quien nunca ha comprado un terreno: esa duda —"¿y luego qué
# sigue?"— frena más que el precio. Los pasos son los de la KB (06), sin
# prometer tiempos de escrituración.
placa("reelc-1", """
<div class="eyebrow">Así se compra</div>
<div class="grande" style="font-size:94px">¿N<i>UNCA HAS</i><br>C<i>OMPRADO</i><br><i class="gap">UN</i>T<i>ERRENO</i>?</div>
<div class="pie">Son cuatro pasos.</div>""")

placa("reelc-2", """
<div class="eyebrow">Pasos 1 y 2</div>
<div class="grande" style="font-size:88px">P<i>LATICAMOS</i><br><i>Y</i>&nbsp; C<i>OTIZAMOS</i></div>
<div class="pie">Qué ciudad, qué superficie y para qué lo quieres.
  Luego, los lotes disponibles hoy con su enganche y su mensualidad.</div>""")

placa("reelc-3", """
<div class="eyebrow">Pasos 3 y 4</div>
<div class="grande" style="font-size:88px">A<i>PARTAS</i><br><i>Y</i>&nbsp; P<i>AGAS</i></div>
<div class="pie">El lote queda a tu nombre y se firma el contrato. Las
  mensualidades van directo con la desarrolladora hasta liquidar y escriturar.</div>""")

placa("reelc-4", """
<div class="grande" style="font-size:96px">S<i>IN BURÓ.</i><br>S<i>IN AVAL.</i></div>
<div class="pie">Y sin comprobante de ingresos.<br>Empezamos por el paso 1.</div>
<div class="cta">Comenta INFO</div>""")


# ── Reel D · por qué un terreno ─────────────────────────────────────────────
# La placa 3 lleva a propósito la frase honesta de la KB. Va en medio y no al
# final: decir a quién NO le sirve es lo que hace creíble lo demás, pero el
# reel tiene que cerrar invitando, no cerrando la puerta.
placa("reeld-1", """
<div class="eyebrow">Patrimonio</div>
<div class="grande" style="font-size:100px">¿P<i>OR QUÉ</i><br><i class="gap">UN</i>T<i>ERRENO</i>?</div>""")

placa("reeld-2", """
<div class="eyebrow">Contra algo ya construido</div>
<div class="grande" style="font-size:86px">M<i>ENOS ENTRADA.</i><br>M<i>ENOS</i><br>M<i>ENSUALIDAD.</i></div>
<div class="pie">Y construyes a tu gusto y a tu ritmo.</div>""")

placa("reeld-3", """
<div class="eyebrow">Te lo digo de una vez</div>
<div class="grande" style="font-size:82px">S<i>I TE URGE</i><br>M<i>UDARTE,</i><br><i>NO ES LO TUYO.</i></div>
<div class="pie">Prefiero decírtelo ahora que hacerte perder el tiempo.</div>""")

placa("reeld-4", """
<div class="eyebrow">Desde $1,244 al mes</div>
<div class="grande" style="font-size:92px">E<i>L PATRIMONIO</i><br><i class="gap">YA ES</i>T<i>UYO</i></div>
<div class="pie">Terrenos premium en 8 estados de México.</div>
<div class="cta">Comenta INFO</div>""")


# ── Reel E · las amenidades ─────────────────────────────────────────────────
# La KB lista las amenidades y los cuatro clubes, pero NO dice cuál amenidad
# pertenece a cuál club: aquí se nombran por separado, sin repartirlas, y se
# cierra con la advertencia de que varían por desarrollo y etapa.
placa("reele-1", """
<div class="eyebrow">Terrenos premium</div>
<div class="grande" style="font-size:104px">M<i>ÁS DE</i> <span class="num">30</span><br>A<i>MENIDADES</i></div>""")

placa("reele-2", """
<div class="eyebrow">Se organizan en</div>
<div class="grande" style="font-size:112px">C<i>UATRO</i><br>C<i>LUBES</i></div>
<div class="chips"><span>Casa Club</span><span>Family Club</span>
  <span>Club Deportivo</span><span>Club Acuático</span></div>""")

placa("reele-3", """
<div class="eyebrow">Entre otras</div>
<div class="chips"><span>Albercas semiolímpicas</span><span>Albercas techadas</span>
  <span>Pádel</span><span>Tenis</span><span>Gimnasio</span>
  <span>Chapoteaderos</span><span>Áreas infantiles</span></div>""")

placa("reele-4", """
<div class="grande" style="font-size:88px">¿C<i>UÁLES</i><br><i class="gap">TIENE</i>E<i>L</i><br><i class="gap">QUE TE</i>G<i>USTA</i>?</div>
<div class="pie">El catálogo varía por desarrollo y etapa.<br>Te digo cuáles ya
  están y cuáles vienen.</div>
<div class="cta">Comenta INFO</div>""")


# ── Reel F · cuánto cuesta ──────────────────────────────────────────────────
# Contesta de frente la primera pregunta de todos, con las dos cifras juntas:
# el terreno completo y la mensualidad. Ambas "desde", como manda la KB.
placa("reelf-1", """
<div class="eyebrow">Sin rodeos</div>
<div class="grande" style="font-size:100px">¿C<i>UÁNTO</i><br>C<i>UESTA</i><br><i class="gap">UN</i>T<i>ERRENO</i>?</div>""")

placa("reelf-2", """
<div class="eyebrow">El terreno completo · Desde</div>
<div class="cifra" style="font-size:138px">$550,000</div>""")

placa("reelf-3", """
<div class="eyebrow">O al mes · Desde</div>
<div class="cifra">$1,244</div>
<div class="pie">Con enganche desde 1%, sin aval y sin buró.</div>""")

placa("reelf-4", """
<div class="grande" style="font-size:96px">T<i>E COTIZO</i><br><i class="gap">EL</i>T<i>UYO</i></div>
<div class="pie">Sin costo y sin compromiso. El precio final depende de la
  ciudad, los metros y la ubicación.</div>
<div class="cta">Comenta INFO</div>""")

print("listo: 29 posts y 24 placas de reel")
