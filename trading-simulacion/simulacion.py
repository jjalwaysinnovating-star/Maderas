"""
Ayudante para la simulación con Freqtrade. Cada paso es un comando:

    probar       prueba qué exchange responde desde tu conexión y lo deja configurado
    descargar    baja 2 años de velas de 1 hora (datos públicos, sin claves)
    diseno       backtest de los primeros 18 meses (periodo de diseño)
    validacion   backtest de los últimos 6 meses (UNA sola vez, sin reajustar)
    arrancar     deja el bot corriendo en simulación con precios en vivo

Se corre con el Python del entorno virtual; el README dice cómo en cada sistema.
Nunca activa el modo real: si config.json dijera dry_run=false, se niega a correr.
"""

import hashlib
import json
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
CONFIG = CARPETA / "config.json"
CONFIG_PRIVADO = CARPETA / "config-privado.json"
USER_DATA = CARPETA / "user_data"
RESULTADOS = CARPETA / "resultados"
ESTRATEGIA = USER_DATA / "strategies" / "CruceMedias.py"
CANDADO_VALIDACION = RESULTADOS / "validacion.candado"

# Fechas fijas para que cualquiera que lo corra obtenga el mismo experimento.
# La descarga empieza un mes antes para "calentar" los promedios móviles.
DESCARGA = "20240801-20260901"
DISENO = "20240901-20260301"      # 18 meses: aquí se diseña
VALIDACION = "20260301-20260901"  # 6 meses: aquí solo se comprueba

# Exchanges con soporte oficial de Freqtrade y que dan historial de velas completo.
# (Kraken también es oficial, pero para backtest exige bajar cada operación: horas.)
EXCHANGES = ["binance", "okx", "bybit", "gate"]


def leer_config() -> dict:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    if config.get("dry_run") is not True:
        sys.exit("ALTO: config.json tiene dry_run distinto de true. Este proyecto es solo simulación.")
    if config.get("trading_mode", "spot") != "spot":
        sys.exit("ALTO: config.json no está en modo spot. Este proyecto no usa futuros.")
    if config["exchange"].get("key") or config["exchange"].get("secret"):
        sys.exit("ALTO: config.json trae claves API. Este proyecto no las usa; bórralas.")
    return config


def freqtrade(*args: str) -> None:
    orden = [sys.executable, "-m", "freqtrade", *args]
    print("\n>>", " ".join(orden[2:]), "\n")
    resultado = subprocess.run(orden, cwd=CARPETA)
    if resultado.returncode != 0:
        sys.exit(f"Freqtrade terminó con error (código {resultado.returncode}). Lee el mensaje de arriba.")


def base(*extra: str) -> list[str]:
    return ["-c", str(CONFIG), "--userdir", str(USER_DATA), *extra]


# ---------------------------------------------------------------- probar
def probar() -> None:
    import ccxt

    config = leer_config()
    for nombre in EXCHANGES:
        print(f"Probando {nombre}… ", end="", flush=True)
        try:
            exchange = getattr(ccxt, nombre)({"timeout": 15000})
            velas = exchange.fetch_ohlcv("BTC/USDT", "1h", limit=3)
            if not velas:
                raise RuntimeError("no devolvió velas")
        except Exception as error:  # cualquier fallo = probar el siguiente
            print(f"no responde ({type(error).__name__})")
            continue
        print(f"responde. Último precio BTC/USDT: {velas[-1][4]:,.2f}")
        config["exchange"]["name"] = nombre
        CONFIG.write_text(json.dumps(config, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nListo: config.json quedó usando {nombre}.")
        return
    sys.exit("Ningún exchange respondió. Revisa tu conexión a internet o si tu país los bloquea.")


# ---------------------------------------------------------------- descargar
def descargar() -> None:
    config = leer_config()
    freqtrade("download-data", *base("--timerange", DESCARGA, "-t", config["timeframe"]))
    carpeta = USER_DATA / "data" / config["exchange"]["name"]
    for par in config["exchange"]["pair_whitelist"]:
        archivo = carpeta / f"{par.replace('/', '_')}-{config['timeframe']}.feather"
        if not archivo.exists():
            sys.exit(f"No se bajaron los datos de {par}. Corre primero el paso 'probar'.")
    print(f"\nListo: datos guardados en {carpeta.relative_to(CARPETA)}")


# ---------------------------------------------------------------- backtests
def backtest(periodo: str, rango: str) -> dict:
    leer_config()
    carpeta = RESULTADOS / periodo
    # Se borra el resultado anterior: Freqtrade a veces falla sin avisar con su
    # código de salida, y así nunca se resume por error un backtest viejo.
    shutil.rmtree(carpeta, ignore_errors=True)
    carpeta.mkdir(parents=True)
    freqtrade("backtesting", *base("--timerange", rango, "--backtest-directory", str(carpeta),
                                   "--breakdown", "month"))
    if not any(carpeta.glob("*.meta.json")):
        sys.exit("El backtest no produjo resultados. Lee el error de Freqtrade más arriba.")
    return resumen(periodo, rango, carpeta)


def diseno() -> None:
    backtest("diseno", DISENO)


def validacion() -> None:
    huella = hashlib.sha256(ESTRATEGIA.read_bytes()).hexdigest()
    if CANDADO_VALIDACION.exists() and CANDADO_VALIDACION.read_text().strip() != huella:
        sys.exit(
            "ALTO: la validación ya se corrió con otra versión de la estrategia.\n"
            "Si la cambias después de ver los últimos 6 meses, esos meses dejan de ser una\n"
            "prueba limpia: estarías ajustando la estrategia a ellos. El resultado honesto es\n"
            "el que ya salió (resultados/resumen-validacion.md)."
        )
    RESULTADOS.mkdir(exist_ok=True)
    CANDADO_VALIDACION.write_text(huella + "\n")
    backtest("validacion", VALIDACION)


# ---------------------------------------------------------------- resumen honesto
def comprar_y_mantener(config: dict, rango: str) -> tuple[float, float]:
    """Reparte el saldo en partes iguales entre los pares al inicio y vende al final.
    Cobra la misma comisión al comprar y al vender. Devuelve (ganancia USDT, peor caída %)."""
    import pandas as pd
    from freqtrade.configuration import TimeRange
    from freqtrade.data.history import load_pair_history

    saldo = config["dry_run_wallet"]
    comision = config["fee"]
    pares = config["exchange"]["pair_whitelist"]
    tr = TimeRange.parse_timerange(rango)
    valores = []
    for par in pares:
        velas = load_pair_history(pair=par, timeframe=config["timeframe"],
                                  datadir=USER_DATA / "data" / config["exchange"]["name"],
                                  timerange=tr)
        velas = velas[(velas["date"] >= tr.startdt) & (velas["date"] < tr.stopdt)]
        monedas = (saldo / len(pares)) * (1 - comision) / velas["open"].iloc[0]
        valores.append(velas.set_index("date")["close"] * monedas)
    cartera = pd.concat(valores, axis=1).ffill().dropna().sum(axis=1)
    final = cartera.iloc[-1] * (1 - comision)
    caida = ((cartera / cartera.cummax()) - 1).min() * -100
    return final - saldo, caida


def resumen(periodo: str, rango: str, carpeta: Path) -> dict:
    from freqtrade.data.btanalysis import get_latest_backtest_filename, load_backtest_stats

    config = leer_config()
    stats = load_backtest_stats(carpeta / get_latest_backtest_filename(carpeta))
    s = stats["strategy"][config["strategy"]]
    saldo = config["dry_run_wallet"]
    total = s["total_trades"]
    aciertos = (s["wins"] / total * 100) if total else 0.0
    bh_usdt, bh_caida = comprar_y_mantener(config, rango)
    inicio, fin = rango.split("-")

    texto = f"""# Resumen del backtest — periodo de {periodo}

Periodo: {inicio[:4]}-{inicio[4:6]}-{inicio[6:]} a {fin[:4]}-{fin[4:6]}-{fin[6:]} · velas de {config['timeframe']} · exchange {config['exchange']['name']}
Pares: {', '.join(config['exchange']['pair_whitelist'])} · saldo simulado inicial: {saldo:,.0f} USDT
Comisión: {config['fee']*100:.2f}% al comprar y otra vez al vender (no incluye deslizamiento de precio).

| | Estrategia CruceMedias | Comprar y mantener |
|---|---|---|
| Operaciones | {total} | 3 compras al inicio |
| % de aciertos | {aciertos:.1f}% ({s['wins']} ganadoras, {s['losses']} perdedoras, {s['draws']} en cero) | — |
| Ganancia/pérdida neta | {s['profit_total_abs']:+,.2f} USDT ({s['profit_total']*100:+.2f}%) | {bh_usdt:+,.2f} USDT ({bh_usdt/saldo*100:+.2f}%) |
| Peor caída (drawdown) | {s['max_drawdown_account']*100:.2f}% ({s['max_drawdown_abs']:,.2f} USDT) | {bh_caida:.2f}% |

Esto es una simulación sobre datos pasados. No predice ni garantiza resultados
futuros: con otro periodo, otros pares o comisiones distintas el resultado cambia,
y el mercado real además tiene deslizamiento y fallas que el backtest no ve.
"""
    archivo = RESULTADOS / f"resumen-{periodo}.md"
    archivo.write_text(texto, encoding="utf-8")
    print("\n" + texto + f"\n(Guardado en {archivo.relative_to(CARPETA)})")
    return s


# ---------------------------------------------------------------- en vivo
def arrancar() -> None:
    leer_config()
    if not CONFIG_PRIVADO.exists():
        # Usuario y contraseña de la interfaz web LOCAL (no son claves de exchange).
        clave = secrets.token_urlsafe(12)
        CONFIG_PRIVADO.write_text(json.dumps({
            "api_server": {
                "enabled": True,
                "listen_ip_address": "127.0.0.1",
                "listen_port": 8080,
                "verbosity": "error",
                "enable_openapi": False,
                "jwt_secret_key": secrets.token_hex(32),
                "ws_token": secrets.token_urlsafe(24),
                "CORS_origins": [],
                "username": "simulador",
                "password": clave,
            }
        }, indent=4) + "\n", encoding="utf-8")
        print(f"Creé config-privado.json. Interfaz web: usuario 'simulador', contraseña '{clave}'")
    import freqtrade as ft

    interfaz = Path(ft.__file__).parent / "rpc" / "api_server" / "ui" / "installed"
    if not (interfaz / "index.html").exists():
        # Baja la interfaz web (FreqUI) de GitHub, una sola vez. Si falla, el bot
        # corre igual: la simulación no depende de la interfaz.
        subprocess.run([sys.executable, "-m", "freqtrade", "install-ui"], cwd=CARPETA)
        if not (interfaz / "index.html").exists():
            print("\nAVISO: no se pudo bajar la interfaz web. El bot corre igual; mira lo que hace")
            print("en esta ventana o en user_data/logs/freqtrade.log, y vuelve a intentarlo después.\n")
    privado = json.loads(CONFIG_PRIVADO.read_text(encoding="utf-8"))["api_server"]
    print("\nAbre http://127.0.0.1:8080 en tu navegador.")
    print(f"Usuario: {privado['username']}   Contraseña: {privado['password']}")
    print("Para detenerlo: Ctrl+C en esta ventana.\n")
    freqtrade("trade", *base("-c", str(CONFIG_PRIVADO),
                             "--logfile", str(USER_DATA / "logs" / "freqtrade.log")))


PASOS = {"probar": probar, "descargar": descargar, "diseno": diseno,
         "validacion": validacion, "arrancar": arrancar}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in PASOS:
        print(__doc__)
        sys.exit(1)
    PASOS[sys.argv[1]]()
