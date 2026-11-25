#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ -z "$TURN_URL" ] && [ -z "$RENDER" ] && [ "$TURN" != "0" ] && command -v turnserver >/dev/null; then
  TURN_IP=${TURN_IP:-$(curl -fsS --max-time 5 https://api.ipify.org || true)}
  if [ -n "$TURN_IP" ]; then
    export TURN_SECRET=${TURN_SECRET:-$(head -c 24 /dev/urandom | base64 | tr -d '/+=')}
    export TURN_URL="turn:$TURN_IP:3478,turn:$TURN_IP:3478?transport=tcp"
    turnserver -c turnserver.conf --external-ip="$TURN_IP" --static-auth-secret="$TURN_SECRET" &
  fi
fi
exec ${PYTHON:-python3} server.py
