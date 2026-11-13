#!/usr/bin/env bash
# Bateria de testes da mesa com um Mestre (IA) e um SMTP simulados — não gasta
# créditos da IA nem envia emails de verdade. Uso: bash tools/rodar_testes.sh
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null || true; rm -rf "$TMP"' EXIT
touch "$TMP/emails.txt"
node tools/mocks.js 3096 3097 "$TMP/emails.txt" > "$TMP/mocks.log" 2>&1 &
iniciar() {
  PORT=3095 HOST=127.0.0.1 RPG_AI_PROXY= RPG_AI_BASE_URL=http://127.0.0.1:3096 RPG_AI_API_PATH=/v1/messages \
  SMTP_PORT=3097 PUBLIC_URL=http://127.0.0.1:3095 RPG_TEMPO_TURNO_MS=3000 RPG_TEMPO_DADO_MS=3000 RPG_BOT_ESPERA_MS=200 RPG_BOT_ESPERA_DADO_MS=200 RPG_BOT_FECHA_DADO_MS=300 \
  RPG_IMG_BASE_URL=http://127.0.0.1:3096/v1 RPG_IMG_API_KEY=teste RPG_IMG_INTERVALO_MS=0 RPG_DATA_DIR="$TMP/data" \
  node server.js >> "$TMP/servidor.log" 2>&1 &
  SERVIDOR=$!
  until curl -s -o /dev/null 127.0.0.1:3095/api/config; do sleep 0.2; done
}
iniciar
node tools/teste_mesa.js http://127.0.0.1:3095/ "$TMP/emails.txt" 1 "$TMP/data"
kill $SERVIDOR; sleep 1; iniciar   # reinicia para testar a persistência
node tools/teste_mesa.js http://127.0.0.1:3095/ "$TMP/emails.txt" 2 "$TMP/data"
