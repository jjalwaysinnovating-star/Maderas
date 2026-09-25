"""
Estrategia CruceMedias — cruce de medias móviles con filtro RSI y stop-loss.

En palabras normales:
  COMPRA cuando el promedio de las últimas 20 horas cruza hacia ARRIBA al
         promedio de las últimas 50 horas (el precio empieza a subir más rápido
         de lo normal), siempre que el RSI esté debajo de 70 (no compra si el
         precio ya se disparó demasiado).
  VENDE  cuando el promedio de 20 horas cruza hacia ABAJO al de 50 horas
         (la subida se acabó), o cuando la operación pierde 5% (stop-loss).

Los números (20, 50, 70 y 5%) se fijaron ANTES de ver ningún dato y no se
ajustan para que el backtest se vea mejor. Solo mercado spot, sin cortos.
"""

import talib.abstract as ta
from pandas import DataFrame

from freqtrade.strategy import IStrategy
import freqtrade.vendor.qtpylib.indicators as qtpylib


class CruceMedias(IStrategy):
    INTERFACE_VERSION = 3

    timeframe = "1h"
    can_short = False  # solo spot: nunca apuesta a la baja

    # Stop-loss: si una operación pierde 5%, se vende.
    stoploss = -0.05
    trailing_stop = False

    # Sin objetivo de ganancia fijo: sale por la señal de venta o por el stop.
    minimal_roi = {"0": 100}

    process_only_new_candles = True
    use_exit_signal = True
    exit_profit_only = False

    # Velas de "calentamiento" para que los promedios ya estén calculados.
    startup_candle_count = 100

    MEDIA_RAPIDA = 20
    MEDIA_LENTA = 50
    RSI_MAXIMO = 70

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema_rapida"] = ta.EMA(dataframe, timeperiod=self.MEDIA_RAPIDA)
        dataframe["ema_lenta"] = ta.EMA(dataframe, timeperiod=self.MEDIA_LENTA)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            qtpylib.crossed_above(dataframe["ema_rapida"], dataframe["ema_lenta"])
            & (dataframe["rsi"] < self.RSI_MAXIMO)
            & (dataframe["volume"] > 0),
            ["enter_long", "enter_tag"],
        ] = (1, "cruce_arriba")
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            qtpylib.crossed_below(dataframe["ema_rapida"], dataframe["ema_lenta"])
            & (dataframe["volume"] > 0),
            ["exit_long", "exit_tag"],
        ] = (1, "cruce_abajo")
        return dataframe
