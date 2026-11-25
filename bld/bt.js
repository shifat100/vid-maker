(function () {
  if (typeof Native === "undefined" || typeof config === "undefined") {
    return;
  }

  var P = "com/sun/bt/Bt.";
  var query = new URLSearchParams(location.search);
  var URL_ = config.btProxy || (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/__bt";
  var room = query.has("room") ? {
    mode: !query.get("room") ? "near" : query.get("mode") === "create" ? "create" : "join",
    room: query.get("room") || "",
    pass: query.get("pass") || "",
    net: query.get("net") || "auto",
    name: query.get("btname") || BtRoom.name()
  } : null;
  var STUN = [{ urls: "stun:stun.l.google.com:19302" }];
  var ICE = config.btIce || STUN, NET = "auto";
  var ws = null, opening = null, me = "", myName = "", peers = 0;
  var seq = 0, pending = {}, results = {}, accepts = {}, links = {}, mesh = {}, dirty = [];

  ["init.()I", "inquiry.()I", "sdp.(Ljava/lang/String;)I", "accept.(Ljava/lang/String;Ljava/lang/String;)I",
    "connect.(Ljava/lang/String;Ljava/lang/String;)I", "recv.(I[BIIZ)I"].forEach(function (k) {
    J2ME.yieldMap[P + k] = 1;
  });

  function str(addr) {
    return J2ME.fromStringAddr(addr);
  }

  function Link(id, peer, name) {
    this.id = id;
    this.peer = peer;
    this.name = name;
    this.chunks = [];
    this.len = 0;
    this.closed = false;
    this.waits = [];
    links[id] = this;
    pace();
  }

  function pace() {
    J2ME.windowTime = Object.keys(links).some(function (id) { return !links[id].closed; }) ? 2 : 80;
  }

  Link.prototype.wake = function () {
    var w = this.waits;
    this.waits = [];
    w.forEach(function (f) { f(); });
    if (w.length) Promise.resolve().then(J2ME.Scheduler.kick);
  };

  Link.prototype.shut = function () {
    this.closed = true;
    pace();
    this.wake();
  };

  Link.prototype.push = function (a) {
    this.chunks.push(a);
    this.len += a.length;
    this.wake();
  };

  function show() {
    var via = "", rtt = 0;
    Object.keys(mesh).forEach(function (a) {
      var p = mesh[a];
      if (!p.dc || !p.via) return;
      if (via !== "TURN") via = p.via;
      rtt = Math.max(rtt, p.rtt || 0);
    });
    BtRoom.status(room, peers, via, rtt);
  }

  function route(p) {
    var c = p.pick;
    if (!c || !p.dc) return;
    c.pc.getStats().then(function (stats) {
      var byId = {}, pair = null;
      stats.forEach(function (st) { byId[st.id] = st; });
      stats.forEach(function (st) {
        if (st.type === "transport" && st.selectedCandidatePairId) pair = byId[st.selectedCandidatePairId];
      });
      if (!pair) {
        stats.forEach(function (st) {
          if (st.type === "candidate-pair" && st.selected) pair = st;
        });
      }
      if (!pair || !p.dc) return;
      var a = byId[pair.localCandidateId], b = byId[pair.remoteCandidateId];
      p.via = a && a.candidateType === "relay" || b && b.candidateType === "relay" ? "TURN" : "P2P";
      p.rtt = pair.currentRoundTripTime ? Math.round(pair.currentRoundTripTime * 1000) : Math.round(c.lat || 0);
      show();
    });
  }

  function sig(addr, m) {
    m.t = "sig";
    m.to = addr;
    if (ws) ws.send(JSON.stringify(m));
  }

  function isTurn(s) {
    return [].concat(s.urls).some(function (u) { return /^turns?:/.test(u); });
  }

  function kinds() {
    return NET === "auto" && ICE.some(isTurn) ? ["d", "r"] : ["a"];
  }

  function rtc(k) {
    if (k === "d") return { iceServers: ICE.filter(function (s) { return !isTurn(s); }) };
    return { iceServers: ICE, iceTransportPolicy: k === "r" || NET === "turn" ? "relay" : "all" };
  }

  function peer(addr) {
    if (mesh[addr]) return mesh[addr];
    var p = mesh[addr] = { addr: addr, lead: me > addr, q: [], out: [], wait: [], ch: {}, want: "", failed: false, dc: null, pick: null, via: "", rtt: 0 };
    if (typeof RTCPeerConnection !== "undefined") kinds().forEach(function (k) { channel(p, k); });
    return p;
  }

  function channel(p, k) {
    var c = p.ch[k] = { k: k, pc: new RTCPeerConnection(rtc(k)), dc: null, ice: [], dead: false, lat: null, pong: null };
    var pc = c.pc;
    pc.onicecandidate = function (e) {
      if (e.candidate) sig(p.addr, { k: k, c: e.candidate.toJSON() });
    };
    pc.oniceconnectionstatechange = function () {
      if (p.pick === c) route(p);
    };
    pc.onconnectionstatechange = function () {
      if (pc.connectionState === "failed") fail(p, c);
    };
    var use = function (dc) {
      dc.binaryType = "arraybuffer";
      dc.onopen = function () {
        if (mesh[p.addr] !== p || p.ch[k] !== c) return;
        c.dc = dc;
        if (p.lead) probe(p, c);
        else if (p.want === k) adopt(p, c);
      };
      dc.onmessage = function (e) {
        if (typeof e.data === "string") {
          if (e.data === "ping") dc.send("pong");
          else if (c.pong) c.pong();
        } else if (p.q) {
          p.q.push(e.data);
        } else {
          data(e.data);
        }
      };
      dc.onclose = function () {
        fail(p, c);
      };
    };
    if (p.lead) {
      use(pc.createDataChannel("bt"));
      pc.createOffer().then(function (o) {
        return pc.setLocalDescription(o);
      }).then(function () {
        sig(p.addr, { k: k, d: pc.localDescription.toJSON() });
      }).catch(function () {});
    } else {
      pc.ondatachannel = function (e) {
        use(e.channel);
      };
    }
  }

  function probe(p, c) {
    if (Object.keys(p.ch).length === 1) return adopt(p, c);
    var t = [], t0 = 0;
    var ping = function () {
      t0 = performance.now();
      c.dc.send("ping");
    };
    c.pong = function () {
      t.push(performance.now() - t0);
      if (t.length < 20) return ping();
      c.pong = null;
      t.sort(function (a, b) { return a - b; });
      c.lat = t[Math.floor(t.length * 0.9)];
      judge(p);
    };
    ping();
  }

  function judge(p) {
    var d = p.ch.d, r = p.ch.r;
    if (p.dc || !d || !r) return;
    if (d.lat !== null && r.lat !== null) return adopt(p, r.lat < d.lat * 0.85 ? r : d);
    if (d.lat !== null && (r.dead || !r.dc)) return adopt(p, d);
    if (r.lat !== null && (d.dead || !d.dc)) return adopt(p, r);
  }

  function fail(p, c) {
    if (c.dead || mesh[p.addr] !== p) return;
    c.dead = true;
    if (p.pick === c) return drop(p.addr);
    if (p.dc) return;
    if (Object.keys(p.ch).every(function (k) { return p.ch[k].dead; })) {
      p.failed = true;
      settle(p, false);
    } else if (p.lead) {
      judge(p);
    }
  }

  function adopt(p, c) {
    if (p.dc || !ws || !c.dc) return;
    Object.keys(p.ch).forEach(function (k) {
      if (p.ch[k] === c) return;
      p.ch[k].dead = true;
      p.ch[k].pc.close();
    });
    ws.send(JSON.stringify({ t: "p2p", to: p.addr, k: c.k }));
    p.pick = c;
    p.dc = c.dc;
    p.out.forEach(function (b) { c.dc.send(b); });
    p.out = [];
    settle(p, true);
    var it = c.pc.sctp && c.pc.sctp.transport && c.pc.sctp.transport.iceTransport;
    if (it) it.onselectedcandidatepairchange = function () { route(p); };
    route(p);
  }

  function settle(p, ok) {
    var w = p.wait;
    p.wait = [];
    w.forEach(function (f) { f(ok); });
  }

  function ready(addr) {
    var p = mesh[addr];
    if (!p || !Object.keys(p.ch).length || p.dc) return Promise.resolve(true);
    if (p.failed) return Promise.resolve(false);
    return new Promise(function (resolve) { p.wait.push(resolve); });
  }

  function drop(addr) {
    var p = mesh[addr];
    if (!p) return;
    delete mesh[addr];
    p.failed = true;
    settle(p, false);
    if (p.dc) {
      Object.keys(links).forEach(function (id) {
        if (links[id].peer === addr) close(links[id]);
      });
    }
    p.dc = null;
    Object.keys(p.ch).forEach(function (k) { p.ch[k].pc.close(); });
    show();
  }

  function sync(list) {
    Object.keys(mesh).forEach(function (a) {
      if (list.indexOf(a) < 0) drop(a);
    });
    list.forEach(function (a) {
      if (a !== me) peer(a);
    });
  }

  function signal(p, m) {
    var c = p.ch[m.k];
    if (!c || c.dead) return;
    var pc = c.pc;
    if (m.c) {
      if (c.ice) c.ice.push(m.c);
      else pc.addIceCandidate(m.c).catch(function () {});
      return;
    }
    pc.setRemoteDescription(m.d).then(function () {
      var q = c.ice;
      c.ice = null;
      q.forEach(function (x) { pc.addIceCandidate(x).catch(function () {}); });
      if (m.d.type !== "offer") return;
      return pc.createAnswer().then(function (a) {
        return pc.setLocalDescription(a);
      }).then(function () {
        sig(p.addr, { k: m.k, d: pc.localDescription.toJSON() });
      });
    }).catch(function () {});
  }

  function reset() {
    ws = null;
    Object.keys(pending).forEach(function (q) { pending[q](null); });
    Object.keys(accepts).forEach(function (k) { accepts[k](-1); });
    Object.keys(links).forEach(function (id) {
      var p = mesh[links[id].peer];
      if (!p || !p.dc) links[id].shut();
    });
    pending = {};
    accepts = {};
  }

  function control(m) {
    if (m.q && pending[m.q]) {
      var done = pending[m.q];
      delete pending[m.q];
      done(m);
    } else if (m.t === "in") {
      var take = accepts[m.key];
      if (!take) return ws.send(JSON.stringify({ t: "close", link: m.link }));
      delete accepts[m.key];
      new Link(m.link, m.peer, m.name);
      take(m.link);
    } else if (m.t === "sig") {
      if (m.from && m.from !== me) signal(peer(m.from), m);
    } else if (m.t === "p2p") {
      var p = mesh[m.from];
      if (!p) return;
      if (!p.lead && !p.dc) {
        p.want = m.k;
        if (p.ch[m.k] && p.ch[m.k].dc) adopt(p, p.ch[m.k]);
      }
      if (!p.q) return;
      var q = p.q;
      p.q = null;
      q.forEach(data);
    } else if (m.t === "close" && links[m.link]) {
      var l = links[m.link], lp = mesh[l.peer];
      if (m.gone || !lp || lp.q) l.shut();
    }
  }

  function data(buf) {
    var l = links[new DataView(buf).getUint32(0)];
    if (!l) return;
    if (buf.byteLength === 4) l.shut();
    else l.push(new Int8Array(buf, 4));
  }

  function open(r) {
    return new Promise(function (resolve, reject) {
      var q = "?mode=" + r.mode + "&room=" + encodeURIComponent(r.room) + "&pass=" + encodeURIComponent(r.pass) +
        "&name=" + encodeURIComponent(r.name) + "&addr=" + me + "&net=" + encodeURIComponent(r.net || "auto");
      var s = new WebSocket(URL_ + q), ready = false;
      s.binaryType = "arraybuffer";
      s.onmessage = function (e) {
        if (ready && ws !== s) return;
        if (typeof e.data !== "string") return data(e.data);
        var m = JSON.parse(e.data);
        if (m.t === "hi") {
          ready = true;
          if (ws) {
            var old = ws;
            reset();
            old.close();
          }
          ws = s;
          ICE = config.btIce || m.ice || STUN;
          NET = m.net || "auto";
          me = m.addr;
          myName = m.name;
          room = r.mode === "create" ? { mode: "join", room: r.room, pass: r.pass, name: r.name, net: r.net } : r;
          resolve();
        } else if (m.t === "err") {
          ready = true;
          reject({
            notfound: tr("Комната не найдена", "Room not found"),
            badpass: tr("Неверный пароль", "Wrong password"),
            taken: tr("Комната с таким названием уже занята", "A room with this name already exists"),
            noturn: tr("TURN на сервере не настроен", "TURN is not configured on the server"),
            full: tr("Комната заполнена", "Room is full"),
            noname: tr("Введите название комнаты", "Enter a room name")
          }[m.msg] || m.msg);
        } else if (m.t === "peers") {
          peers = m.n;
          if (m.list) sync(m.list);
          show();
        } else {
          control(m);
        }
      };
      s.onclose = function () {
        if (ws === s) {
          reset();
          peers = 0;
          show();
        }
        if (!ready) {
          ready = true;
          reject(tr("Сервер недоступен", "Server unavailable"));
        }
      };
    });
  }

  function choose(msg) {
    return BtRoom.ask(room, msg, open);
  }

  function ensure() {
    if (ws) return Promise.resolve();
    if (!opening) {
      opening = (room ? open(room).catch(choose) : choose("")).then(function () {
        opening = null;
      }, function () {
        opening = null;
        throw 0;
      });
    }
    return opening;
  }

  BtRoom.onSwitch(function () {
    choose("").catch(function () {});
  });

  function request(m) {
    return ensure().then(function () {
      return new Promise(function (resolve) {
        m.q = ++seq;
        pending[m.q] = resolve;
        ws.send(JSON.stringify(m));
      });
    });
  }

  function keep(text) {
    results[++seq] = text;
    return seq;
  }

  Native[P + "init.()I"] = function () {
    if (ws) return 0;
    asyncImpl("I", ensure().then(function () { return 0; }, function () { return -1; }));
  };

  Native[P + "addr.()Ljava/lang/String;"] = function () {
    return J2ME.newString(me);
  };

  Native[P + "name.()Ljava/lang/String;"] = function () {
    return J2ME.newString(myName);
  };

  Native[P + "inquiry.()I"] = function () {
    asyncImpl("I", request({ t: "inq" }).then(function (m) {
      if (!m) return -1;
      return keep(m.devs.map(function (d) { return d.join("\t"); }).join("\n"));
    }, function () { return -1; }));
  };

  Native[P + "sdp.(Ljava/lang/String;)I"] = function (addr, devAddr) {
    asyncImpl("I", request({ t: "sdp", addr: str(devAddr) }).then(function (m) {
      if (!m || !m.recs) return -1;
      return keep(m.recs.map(function (r) { return r.join("\t"); }).join("\n"));
    }, function () { return -1; }));
  };

  Native[P + "result.(I)Ljava/lang/String;"] = function (addr, id) {
    var s = results[id];
    delete results[id];
    return J2ME.newString(s == null ? "" : s);
  };

  Native[P + "accept.(Ljava/lang/String;Ljava/lang/String;)I"] = function (addr, keyAddr, attrsAddr) {
    var key = str(keyAddr), attrs = str(attrsAddr);
    asyncImpl("I", ensure().then(function () {
      return new Promise(function (resolve) {
        accepts[key] = resolve;
        ws.send(JSON.stringify({ t: "reg", key: key, attrs: attrs }));
      });
    }, function () { return -1; }));
  };

  Native[P + "update.(Ljava/lang/String;Ljava/lang/String;)V"] = function (addr, keyAddr, attrsAddr) {
    var key = str(keyAddr);
    if (ws && accepts[key]) ws.send(JSON.stringify({ t: "reg", key: key, attrs: str(attrsAddr) }));
  };

  Native[P + "unreg.(Ljava/lang/String;)V"] = function (addr, keyAddr) {
    var key = str(keyAddr), take = accepts[key];
    if (ws) ws.send(JSON.stringify({ t: "unreg", key: key }));
    if (take) {
      delete accepts[key];
      take(-1);
    }
  };

  Native[P + "connect.(Ljava/lang/String;Ljava/lang/String;)I"] = function (addr, devAddr, keyAddr) {
    var dev = str(devAddr);
    asyncImpl("I", ensure().then(function () {
      return ready(dev);
    }).then(function (ok) {
      if (!ok && NET !== "auto") return -1;
      return request({ t: "conn", addr: dev, key: str(keyAddr) }).then(function (m) {
        if (!m) return -1;
        if (m.link > 0) new Link(m.link, dev, m.name);
        return m.link;
      });
    }).catch(function () { return -1; }));
  };

  Native[P + "peer.(I)Ljava/lang/String;"] = function (addr, id) {
    var l = links[id];
    return J2ME.newString(l ? l.peer + "\t" + l.name : "000000000000\t");
  };

  function frame(id, src) {
    var l = links[id], p = l && mesh[l.peer];
    var buf = new Int8Array(4 + src.length);
    new DataView(buf.buffer).setUint32(0, id);
    buf.set(src, 4);
    if (p && p.dc && p.dc.readyState === "open") p.dc.send(buf);
    else if (p && NET !== "auto") p.out.push(buf);
    else if (ws) ws.send(buf);
  }

  function flush(l) {
    var out = l.out;
    l.out = null;
    if (!out || l.closed) return;
    if (out.length === 1) return frame(l.id, out[0]);
    var all = new Int8Array(out.reduce(function (n, a) { return n + a.length; }, 0));
    out.reduce(function (n, a) {
      all.set(a, n);
      return n + a.length;
    }, 0);
    frame(l.id, all);
  }

  Native[P + "send.(I[BIIZ)I"] = function (addr, id, dataAddr, off, len, stream) {
    var l = links[id];
    var p = l && mesh[l.peer];
    if (!l || l.closed || !ws && !(p && p.dc)) return -1;
    if (!len) return 0;
    var src = J2ME.getArrayFromAddr(dataAddr).slice(off, off + len);
    if (!stream) {
      frame(id, src);
    } else if (l.out) {
      l.out.push(src);
    } else {
      l.out = [src];
      dirty.push(l);
    }
    return len;
  };

  J2ME.onSlice = function () {
    if (!dirty.length) return;
    var d = dirty;
    dirty = [];
    d.forEach(flush);
  };

  Native[P + "flush.(I)V"] = function (addr, id) {
    if (links[id]) flush(links[id]);
  };

  function take(l, dst, off, len, stream) {
    var n = 0;
    if (!stream) {
      var p = l.chunks.shift();
      n = Math.min(p.length, len);
      dst.set(p.subarray(0, n), off);
      l.len -= p.length;
      return n;
    }
    while (n < len && l.chunks.length) {
      var a = l.chunks[0], k = Math.min(a.length, len - n);
      dst.set(a.subarray(0, k), off + n);
      if (k === a.length) l.chunks.shift();
      else l.chunks[0] = a.subarray(k);
      n += k;
    }
    l.len -= n;
    return n;
  }

  Native[P + "recv.(I[BIIZ)I"] = function (addr, id, dataAddr, off, len, stream) {
    var l = links[id];
    if (!l) return -1;
    if (l.chunks.length) return take(l, J2ME.getArrayFromAddr(dataAddr), off, len, stream);
    if (l.closed) return -1;
    if (l.out) flush(l);
    asyncImpl("I", new Promise(function (resolve) {
      (function poll() {
        if (l.chunks.length) resolve(take(l, J2ME.getArrayFromAddr(dataAddr), off, len, stream));
        else if (l.closed) resolve(-1);
        else l.waits.push(poll);
      })();
    }));
  };

  Native[P + "avail.(IZ)I"] = function (addr, id, stream) {
    var l = links[id];
    if (!l) return -1;
    return stream ? l.len : l.chunks.length ? l.chunks[0].length || 1 : 0;
  };

  function close(l) {
    flush(l);
    var p = mesh[l.peer];
    if (p && p.dc && !l.closed) frame(l.id, new Int8Array(0));
    if (ws && !l.closed) ws.send(JSON.stringify({ t: "close", link: l.id }));
    delete links[l.id];
    l.shut();
    pace();
  }

  Native[P + "close.(I)V"] = function (addr, id) {
    if (links[id]) close(links[id]);
  };
})();
