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

# (foto, placa, hacia dónde va el zoom). Alternar acercar/alejar evita que las
# cuatro escenas se sientan iguales.
ESCENAS = [
    ("clubes", "reel-1", "in"),
    ("caribe", "reel-2", "out"),
    ("monterrey", "reel-3", "in"),
    ("queretaro", "reel-4", "out"),
]

# El velo NO se pinta aquí: viaja dentro de la placa de texto, como degradado
# de CSS. Los filtros de ffmpeg (drawbox) pintan rectángulos de borde duro y
# dejaban una raya horizontal a media pantalla que parecía un error de render.

partes = []
for i, (foto, placa, zoom) in enumerate(ESCENAS):
    frames = int(DUR * FPS)
    # zoompan trabaja sobre la imagen ya escalada al doble, para que el
    # acercamiento no pixele.
    if zoom == "in":
        z = f"min(1.14,zoom+0.00042)"
    else:
        z = f"if(eq(on,0),1.14,max(1.0,zoom-0.00042))"

    salida = f"{TMP}/esc{i}.mp4"
    filtro = (
        f"[0:v]scale={W*2}:{H*2}:force_original_aspect_ratio=increase,"
        f"crop={W*2}:{H*2},"
        f"zoompan=z='{z}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"s={W}x{H}:fps={FPS}[bg];"
        f"[bg][1:v]overlay=0:0:format=auto[v]"
    )
    subprocess.run(
        [FFMPEG, "-y", "-loop", "1", "-i", f"{DIR}/insumos/{foto}.webp",
         "-i", f"{SAL}/{placa}.png",
         "-filter_complex", filtro, "-map", "[v]",
         "-t", str(DUR), "-r", str(FPS),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
         salida],
        check=True, capture_output=True,
    )
    partes.append(salida)
    print(f"escena {i+1}/4 · {foto} + {placa}")

# Encadenar con fundidos. xfade acorta el total: cada cruce se come `FUNDIDO`.
entradas = []
for p in partes:
    entradas += ["-i", p]

cadena, prev, desfase = [], "0:v", 0.0
for i in range(1, len(partes)):
    desfase += DUR - FUNDIDO
    etiqueta = f"x{i}"
    cadena.append(
        f"[{prev}][{i}:v]xfade=transition=fade:duration={FUNDIDO}:offset={desfase:.2f}[{etiqueta}]"
    )
    prev = etiqueta

final = f"{SAL}/reel-terrenos.mp4"
subprocess.run(
    [FFMPEG, "-y", *entradas, "-filter_complex", ";".join(cadena), "-map", f"[{prev}]",
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
     "-movflags", "+faststart", final],
    check=True, capture_output=True,
)

dur = len(ESCENAS) * DUR - (len(ESCENAS) - 1) * FUNDIDO
print(f"\nlisto: {final}  ({W}x{H}, {dur:.1f}s, sin audio)")
print("El audio se le pone AL SUBIRLO, desde la biblioteca de Instagram.")
