#!/usr/bin/env bash
# Comprueba que la RPC get_partidos_slot existe en Supabase.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/react/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta react/.env"
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a
RESP=$(curl -s -w "\n%{http_code}" -X POST "${VITE_SUPABASE_URL}/rest/v1/rpc/get_partidos_slot" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_slot_id":"lun-up","p_semana":"2026-05-12"}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1)
echo "HTTP $CODE"
echo "$BODY" | head -c 500
echo ""
if [[ "$CODE" == "200" ]]; then
  echo "OK: get_partidos_slot responde correctamente."
  exit 0
fi
if echo "$BODY" | grep -q PGRST202; then
  echo "ERROR: la función no existe en Supabase. Ejecuta supabase/get_partidos_slot_fn.sql en el SQL Editor o: npx supabase db push"
  exit 1
fi
exit 1
