import base64
import hashlib
import hmac
import ipaddress
import os
import socket
import ssl
import struct
import sys
import json
import random
import re
import threading
import time
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlsplit

WS_GUID = b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
WS_MAX = 1 << 24
ROOT = os.path.dirname(os.path.abspath(__file__))
JARS = os.path.join(ROOT, "jar")
ALLOW_PRIVATE = os.environ.get("ALLOW_PRIVATE") == "1"


def resolve(host, port):
    if not 0 < port < 65536:
        raise OSError("bad port")
    for family, kind, proto, _, addr in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM):
        if ALLOW_PRIVATE or ipaddress.ip_address(addr[0].split("%")[0]).is_global:
            return family, addr
    raise OSError("address not allowed")


def manifest(path):
    with zipfile.ZipFile(path) as z:
        raw = z.read("META-INF/MANIFEST.MF").decode("utf-8", "replace")
    attrs = {}
    for line in re.sub(r"\r?\n ", "", raw).splitlines():
        k, sep, v = line.partition(":")
        if sep:
            attrs[k.strip()] = v.strip()
    return attrs


def icon_path(attrs):
    parts = attrs.get("MIDlet-1", "").split(",")
    icon = attrs.get("MIDlet-Icon") or (parts[1] if len(parts) > 2 else "")
    return icon.strip().lstrip("/")


def jar_info(name):
    try:
        attrs = manifest(os.path.join(JARS, name))
    except (OSError, KeyError, zipfile.BadZipFile):
        return None
    title = attrs.get("MIDlet-1", "").split(",")[0].strip() or attrs.get("MIDlet-Name") or name[:-4]
    return {"file": name, "name": title, "vendor": attrs.get("MIDlet-Vendor", ""), "icon": bool(icon_path(attrs))}


BT_LOCK = threading.Lock()
BT_ROOMS = {}
BT_LINKS = {}
BT_NEXT = [0]
BT_ADDR = re.compile(r"^[0-9A-F]{12}$")
TURN_URLS = [u.strip() for u in os.environ.get("TURN_URL", "").split(",") if u.strip()]
TURN_SECRET = os.environ.get("TURN_SECRET", "")


def bt_ice():
    if not (TURN_URLS and TURN_SECRET):
        return None
    stun = sorted({"stun:" + u.split(":", 1)[1].split("?")[0] for u in TURN_URLS})
    user = "%d:bt" % (time.time() + 86400)
    cred = base64.b64encode(hmac.new(TURN_SECRET.encode(), user.encode(), hashlib.sha1).digest()).decode()
    return [{"urls": stun}, {"urls": TURN_URLS, "username": user, "credential": cred}]


class Radio:
    def __init__(self, ws, room, addr, name):
        self.ws = ws
        self.room = room
        self.addr = addr
        self.name = name
        self.services = {}
        self.links = set()

    def send(self, msg):
        try:
            self.ws.text(json.dumps(msg, ensure_ascii=False))
        except OSError:
            pass


def bt_peers(key):
    room = BT_ROOMS.get(key)
    return room["peers"] if room else {}


def bt_count(key):
    with BT_LOCK:
        peers = list(bt_peers(key).values())
    addrs = [p.addr for p in peers]
    for p in peers:
        p.send({"t": "peers", "n": len(peers), "list": addrs})


def bt_join(ws, key, mode, password, addr, name, net):
    with BT_LOCK:
        room = BT_ROOMS.get(key)
        if room is None:
            if mode == "join":
                return None, "notfound"
            if net == "turn" and not (TURN_URLS and TURN_SECRET):
                return None, "noturn"
            room = BT_ROOMS[key] = {"pass": password, "peers": {}, "net": net}
        elif mode == "create":
            return None, "taken"
        elif not hmac.compare_digest(room["pass"].encode(), password.encode()):
            return None, "badpass"
        peers = room["peers"]
        if len(peers) >= 8:
            return None, "full"
        if not BT_ADDR.match(addr) or addr in peers:
            addr = "%012X" % random.getrandbits(48)
            while addr in peers:
                addr = "%012X" % random.getrandbits(48)
        r = Radio(ws, key, addr, name or "J2ME-" + addr[-4:])
        r.net = room["net"]
        peers[addr] = r
    return r, None


def bt_leave(r):
    notify = []
    with BT_LOCK:
        peers = bt_peers(r.room)
        peers.pop(r.addr, None)
        if not peers:
            BT_ROOMS.pop(r.room, None)
        for i in r.links:
            pair = BT_LINKS.pop(i, None)
            if pair:
                other = pair[1] if pair[0] is r else pair[0]
                other.links.discard(i)
                notify.append((other, i))
        r.links.clear()
    for other, i in notify:
        other.send({"t": "close", "link": i, "gone": 1})
    bt_count(r.room)


def bt_control(r, m):
    t = m.get("t")
    with BT_LOCK:
        peers = bt_peers(r.room)
        if t == "inq":
            devs = [[p.addr, "5a020c", p.name] for p in peers.values() if p is not r]
            reply, notify = {"t": t, "q": m.get("q"), "devs": devs}, None
        elif t == "sdp":
            p = peers.get(m.get("addr"))
            recs = [[k, v] for k, v in p.services.items()] if p else None
            reply, notify = {"t": t, "q": m.get("q"), "recs": recs}, None
        elif t == "reg":
            key, attrs = str(m.get("key"))[:8], str(m.get("attrs"))
            if len(attrs) <= 8192 and (key in r.services or len(r.services) < 16):
                r.services[key] = attrs
            return
        elif t == "unreg":
            r.services.pop(m.get("key"), None)
            return
        elif t == "conn":
            p, key = peers.get(m.get("addr")), m.get("key")
            if p is None or p is r:
                reply, notify = {"t": t, "q": m.get("q"), "link": -1}, None
            elif key not in p.services:
                reply, notify = {"t": t, "q": m.get("q"), "link": -2}, None
            else:
                del p.services[key]
                BT_NEXT[0] += 1
                i = BT_NEXT[0]
                BT_LINKS[i] = (r, p)
                r.links.add(i)
                p.links.add(i)
                reply = {"t": t, "q": m.get("q"), "link": i, "name": p.name}
                notify = (p, {"t": "in", "key": key, "link": i, "peer": r.addr, "name": r.name})
        elif t in ("sig", "p2p"):
            p = peers.get(m.get("to"))
            if p is None or p is r:
                return
            msg = {k: m[k] for k in ("t", "k", "c", "d") if k in m}
            msg["from"] = r.addr
            reply, notify = None, (p, msg)
        elif t == "close":
            pair = BT_LINKS.pop(m.get("link"), None)
            if not pair or r not in pair:
                return
            other = pair[1] if pair[0] is r else pair[0]
            r.links.discard(m["link"])
            other.links.discard(m["link"])
            reply, notify = None, (other, {"t": "close", "link": m["link"]})
        else:
            return
    if notify:
        notify[0].send(notify[1])
    if reply:
        r.send(reply)


def bt_data(r, data):
    if len(data) < 4:
        return
    pair = BT_LINKS.get(struct.unpack("!I", data[:4])[0])
    if pair and r in pair:
        other = pair[1] if pair[0] is r else pair[0]
        try:
            other.ws.send(2, data)
        except OSError:
            pass


def jar_name(q):
    name = os.path.basename(q.get("jar", [""])[0])
    return name if name.lower().endswith(".jar") else ""


class WebSocket:
    def __init__(self, rfile, sock):
        self.rfile = rfile
        self.sock = sock
        self.lock = threading.Lock()

    def send(self, opcode, data=b""):
        n = len(data)
        if n < 126:
            head = struct.pack("!BB", 0x80 | opcode, n)
        elif n < 65536:
            head = struct.pack("!BBH", 0x80 | opcode, 126, n)
        else:
            head = struct.pack("!BBQ", 0x80 | opcode, 127, n)
        with self.lock:
            self.sock.sendall(head + data)

    def text(self, s):
        self.send(1, s.encode())

    def recv(self):
        data = b""
        kind = None
        while True:
            head = self.rfile.read(2)
            if len(head) < 2:
                return None, None
            fin, opcode, n = head[0] & 0x80, head[0] & 0x0F, head[1] & 0x7F
            if n == 126:
                n = struct.unpack("!H", self.rfile.read(2))[0]
            elif n == 127:
                n = struct.unpack("!Q", self.rfile.read(8))[0]
            if n + len(data) > WS_MAX:
                return None, None
            mask = self.rfile.read(4) if head[1] & 0x80 else b""
            body = self.rfile.read(n)
            if len(body) < n:
                return None, None
            if mask and n:
                key = (mask * (n // 4 + 1))[:n]
                body = (int.from_bytes(body, "big") ^ int.from_bytes(key, "big")).to_bytes(n, "big")
            if opcode == 9:
                self.send(10, body)
                continue
            if opcode == 10:
                continue
            if opcode:
                kind = opcode
            data += body
            if fin:
                return kind, bytes(data)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass

    def send_head(self):
        if any(p.startswith(".") for p in unquote(urlsplit(self.path).path).replace("\\", "/").split("/")):
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def reply(self, code, body=b"", ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlsplit(self.path)
        q = parse_qs(url.query)
        upgrade = self.headers.get("Upgrade", "").lower() == "websocket"
        if url.path == "/__proxy" and upgrade:
            self.proxy()
        elif url.path == "/__bt" and upgrade:
            self.bt(q)
        elif url.path == "/__jars":
            names = sorted(f for f in os.listdir(JARS) if f.lower().endswith(".jar"))
            items = [i for i in map(jar_info, names) if i]
            self.reply(200, json.dumps(items, ensure_ascii=False).encode())
        elif url.path == "/__icon":
            try:
                path = os.path.join(JARS, jar_name(q))
                with zipfile.ZipFile(path) as z:
                    data = z.read(icon_path(manifest(path)))
                self.reply(200, data, "image/png")
            except (OSError, KeyError, zipfile.BadZipFile):
                self.reply(404)
        else:
            super().do_GET()

    def client_ip(self):
        ip = self.client_address[0]
        fwd = self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        return fwd if fwd and not ipaddress.ip_address(ip.split("%")[0]).is_global else ip

    def upgrade(self):
        key = self.headers["Sec-WebSocket-Key"].encode()
        accept = base64.b64encode(hashlib.sha1(key + WS_GUID).digest()).decode()
        self.wfile.write(
            ("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
             "Sec-WebSocket-Accept: %s\r\n\r\n" % accept).encode())
        self.wfile.flush()
        self.close_connection = True
        self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        return WebSocket(self.rfile, self.connection)

    def bt(self, q):
        arg = lambda k, n: q.get(k, [""])[0][:n]
        mode = arg("mode", 8)
        if mode in ("create", "join"):
            key = " ".join(arg("room", 64).lower().split())
            key = key and "r:" + key
            password = arg("pass", 64)
        else:
            mode, password = "near", ""
            key = "n:" + self.client_ip()
        ws = self.upgrade()
        name = re.sub(r"[\x00-\x1f\x7f]", "", arg("name", 32)).strip()
        net = arg("net", 8)
        net = net if net in ("p2p", "turn") else "auto"
        r, err = bt_join(ws, key, mode, password, arg("addr", 12).upper(), name, net) if key else (None, "noname")
        if err:
            ws.text(json.dumps({"t": "err", "msg": err}, ensure_ascii=False))
            ws.send(8)
            return
        r.send({"t": "hi", "addr": r.addr, "name": r.name, "ice": bt_ice(), "net": r.net})
        bt_count(r.room)
        try:
            while True:
                kind, data = ws.recv()
                if kind is None or kind == 8:
                    break
                if kind == 2:
                    bt_data(r, data)
                else:
                    try:
                        m = json.loads(data)
                    except ValueError:
                        continue
                    if isinstance(m, dict):
                        bt_control(r, m)
        except OSError:
            pass
        finally:
            bt_leave(r)

    def proxy(self):
        q = parse_qs(urlsplit(self.path).query)
        host = q.get("host", [""])[0]
        try:
            port = int(q.get("port", ["0"])[0])
        except ValueError:
            port = 0
        ws = self.upgrade()
        try:
            family, addr = resolve(host, port)
            tcp = socket.socket(family, socket.SOCK_STREAM)
            tcp.settimeout(20)
            tcp.connect(addr)
            tcp.settimeout(None)
            tcp.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except OSError as e:
            ws.text("err %s" % e)
            ws.send(8)
            return
        ws.text("ok")
        self.tcp = tcp
        try:
            self.pump(ws, host)
        except OSError:
            pass
        finally:
            try:
                self.tcp.close()
            except OSError:
                pass

    def pump(self, ws, host):
        tcp = self.tcp
        reader = None
        while True:
            kind, data = ws.recv()
            if kind is None or kind == 8:
                return
            if kind == 2:
                tcp.sendall(data)
                continue
            cmd = data.decode("utf-8", "replace")
            if cmd == "shut":
                if not isinstance(tcp, ssl.SSLSocket):
                    tcp.shutdown(socket.SHUT_WR)
            elif cmd in ("start", "tls") and reader is None:
                if cmd == "tls":
                    try:
                        tcp = self.tcp = ssl.create_default_context().wrap_socket(tcp, server_hostname=host)
                    except (OSError, ssl.SSLError):
                        ws.send(8)
                        return
                reader = threading.Thread(target=self.downstream, args=(ws, tcp), daemon=True)
                reader.start()

    @staticmethod
    def downstream(ws, tcp):
        try:
            while True:
                data = tcp.recv(65536)
                if not data:
                    break
                ws.send(2, data)
        except OSError:
            pass
        try:
            ws.send(8)
        except OSError:
            pass


if __name__ == "__main__":
    os.makedirs(JARS, exist_ok=True)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8080))
    ThreadingHTTPServer.daemon_threads = True
    print("http://localhost:%d" % port, flush=True)
    ThreadingHTTPServer(("", port), Handler).serve_forever()
