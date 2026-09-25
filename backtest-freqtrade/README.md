# Backtest con Freqtrade — BTC/USDT y ETH/USDT

Proyecto aparte del bot de Ciudad Maderas: no toca nada de `starter/`.
**Solo simulación.** Sin dinero real, sin claves API, solo spot (nada de
futuros ni apalancamiento).

## Resultado (corrido el 2026-09-25, datos de OKX)

Estrategia sin cambios desde que se escribió (commit `7e16562`, antes de bajar
datos). Comisión 0.1 % por lado. Datos: 17,772 velas de 1 h por par, sin
ninguna hora faltante.

| | Diseño (18 meses) | Validación (6 meses) |
|---|---|---|
| Operaciones | 164 | 51 |
| Aciertos | 44 (26.8 %) | 14 (27.5 %) |
| Neto después de comisiones | **+6.57 USDT (+0.66 %)** | **−37.00 USDT (−3.70 %)** |
| Comisiones pagadas | 117.88 USDT | 33.59 USDT |
| Peor caída (operaciones cerradas / saldo) | 21.0 % / 23.8 % | 7.8 % / 10.3 % |
| Tiempo con alguna operación abierta | 45 % | 43 % |
| Comprar y mantener 50/50, con comisión | −46.71 USDT (−4.67 %) | **+218.99 USDT (+21.90 %)** |
| Peor caída de comprar y mantener | 55.5 % | 32.8 % |

Lectura: en diseño quedó tablas (casi todo lo que ganó se fue en comisiones);
en validación perdió mientras el mercado subió ~22 %. Caídas mucho menores que
comprar y mantener, porque pasa más de la mitad del tiempo fuera y nunca
invierte más de ~2/3 del saldo. No mostró ventaja; no es garantía de nada.

Los resultados completos están en `user_data/backtest_results/`.

**Red:** OKX tuvo que permitirse en el entorno "Bot Simulador" (Custom +
`www.okx.com`); Binance contesta 451 (región bloqueada). Además, `ccxt` ignora
por defecto el proxy de la nube: `requests_trust_env` y `aiohttp_trust_env` en
`ccxt_config` lo arreglan sin apagar la verificación TLS, y en una computadora
normal no cambian nada.

## Qué hay

| Archivo | Para qué |
|---|---|
| `config.json` | Saldo simulado 1,000 USDT, BTC/USDT y ETH/USDT, velas de 1 h, máx. 3 operaciones, `dry_run: true`, claves vacías, spot |
| `user_data/strategies/CruceMedias.py` | La estrategia, explicada en español arriba del código |
| `correr_backtest.sh` | Descarga → diseño → validación → comprar y mantener, en un comando |
| `comprar_y_mantener.py` | La comparación, con los mismos datos y la misma comisión; también cuenta huecos en los datos |

## Reglas fijadas ANTES de ver datos (no se tocan)

- Compra: la media de 20 h cruza hacia arriba la de 50 h **y** el precio está
  sobre la media de 200 h. Vende: la de 20 h cruza hacia abajo la de 50 h, o
  stop-loss de −5 %. Son valores de libro, no elegidos por resultado.
- Diseño: 2024-09-25 → 2026-03-25 (18 meses). Validación: 2026-03-25 →
  2026-09-25 (6 meses). Se corre una vez cada uno, **sin re-ajustar entre uno y
  otro**, y sin hyperopt. El historial de git de `CruceMedias.py` es la prueba
  de que no cambió.
- Comisión 0.1 % por lado (`--fee 0.001`), para estrategia y para comprar y
  mantener.

Tres cosas que conviene saber al leer el resultado:
- Con solo 2 pares hay como mucho **2** operaciones abiertas a la vez (Freqtrade
  no abre dos en el mismo par), y cada una usa ~1/3 del saldo. La estrategia
  nunca tiene invertido más de ~2/3 del dinero; comprar y mantener, todo.
- El backtest supone que el stop-loss se llena justo a −5 %. En una caída brusca
  la venta real sale peor.
- 6 meses de validación son pocos: un buen o mal resultado ahí puede ser suerte.

## Cómo correrlo

```bash
pip install freqtrade
cd backtest-freqtrade && ./correr_backtest.sh        # usa OKX
```
