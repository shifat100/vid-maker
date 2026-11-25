(function () {
  if (typeof Native === "undefined" || typeof config === "undefined") {
    return;
  }

  var P = "com/sun/midp/io/j2me/socket/Protocol.";
  var PROXY = config.proxy || (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/__proxy";
  var live = [];
  var offsets = {};

  function field(addr, name, sig) {
    var cid = i32[addr >> 2], key = cid + "." + name;
    if (!(key in offsets)) {
      offsets[key] = J2ME.classIdToClassInfoMap[cid].getFieldByName(J2ME.toUTF8(name), J2ME.toUTF8(sig), false).byteOffset;
    }
    return i32[addr + offsets[key] >> 2];
  }

  function fail(ctx, reject, msg) {
    ctx.setAsCurrentContext();
    reject($.newIOException(msg));
  }

  function Conn(host, port) {
    this.host = host;
    this.port = port;
    this.chunks = [];
    this.len = 0;
    this.closed = false;
    this.inClosed = false;
    this.started = false;
    this.wait = null;
    this.opts = { 0: 1, 1: 0, 2: 1, 3: 8192, 4: 8192 };
  }

  Conn.prototype.open = function () {
    var c = this;
    return new Promise(function (resolve, reject) {
      var ready = false;
      var ws = new WebSocket(PROXY + "?host=" + encodeURIComponent(c.host) + "&port=" + c.port);
      ws.binaryType = "arraybuffer";
      c.ws = ws;
      ws.onmessage = function (e) {
        if (typeof e.data === "string") {
          if (!ready) {
            ready = true;
            if (e.data === "ok") resolve();
            else reject(e.data.replace(/^err\s*/, "") || "connection failed");
          }
          return;
        }
        c.chunks.push(new Int8Array(e.data));
        c.len += e.data.byteLength;
        c.wake();
      };
      ws.onclose = function () {
        c.closed = true;
        c.drop();
        if (!ready) {
          ready = true;
          reject("proxy unavailable: " + PROXY);
        }
        c.wake();
      };
    });
  };

  Conn.prototype.wake = function () {
    var w = this.wait;
    this.wait = null;
    if (w) w();
  };

  Conn.prototype.start = function (mode) {
    if (this.started || this.closed) return;
    this.started = true;
    this.ws.send(mode || "start");
  };

  Conn.prototype.drop = function () {
    var i = live.indexOf(this);
    if (i >= 0) live.splice(i, 1);
  };

  Conn.prototype.take = function (dst, off, len) {
    var n = 0;
    while (n < len && this.chunks.length) {
      var a = this.chunks[0], k = Math.min(a.length, len - n);
      dst.set(k === a.length ? a : a.subarray(0, k), off + n);
      if (k === a.length) this.chunks.shift();
      else this.chunks[0] = a.subarray(k);
      n += k;
    }
    this.len -= n;
    return n;
  };

  Native[P + "getIpNumber0.(Ljava/lang/String;[B)I"] = function () {
    return 0;
  };

  Native[P + "open0.([BI)V"] = function (addr, ipAddr, port) {
    var c = new Conn(J2ME.fromStringAddr(field(addr, "host", "Ljava/lang/String;")), port);
    var ctx = $.ctx;
    setNative(addr, c);
    asyncImpl("V", new Promise(function (resolve, reject) {
      c.open().then(function () {
        live.push(c);
        resolve();
      }, function (msg) {
        fail(ctx, reject, msg);
      });
    }));
  };

  Native[P + "available0.()I"] = function (addr) {
    var c = NativeMap.get(addr);
    c.start();
    return c.len;
  };

  Native[P + "read0.([BII)I"] = function (addr, dataAddr, off, len) {
    var c = NativeMap.get(addr);
    c.start();
    asyncImpl("I", new Promise(function (resolve) {
      (function poll() {
        if (c.len) resolve(c.take(J2ME.getArrayFromAddr(dataAddr), off, len));
        else if (c.closed || c.inClosed) resolve(-1);
        else c.wait = poll;
      })();
    }));
  };

  Native[P + "write0.([BII)I"] = function (addr, dataAddr, off, len) {
    var c = NativeMap.get(addr);
    if (c.closed) throw $.newIOException("socket is closed");
    c.start();
    c.ws.send(J2ME.getArrayFromAddr(dataAddr).slice(off, off + len));
    return len;
  };

  Native[P + "setSockOpt0.(II)V"] = function (addr, opt, value) {
    var c = NativeMap.get(addr);
    if (!(opt in c.opts)) throw $.newIllegalArgumentException("Unsupported socket option");
    c.opts[opt] = value;
  };

  Native[P + "getSockOpt0.(I)I"] = function (addr, opt) {
    var c = NativeMap.get(addr);
    if (!(opt in c.opts)) throw $.newIllegalArgumentException("Unsupported socket option");
    return c.opts[opt];
  };

  Native[P + "getHost0.(Z)Ljava/lang/String;"] = function (addr, local) {
    var c = NativeMap.get(addr);
    return J2ME.newString(local || !c ? "127.0.0.1" : c.host);
  };

  Native[P + "getPort0.(Z)I"] = function (addr, local) {
    var c = NativeMap.get(addr);
    return local || !c ? 0 : c.port;
  };

  Native[P + "close0.()V"] = function (addr) {
    var c = NativeMap.get(addr);
    if (!c || c.closed) return;
    c.closed = true;
    c.drop();
    c.ws.close();
    c.wake();
  };

  Native[P + "finalize.()V"] = function (addr) {
    Native[P + "close0.()V"](addr);
  };

  Native[P + "shutdownOutput0.()V"] = function (addr) {
    var c = NativeMap.get(addr);
    if (c && !c.closed) c.ws.send("shut");
  };

  Native[P + "notifyClosedInput0.()V"] = function (addr) {
    var c = NativeMap.get(addr);
    if (!c) return;
    c.inClosed = true;
    c.wake();
  };

  Native[P + "notifyClosedOutput0.()V"] = function () {};

  Native["com/sun/midp/ssl/SSLStreamConnection.tls0.(Ljava/lang/String;I)Z"] = function (addr, hostAddr, port) {
    var host = J2ME.fromStringAddr(hostAddr);
    for (var i = live.length - 1; i >= 0; i--) {
      var c = live[i];
      if (!c.started && c.port === port && c.host.toLowerCase() === host.toLowerCase()) {
        c.start("tls");
        return 1;
      }
    }
    return 0;
  };
})();
