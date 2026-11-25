#!/bin/bash
set -e
cd "$(dirname "$0")"
DIR=$(pwd)
PORT=${PORT:-8080}
PYTHON=${PYTHON:-$(command -v python3)}
command -v turnserver >/dev/null && command -v curl >/dev/null || { apt-get update -q; apt-get install -y -q coturn curl; }
systemctl disable --now coturn >/dev/null 2>&1 || true
ENV=/etc/j2me.env
[ -f $ENV ] || printf 'TURN_SECRET=%s\n' "$(head -c 24 /dev/urandom | base64 | tr -d '/+=')" > $ENV
chmod 600 $ENV
if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow "$PORT"/tcp
  ufw allow 3478
  ufw allow 49160:49200/udp
fi
cat > /etc/systemd/system/j2me.service <<UNIT
[Unit]
Description=J2ME emulator server
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$DIR
EnvironmentFile=$ENV
Environment=PORT=$PORT PYTHON=$PYTHON
ExecStart=/bin/bash $DIR/start.sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable j2me >/dev/null
systemctl restart j2me
IP=$(curl -fsS --max-time 5 https://api.ipify.org || hostname -I | cut -d' ' -f1)
echo "http://$IP:$PORT"
echo "Для Render (Environment):"
echo "TURN_URL=turn:$IP:3478,turn:$IP:3478?transport=tcp"
grep TURN_SECRET $ENV
