# Simulación de un bot de trading de cripto (Freqtrade)

Este proyecto sirve para **ver cómo se comportaría** un bot de trading. **No usa
dinero real y no puede usarlo:**

- Siempre está en **modo simulación** (`dry_run: true`). El ayudante
  `simulacion.py` se niega a correr si alguien cambia eso.
- **No usa claves API** de ningún exchange. Los precios son datos públicos.
- **Solo mercado spot:** compra y vende la moneda. Nada de futuros, cortos ni
  apalancamiento.
- Saldo simulado de **1,000 USDT** · pares **BTC/USDT, ETH/USDT, SOL/USDT** ·
  velas de **1 hora** · máximo **3 operaciones** abiertas a la vez.

Nada de lo que salga aquí es una garantía ni una recomendación de inversión.

---

## Qué hace la estrategia (en palabras normales)

La estrategia se llama `CruceMedias` y está en
`user_data/strategies/CruceMedias.py`. Compara dos promedios del precio:

- **Promedio rápido:** el precio promedio de las últimas **20 horas**.
- **Promedio lento:** el precio promedio de las últimas **50 horas**.

**Compra** cuando el promedio rápido pasa por **encima** del lento, o sea cuando el
precio empieza a subir más rápido de lo normal. **Excepción:** si el RSI está en 70
o más, no compra. El RSI es un medidor de 0 a 100 de qué tan rápido subió el
precio, y arriba de 70 suele ser tarde para entrar.

**Vende** en cualquiera de estos dos casos, lo que pase primero:

1. El promedio rápido cae por **debajo** del lento: la subida se acabó.
2. **Stop-loss:** la operación ya pierde **5%**. Se vende para que la pérdida no
   crezca.

Cada operación usa aproximadamente un tercio del saldo, porque puede haber hasta 3
abiertas (una por par).

**Esos números (20, 50, 70 y 5%) se fijaron antes de ver ningún dato y no se
ajustan para que el resultado se vea mejor.** Si se ajustan hasta que el pasado se
vea bonito, lo que se obtiene es una estrategia que "se aprendió" el pasado, no
una que funcione.

---

## 1. Instalar (una sola vez)

Necesitas **Python 3.11 o más nuevo**. En Windows y Mac se baja de
<https://www.python.org/downloads/>. En Windows, durante la instalación marca la
casilla **"Add Python to PATH"**.

Abre una terminal **dentro de esta carpeta** (`trading-simulacion`):

- **Windows:** abre la carpeta en el Explorador, escribe `cmd` en la barra de
  direcciones y presiona Enter.
- **Mac:** clic derecho en la carpeta → *Servicios* → *Nueva terminal en la carpeta*.
- **Linux:** clic derecho → *Abrir en terminal*.

Copia y pega, según tu sistema:

**Windows**
```
py -m venv .venv
.venv\Scripts\python -m pip install freqtrade==2026.8
```

**Mac o Linux**
```
python3 -m venv .venv
.venv/bin/python -m pip install freqtrade==2026.8
```

Esto crea la carpeta `.venv` con Freqtrade adentro. No toca nada más de tu
computadora; para desinstalarlo basta con borrar esa carpeta.

> En el resto de este README, `PY` quiere decir:
> **Windows:** `.venv\Scripts\python`  ·  **Mac/Linux:** `.venv/bin/python`

---

## 2. Probar qué exchange responde desde tu conexión

```
PY simulacion.py probar
```

Prueba en orden **Binance, OKX, Bybit y Gate.io**, que Freqtrade soporta
oficialmente. Se queda con el primero que conteste y lo guarda en `config.json`.
Solo lee precios públicos: no pide cuenta ni claves.

## 3. Descargar los datos (unos minutos)

```
PY simulacion.py descargar
```

Baja las velas de 1 hora del **1 de agosto de 2024 al 1 de septiembre de 2026**. El
primer mes solo sirve para que los promedios ya estén calculados cuando empieza la
prueba. Las fechas son fijas para que el experimento siempre sea el mismo.

## 4. Backtest del periodo de diseño (primeros 18 meses)

```
PY simulacion.py diseno
```

Prueba la estrategia del **1 sep 2024 al 1 mar 2026**. En este periodo sí se vale
mirar y, si hace falta, corregir algo **de fondo** (por ejemplo, un error). Nunca
para "mejorar el número".

## 5. Validación (últimos 6 meses) — una sola vez

```
PY simulacion.py validacion
```

Prueba la misma estrategia, sin cambios, del **1 mar al 1 sep 2026**. Esos meses
no se usaron para diseñarla, así que son el examen honesto.

El ayudante guarda una "huella" de la estrategia. Si la cambias y vuelves a correr
la validación, **se niega**: ajustar la estrategia a los meses de validación los
convierte en meses de diseño y la prueba deja de valer.

---

## Cómo leer los resultados del backtest

Cada backtest imprime tablas de Freqtrade y al final un resumen en español. El
resumen se guarda en `resultados/resumen-diseno.md` y
`resultados/resumen-validacion.md`:

| Renglón | Qué significa |
|---|---|
| **Operaciones** | Cuántas veces compró y vendió. |
| **% de aciertos** | De esas operaciones, cuántas terminaron con ganancia. Un % bajo no es malo por sí solo si las ganadoras ganan mucho más de lo que pierden las perdedoras. |
| **Ganancia/pérdida neta** | Cuánto habría quedado arriba o abajo de los 1,000 USDT, **ya descontada la comisión de 0.1%** al comprar y otra vez al vender (la tarifa normal de Binance spot). |
| **Peor caída (drawdown)** | La bajada más grande desde un máximo. Si dice 20%, en algún momento el saldo llegó a estar 20% abajo de su mejor punto. Es la parte que más duele en la vida real. |
| **Comprar y mantener** | Qué habría pasado si el primer día se reparten los 1,000 USDT en partes iguales entre los 3 pares y no se toca nada hasta el final, con la misma comisión. **Si el bot no le gana a esto, no vale la pena.** |

Lo que el backtest **no** ve: el deslizamiento (en el mercado real a veces compras
un poco más caro de lo que marcaba la vela), caídas del exchange o de tu internet,
y que el futuro no se parece necesariamente al pasado.

---

## 6. Dejarlo corriendo en simulación con precios en vivo

```
PY simulacion.py arrancar
```

La primera vez hace dos cosas:

1. Crea `config-privado.json` con un **usuario y contraseña al azar** para la
   interfaz web y te los enseña en pantalla. Solo sirven dentro de tu
   computadora, no son claves de ningún exchange. Ese archivo no se sube a GitHub.
2. Baja la interfaz web (FreqUI).

Luego el bot empieza a vigilar los precios reales. Cuando la estrategia lo diga,
"compra" y "vende" con el saldo simulado de 1,000 USDT. **No manda ninguna orden
real.** Al arrancar verás el aviso `Dry run is enabled. All trades are simulated.`

Con velas de 1 hora, el bot decide **una vez por hora**. Es normal que pasen horas,
o días, sin operaciones.

### Ver los resultados: interfaz web (recomendada)

Con el bot corriendo, abre **<http://127.0.0.1:8080>** en tu navegador y entra con
el usuario y la contraseña que te enseñó. Ahí están:

- **Trade:** las operaciones abiertas en este momento y la gráfica de cada par.
- **Dashboard:** la ganancia o pérdida acumulada de la simulación.
- **Logs:** lo que el bot va haciendo.

Solo se ve **desde tu propia computadora** (`127.0.0.1`), no desde internet.

Si olvidaste la contraseña, está en `config-privado.json`, en `"password"`.

### ¿Y Telegram?

Está **apagado**. Para recibir avisos en Telegram hay que crear un bot con
@BotFather y poner su *token* en la configuración. Ese token es una clave, y este
proyecto se armó sin claves. La interfaz web muestra lo mismo sin necesitar
ninguna. Si algún día lo quieres, se agrega en `config-privado.json` (nunca en
`config.json`, que sí se sube a GitHub).

### Detenerlo

En la ventana donde corre, presiona **Ctrl + C** y espera unos segundos a que diga
que terminó. Para volver a arrancarlo, repite `PY simulacion.py arrancar`.

### ¿Qué pasa si apago la computadora?

- **El bot se detiene.** Solo trabaja mientras la computadora está prendida y esa
  ventana abierta. Si la computadora se suspende, el bot también se pausa.
- **No se pierde nada.** Las operaciones simuladas y el saldo se guardan en
  `tradesv3.dryrun.sqlite`, en esta carpeta. Al volver a arrancar, sigue donde se
  quedó, incluidas las operaciones abiertas.
- **Mientras estuvo apagado no vigiló nada.** Si en ese tiempo el precio cayó por
  debajo del stop-loss, al prenderlo vende al precio de ese momento, que puede
  ser peor que el -5%. Eso también pasaría con dinero real.
- Si quieres empezar la simulación **desde cero**, detén el bot y borra
  `tradesv3.dryrun.sqlite`.

---

## Qué hay en esta carpeta

| Archivo | Para qué |
|---|---|
| `config.json` | Configuración: simulación, saldo, pares, velas, comisión. Sin claves. |
| `user_data/strategies/CruceMedias.py` | La estrategia. |
| `simulacion.py` | El ayudante con los pasos `probar`, `descargar`, `diseno`, `validacion` y `arrancar`. |
| `resultados/` | Los resúmenes de cada backtest (se crea al correrlos). |
| `config-privado.json` | Usuario y contraseña de la interfaz web (se crea al arrancar; no va a GitHub). |
| `tradesv3.dryrun.sqlite` | El historial de la simulación en vivo (se crea al arrancar). |
