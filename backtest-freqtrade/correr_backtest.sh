#!/usr/bin/env bash
# Corre el backtest completo, sin dinero real y sin claves:
#   1. descarga 2 años de velas de 1 hora (datos públicos del exchange)
#   2. backtest del periodo de diseño   (2024-09-25 → 2026-03-25, 18 meses)
#   3. backtest del periodo de validación (2026-03-25 → 2026-09-25, 6 meses)
#   4. referencia "comprar y mantener" con los mismos datos
#
# Uso:  ./correr_backtest.sh [exchange]      (por defecto: binance)
set -euo pipefail
cd "$(dirname "$0")"

EXCHANGE="${1:-binance}"
FT="${FREQTRADE:-freqtrade}"
PY="${PYTHON:-python3}"
export FREQTRADE__EXCHANGE__NAME="$EXCHANGE"

# Se bajan 10 días extra antes del inicio: la media de 200 horas los necesita
# para "calentar". No se usan para operar.
"$FT" download-data --config config.json --userdir user_data \
  --timeframes 1h --timerange 20240915-20260925

for tramo in "20240925-20260325 diseno" "20260325-20260925 validacion"; do
  set -- $tramo
  "$FT" backtesting --config config.json --userdir user_data \
    --strategy CruceMedias --timerange "$1" --fee 0.001 \
    --cache none --export trades --breakdown month --notes "$2"
done

"$PY" comprar_y_mantener.py "$EXCHANGE"
