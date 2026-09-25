# Backtest con Freqtrade — BTC/USDT y ETH/USDT

Proyecto aparte del bot de Ciudad Maderas: no toca nada de `starter/`.
**Solo simulación.** Sin dinero real, sin claves API, solo spot (nada de
futuros ni apalancamiento).

## Estado (2026-09-25): preparado, SIN correr

No hay resultados todavía. La red del entorno de Claude Code en la nube bloqueó
**12 de los 13 exchanges de spot que Freqtrade soporta oficialmente** (Binance,
Binance US, BingX, Bitget, Bybit, Bybit EU, Gate, HTX, Hyperliquid, Kraken, OKX
y MyOKX) y el archivo público `data.binance.vision`. Gate EU no se probó por
separado. Freqtrade falló con
`Markets were not loaded`, no se bajó ni una vela, y por regla del dueño **no se
inventan datos**: el backtest se detuvo ahí.

Para destrabarlo: en la configuración del entorno (menú del entorno en la barra
de título de la sesión → Edit → acceso a red), permitir `www.okx.com` (primera
opción), y de respaldo `api.binance.com` y `data.binance.vision`. Si con eso
sigue bloqueado, abrir una sesión nueva. Kraken y Gate no sirven aquí aunque
se permitan: por su API no dan 2 años de velas de 1 hora.

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
cd backtest-freqtrade && ./correr_backtest.sh okx   # o binance
```
