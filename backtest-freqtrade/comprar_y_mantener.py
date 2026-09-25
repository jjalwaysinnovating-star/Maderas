"""
Referencia "comprar y mantener" para comparar contra la estrategia.

Con los MISMOS datos descargados que usa el backtest: al inicio de cada
periodo se reparten 1,000 USDT mitad en BTC y mitad en ETH, se pagan 0.1 %
de comisión al comprar y 0.1 % al vender al final, y no se hace nada más.

También revisa los datos: cuántas velas hay y si falta alguna hora.

Uso:  python comprar_y_mantener.py <exchange>
"""

import sys
from pathlib import Path

import pandas as pd

SALDO = 1000.0
COMISION = 0.001  # la misma que se le pasa al backtest con --fee
PARES = ["BTC_USDT", "ETH_USDT"]
PERIODOS = {
    "Diseño (18 meses)": ("2024-09-25", "2026-03-25"),
    "Validación (6 meses)": ("2026-03-25", "2026-09-25"),
}


def carga(exchange: str, par: str) -> pd.DataFrame:
    ruta = Path(__file__).parent / "user_data" / "data" / exchange / f"{par}-1h.feather"
    df = pd.read_feather(ruta)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    return df.set_index("date").sort_index()


def revisa_huecos(nombre: str, df: pd.DataFrame, inicio: str, fin: str) -> None:
    tramo = df.loc[pd.Timestamp(inicio, tz="UTC") : pd.Timestamp(fin, tz="UTC") - pd.Timedelta(hours=1)]
    esperadas = pd.date_range(inicio, fin, freq="1h", tz="UTC", inclusive="left")
    faltan = esperadas.difference(tramo.index)
    print(
        f"  {nombre}: {len(tramo)} velas, de {tramo.index[0]:%Y-%m-%d %H:%M} "
        f"a {tramo.index[-1]:%Y-%m-%d %H:%M} UTC — faltan {len(faltan)} horas"
    )


def comprar_y_mantener(datos: dict, inicio: str, fin: str) -> dict:
    ini, end = pd.Timestamp(inicio, tz="UTC"), pd.Timestamp(fin, tz="UTC")
    parte = SALDO / len(datos)
    valor = None
    for par, df in datos.items():
        tramo = df.loc[ini : end - pd.Timedelta(hours=1)]
        unidades = parte * (1 - COMISION) / tramo["open"].iloc[0]
        serie = unidades * tramo["close"]
        valor = serie if valor is None else valor + serie
    valor = valor.dropna()  # solo horas en que hay precio de ambos pares
    final = valor.iloc[-1] * (1 - COMISION)
    caida = (valor / valor.cummax() - 1).min()
    return {"final": final, "ganancia": final - SALDO, "pct": (final / SALDO - 1) * 100, "caida": caida * 100}


def main() -> None:
    exchange = sys.argv[1] if len(sys.argv) > 1 else "okx"
    datos = {par: carga(exchange, par) for par in PARES}

    print(f"\nDatos de {exchange}:")
    for nombre, (ini, fin) in PERIODOS.items():
        print(f" {nombre}")
        for par, df in datos.items():
            revisa_huecos(par, df, ini, fin)

    print(f"\nComprar y mantener (1,000 USDT, mitad BTC / mitad ETH, comisión {COMISION:.1%} por lado):")
    for nombre, (ini, fin) in PERIODOS.items():
        r = comprar_y_mantener(datos, ini, fin)
        print(
            f" {nombre}: termina en {r['final']:,.2f} USDT → "
            f"{r['ganancia']:+,.2f} USDT ({r['pct']:+.2f} %) · peor caída {r['caida']:.2f} %"
        )
        for par, df in datos.items():
            tramo = df.loc[pd.Timestamp(ini, tz="UTC") : pd.Timestamp(fin, tz="UTC") - pd.Timedelta(hours=1)]
            cambio = (tramo["close"].iloc[-1] / tramo["open"].iloc[0] - 1) * 100
            print(f"    {par}: {tramo['open'].iloc[0]:,.2f} → {tramo['close'].iloc[-1]:,.2f} ({cambio:+.2f} %)")


if __name__ == "__main__":
    main()
