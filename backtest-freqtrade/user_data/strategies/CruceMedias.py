"""
CruceMedias — estrategia simple de cruce de medias móviles, solo compras (spot).

Los números de abajo se fijaron ANTES de descargar o ver ningún dato, y son
valores de libro, no elegidos por el resultado. No se cambian entre el
periodo de diseño (primeros 18 meses) y el de validación (últimos 6).

Cuándo COMPRA (se tienen que cumplir las dos cosas en la misma vela de 1 hora):
  1. El promedio de las últimas 20 horas cruza hacia ARRIBA el promedio de las
     últimas 50 horas (el precio empezó a subir más rápido de lo normal).
  2. El precio está por encima del promedio de las últimas 200 horas
     (~8 días): solo se compra cuando la tendencia de fondo es de subida.

Cuándo VENDE (lo primero que pase):
  a. El promedio de 20 horas cruza hacia ABAJO el de 50 (el impulso se acabó).
  b. Stop-loss: la operación va perdiendo 5 % → se vende para cortar la pérdida.
"""

import talib.abstract as ta
from pandas import DataFrame

from technical import qtpylib
from freqtrade.strategy import IStrategy


class CruceMedias(IStrategy):
    INTERFACE_VERSION = 3

    timeframe = "1h"
    can_short = False  # solo spot: nunca apuesta a la baja

    # Sin objetivo de ganancia fijo: solo se sale por la señal o por el stop-loss.
    minimal_roi = {"0": 100}

    stoploss = -0.05
    trailing_stop = False

    use_exit_signal = True
    exit_profit_only = False
    process_only_new_candles = True

    # La media de 200 horas necesita 200 velas previas para calcularse.
    startup_candle_count = 200

    MEDIA_RAPIDA = 20
    MEDIA_LENTA = 50
    MEDIA_TENDENCIA = 200

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema_rapida"] = ta.EMA(dataframe, timeperiod=self.MEDIA_RAPIDA)
        dataframe["ema_lenta"] = ta.EMA(dataframe, timeperiod=self.MEDIA_LENTA)
        dataframe["ema_tendencia"] = ta.EMA(dataframe, timeperiod=self.MEDIA_TENDENCIA)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            qtpylib.crossed_above(dataframe["ema_rapida"], dataframe["ema_lenta"])
            & (dataframe["close"] > dataframe["ema_tendencia"])
            & (dataframe["volume"] > 0),
            "enter_long",
        ] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            qtpylib.crossed_below(dataframe["ema_rapida"], dataframe["ema_lenta"])
            & (dataframe["volume"] > 0),
            "exit_long",
        ] = 1
        return dataframe
