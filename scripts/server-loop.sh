#!/usr/bin/env bash
# JUM Football preview server — auto-restart wrapper.
# Keeps the server alive across crashes (SIGBUS etc.) with backoff,
# and tracks uptime in /tmp/jum-server-uptime.
set -u
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPTIME_FILE=/tmp/jum-server-uptime
CRASHES=0

echo "[server-loop] starting $(date -Iseconds)" > "$UPTIME_FILE"

# ensure we're the only server: clear any stale listener on our port first
PORT_NUM="${PORT:-8899}"
if command -v lsof >/dev/null 2>&1; then
  stale=$(lsof -ti:"$PORT_NUM" 2>/dev/null || true)
  if [ -n "$stale" ]; then kill $stale 2>/dev/null; sleep 1; fi
fi

while true; do
  start=$(date +%s)
  echo "[server-loop] spawn $(date -Iseconds) (restart #$CRASHES)" >> "$UPTIME_FILE"
  (cd "$APP_DIR" && exec node scripts/dev-server.mjs) >> /tmp/devserver.log 2>&1
  code=$?
  elapsed=$(( $(date +%s) - start ))
  CRASHES=$((CRASHES + 1))
  echo "[server-loop] exit code=$code after ${elapsed}s $(date -Iseconds)" >> "$UPTIME_FILE"
  # backoff: 2s, 4s, 8s, capped at 15s
  delay=$(( CRASHES * 2 ))
  [ "$delay" -gt 15 ] && delay=15
  echo "[server-loop] backing off ${delay}s" >> "$UPTIME_FILE"
  sleep "$delay"
done
