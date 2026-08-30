# Arma el reel (1080x1920, 9:16) con ffmpeg.
#
# Cada escena es una FOTO REAL de un desarrollo con un zoom lento encima, y la
# placa de texto —que Chromium ya rindió con fondo transparente— va encimada
# sin moverse. Se separan a propósito: si el texto viajara dentro del zoom se
# vería deformado y tembloroso, que es lo que delata a un reel hecho a la
# carrera.
#
# Las transiciones son fundidos cortos, no cortes secos: cuatro cortes secos en
# doce segundos se sienten bruscos en un feed.
#
#     python3 contenido.py && node captura.js && python3 reel.py
import os, subprocess
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
DIR = os.path.dirname(os.path.abspath(__file__))
SAL = f"{DIR}/salida"
TMP = f"{SAL}/_tmp"
os.makedirs(TMP, exist_ok=True)

W, H, FPS = 1080, 1920, 30
DUR = 3.4          # segundos por escena
FUNDIDO = 0.45     # duración del cruce entre escenas

def foto(n):
    """La ruta de la foto, sea webp o jpg — el bucket mezcla las dos."""
    for ext in ("webp", "jpg"):
        ruta = f"{DIR}/insumos/{n}.{ext}"
        if os.path.exists(ruta):
            return ruta
    raise FileNotFoundError(f"no hay foto '{n}' en insumos/")


# Cada reel son cuatro escenas: (foto, placa, hacia dónde va el zoom).
# Alternar acercar/alejar evita que las cuatro se sientan iguales, y ninguna
# foto se repite dentro del mismo reel.
REELS = {
    # A · el gancho del financiamiento
    "reel-terrenos": [
        ("clubes", "reel-1", "in"),
        ("caribe", "reel-2", "out"),
        ("monterrey", "reel-3", "in"),
        ("queretaro", "reel-4", "out"),
    ],
    # B · ¿en qué ciudad?
    "reel-ciudades": [
        ("queretaro", "reelb-1", "in"),
        ("merida", "reelb-2", "out"),
        ("gto", "reelb-3", "in"),
        ("caribe", "reelb-4", "out"),
    ],
    # C · los cuatro pasos
    "reel-pasos": [
        ("slp", "reelc-1", "in"),
        ("queretaro", "reelc-2", "out"),
        ("alberca", "reelc-3", "in"),
        ("clubes", "reelc-4", "out"),
    ],
    # E · las amenidades
    "reel-amenidades": [
        ("alberca", "reele-1", "in"),
        ("alberca-techada", "reele-2", "out"),
        ("tenis", "reele-3", "in"),
        ("chapoteadero", "reele-4", "out"),
    ],
    # F · cuánto cuesta
    "reel-cuanto": [
        ("mapa", "reelf-1", "in"),
        ("clubes", "reelf-2", "out"),
        ("gto", "reelf-3", "in"),
        ("caribe", "reelf-4", "out"),
    ],
    # G · la desarrolladora
    "reel-trayectoria": [
        ("clubes", "reelg-1", "in"),
        ("mapa", "reelg-2", "out"),
        ("caribe", "reelg-3", "in"),
        ("queretaro", "reelg-4", "out"),
    ],
    # H · urbanización
    "reel-servicios": [
        ("mapa", "reelh-1", "in"),
        ("ags", "reelh-2", "out"),
        ("gto", "reelh-3", "in"),
        ("slp", "reelh-4", "out"),
    ],
    # D · por qué un terreno
    "reel-porque": [
        ("merida", "reeld-1", "in"),
        ("alberca-techada", "reeld-2", "out"),
        ("padel", "reeld-3", "in"),
        ("monterrey", "reeld-4", "out"),
    ],
}

# El velo NO se pinta aquí: viaja dentro de la placa de texto, como degradado
# de CSS. Los filtros de ffmpeg (drawbox) pintan rectángulos de borde duro y
# dejaban una raya horizontal a media pantalla que parecía un error de render.

def arma(nombre, escenas):
    partes = []
    for i, (imagen, placa, zoom) in enumerate(escenas):
        frames = int(DUR * FPS)
        # zoompan trabaja sobre la imagen ya escalada al doble, para que el
        # acercamiento no pixele.
        if zoom == "in":
            z = "min(1.14,zoom+0.00042)"
        else:
            z = "if(eq(on,0),1.14,max(1.0,zoom-0.00042))"

        salida = f"{TMP}/{nombre}-esc{i}.mp4"
        filtro = (
            f"[0:v]scale={W*2}:{H*2}:force_original_aspect_ratio=increase,"
            f"crop={W*2}:{H*2},"
            f"zoompan=z='{z}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={W}x{H}:fps={FPS}[bg];"
            f"[bg][1:v]overlay=0:0:format=auto[v]"
        )
        subprocess.run(
            [FFMPEG, "-y", "-loop", "1", "-i", foto(imagen),
             "-i", f"{SAL}/{placa}.png",
             "-filter_complex", filtro, "-map", "[v]",
             "-t", str(DUR), "-r", str(FPS),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
             salida],
            check=True, capture_output=True,
        )
        partes.append(salida)

    # Encadenar con fundidos. xfade acorta el total: cada cruce se come
    # `FUNDIDO`.
    entradas = []
    for p in partes:
        entradas += ["-i", p]

    cadena, prev, desfase = [], "0:v", 0.0
    for i in range(1, len(partes)):
        desfase += DUR - FUNDIDO
        etiqueta = f"x{i}"
        cadena.append(
            f"[{prev}][{i}:v]xfade=transition=fade:duration={FUNDIDO}:"
            f"offset={desfase:.2f}[{etiqueta}]"
        )
        prev = etiqueta

    final = f"{SAL}/{nombre}.mp4"
    subprocess.run(
        [FFMPEG, "-y", *entradas, "-filter_complex", ";".join(cadena),
         "-map", f"[{prev}]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
         "-movflags", "+faststart", final],
        check=True, capture_output=True,
    )
    dur = len(escenas) * DUR - (len(escenas) - 1) * FUNDIDO
    tam = os.path.getsize(final) / 1e6
    print(f"{nombre}.mp4  ·  {W}x{H}  ·  {dur:.1f}s  ·  {tam:.1f} MB  ·  sin audio")


for nombre, escenas in REELS.items():
    arma(nombre, escenas)

print("\nEl audio se le pone AL SUBIRLO, desde la biblioteca de Instagram.")
