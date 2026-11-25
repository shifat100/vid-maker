var ScreenSetup = (function () {
  var KNOWN = [];
  if (typeof Settings !== "undefined" && Settings.portrait) {
    Settings.portrait.forEach(function (p) {
      KNOWN.push(p[0] + "x" + p[1]);
      if (p[0] !== p[1]) KNOWN.push(p[1] + "x" + p[0]);
    });
  }
  if (KNOWN.indexOf("240x320") < 0) KNOWN.push("240x320");
  if (KNOWN.indexOf("320x240") < 0) KNOWN.push("320x240");

  var DIMS = {};
  KNOWN.forEach(function (k) {
    k.split("x").forEach(function (d) { DIMS[d] = true; });
  });

  var ATTRS = [
    ["Nokia-MIDlet-Original-Display-Size", 120],
    ["SEMC-Screen-Size", 110],
    ["MIDlet-Screen-Size", 100],
    ["MIDxlet-ScreenSize", 100],
    ["Nokia-MIDlet-Target-Display-Size", 60]
  ];
  var PAIRS = [
    ["LGE-MIDlet-Width", "LGE-MIDlet-Height"],
    ["MIDlet-ScreenWidth", "MIDlet-ScreenHeight"],
    ["MIDlet-Screen-Width", "MIDlet-Screen-Height"],
    ["Screen-Width", "Screen-Height"],
    ["Display-Width", "Display-Height"],
    ["ScreenWidth", "ScreenHeight"],
    ["Width", "Height"]
  ];
  var MODELS = [
    ["128x128", /(^|[^a-z0-9])(6230i?|6020|6021|6030|3100|2610|2626|7260)([^0-9]|$)/i],
    ["128x160", /(^|[^a-z0-9])(2600c|2630|2660|2680|2760|3110c?|3109|5070|5200|5300|6070|6080|6085|6101|6103|7070|7360|e398|v3[xi]?|s40v[12]|c3300k?)([^0-9a-z]|$)/i],
    ["176x208", /(^|[^a-z0-9])(3230|3250|6260|6600|6620|6630|6670|6680|6681|6682|7610|n70|n72|n90|s60v2)([^0-9]|$)/i],
    ["176x220", /(^|[^a-z0-9])(k300|k500|k508|k600|k610i?|k700i?|k750i?|w300|w550|w600|w700|w800i?|w810i?|d750|z520|z530|z550|z710|s700|j300)([^0-9]|$)/i],
    ["240x320", /(^|[^a-z0-9])(6300|6303|6500[cs]?|6120|6121|6124|6210|6220|6233|6234|6270|6280|6288|5300|5310|5610|5700|7500|7900|8600|n73|n76|n77|n78|n79|n81|n82|n85|n86|n95|n96|e50|e51|e52|e65|e66|k800i?|k810i?|k850i?|w580|w610|w660|w850|w880|w890|w910|w980|c702|c902|c905|t650|g502|s40v[3-6]|s60v3)([^0-9]|$)/i],
    ["320x240", /(^|[^a-z0-9])(e61i?|e62|e63|e71|e72|e5-00|e6-00|x3-02|c3-00|e73|qwerty)([^0-9]|$)/i],
    ["360x640", /(^|[^a-z0-9])(5800|5530|5230|5233|5235|5250|n97|x6|c5-03|c6|c7|n8|e7|e6|s60v5|s60\^3|anna|belle|u5i?|vivaz)([^0-9a-z]|$)/i],
    ["240x400", /(^|[^a-z0-9])(s5230|s5233|s5600|s7070|f480|gt-?s5230)([^0-9a-z]|$)/i],
    ["240x432", /(^|[^a-z0-9])(c510|w995|w705|w715)([^0-9]|$)/i],
    ["352x416", /(^|[^a-z0-9])(n93|n80|e60|e70|n92)([^0-9]|$)/i],
    ["240x320", /(^|[^a-z0-9])(sonye|sonyericsson|se)([^a-z0-9]|$)/i, 12]
  ];

  var result = null, observeTimer = 0, listeners = [];

  function isKaiOS() {
    return /\bKAIOS\b/i.test(navigator.userAgent || "");
  }

  function isTinyScreen() {
    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    return Math.min(w, h) <= 280 && Math.max(w, h) <= 360;
  }

  function isCompactUI() {
    return isKaiOS() || isTinyScreen();
  }

  function append(parent) {
    for (var i = 1; i < arguments.length; i++) {
      var child = arguments[i];
      if (child != null) parent.appendChild(child);
    }
    return parent;
  }

  function syncBodyClasses() {
    if (!document.body) return;
    document.body.classList.toggle("kaios-ui", isCompactUI());
    var hideKeypad = typeof config !== "undefined" && config && ((config.keypad | 0) === 0);
    document.body.classList.toggle("keypad-hidden", hideKeypad);
  }

  function applyCompactDefaults() {
    if (typeof config === "undefined" || !config) return;
    var hasCustomKeypad = false;
    try {
      var res = typeof Settings !== "undefined" && Settings.resolve ? Settings.resolve(config.gameId) : null;
      hasCustomKeypad = !!(res && res.own && res.own.keypad);
    } catch (e) {}

    if (isCompactUI() && !(config.urlLocked && config.urlLocked.keypad) && !hasCustomKeypad) {
      config.keypad = 0;
      var kp = document.getElementById("keypad");
      if (kp) kp.className = "keypad-0";
    }
    syncBodyClasses();
  }

  function add(map, size, score, why) {
    if (!size) return;
    var c = map[size] || (map[size] = { size: size, score: 0, reasons: [] });
    c.score += score;
    if (why && c.reasons.indexOf(why) < 0) c.reasons.push(why);
  }

  function sizeOf(text) {
    var m = /(?:^|\D)(\d{2,4})\s*[x×хX*]\s*(\d{2,4})(?!\d)/.exec(text || "") || /(?:^|\D)(\d{3})\s*[,_]\s*(\d{3})(?!\d)/.exec(text || "");
    if (!m) return null;
    var w = +m[1], h = +m[2];
    if (w < 64 || h < 64 || w > 1280 || h > 1280) return null;
    return w + "x" + h;
  }

  function fromManifest(mf, map) {
    var used = {};
    ATTRS.forEach(function (a) {
      if (mf[a[0]] == null) return;
      used[a[0]] = true;
      add(map, sizeOf(mf[a[0]]), a[1], "манифест: " + a[0] + ": " + mf[a[0]]);
    });
    PAIRS.forEach(function (p) {
      var w = parseInt(mf[p[0]], 10), h = parseInt(mf[p[1]], 10);
      if (w >= 64 && h >= 64 && w <= 1280 && h <= 1280) {
        add(map, w + "x" + h, 100, "манифест: " + p[0] + "/" + p[1]);
        used[p[0]] = used[p[1]] = true;
      }
    });
    Object.keys(mf).forEach(function (k) {
      if (used[k] || /^MIDlet-(Version|\d+)$/.test(k)) return;
      var s = /screen|display|resolution|lcd|size/i.test(k) && sizeOf(mf[k]);
      if (s) add(map, s, 70, "манифест: " + k + ": " + mf[k]);
    });
    ["MIDlet-Name", "MIDlet-Description", "MIDlet-Jar-URL", "MIDlet-Info-URL"].forEach(function (k) {
      var s = sizeOf(mf[k]);
      if (s) add(map, s, 40, "манифест: " + k);
    });
  }

  function fromName(name, mf, map) {
    var base = name.replace(/^.*[\/:]/, "").replace(/\.jar$/i, "");
    var s = sizeOf(base);
    if (s) add(map, s, 70, "имя файла: " + base);
    var text = base + " " + (mf["MIDlet-Name"] || "") + " " + (mf["MIDlet-Description"] || "");
    var hit = false;
    MODELS.forEach(function (m) {
      if (hit && m[2]) return;
      var r = m[1].exec(text);
      if (!r) return;
      hit = true;
      add(map, m[0], m[2] || 35, "модель телефона: " + r[2]);
    });
  }

  function u32be(b, i) {
    return (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
  }

  function scanImages(name, b, found) {
    for (var i = 0; i + 16 < b.length; i++) {
      if (b[i] === 0x49 && b[i + 1] === 0x48 && b[i + 2] === 0x44 && b[i + 3] === 0x52) {
        found.push([u32be(b, i + 4), u32be(b, i + 8), name]);
        i += 12;
      }
    }
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) found.push([b[6] | b[7] << 8, b[8] | b[9] << 8, name]);
    if (b[0] === 0xff && b[1] === 0xd8) {
      for (var p = 2; p + 9 < b.length;) {
        if (b[p] !== 0xff) break;
        var mk = b[p + 1], len = b[p + 2] << 8 | b[p + 3];
        if (mk >= 0xc0 && mk <= 0xc3) {
          found.push([b[p + 7] << 8 | b[p + 8], b[p + 5] << 8 | b[p + 6], name]);
          break;
        }
        p += 2 + len;
      }
    }
  }

  function fromImages(images, map) {
    var full = {};
    images.forEach(function (im) {
      var k = im[0] + "x" + im[1];
      if (KNOWN.indexOf(k) >= 0 && im[0] !== im[1] && im[0] >= 96 && !/icon|logo/i.test(im[2])) full[k] = (full[k] || 0) + 1;
    });
    Object.keys(full).forEach(function (k) {
      add(map, k, Math.min(25, full[k] * 10), "картинки на весь экран: " + full[k] + " шт. " + k.replace("x", "×"));
      var d = k.split("x"), dbl = d[0] * 2 + "x" + d[1] * 2;
      if (map[dbl]) add(map, dbl, Math.min(15, full[k] * 5), "фон " + k.replace("x", "×") + " растягивается вдвое");
    });
  }

  var LEN = (function () {
    var t = new Int8Array(256).fill(1);
    t[0x10] = 2; t[0x11] = 3; t[0x12] = 2; t[0x13] = 3; t[0x14] = 3;
    for (var i = 0x15; i <= 0x19; i++) t[i] = 2;
    for (i = 0x36; i <= 0x3a; i++) t[i] = 2;
    t[0x84] = 3;
    for (i = 0x99; i <= 0xa8; i++) t[i] = 3;
    t[0xa9] = 2; t[0xaa] = -1; t[0xab] = -1;
    for (i = 0xb2; i <= 0xb8; i++) t[i] = 3;
    t[0xb9] = 5; t[0xba] = 5; t[0xbb] = 3; t[0xbc] = 2; t[0xbd] = 3; t[0xc0] = 3; t[0xc1] = 3;
    t[0xc4] = -2; t[0xc5] = 4; t[0xc6] = 3; t[0xc7] = 3; t[0xc8] = 5; t[0xc9] = 5;
    return t;
  })();

  function scanClass(b, stat) {
    var v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (b.length < 10 || v.getUint32(0) !== 0xcafebabe) return;
    for (var c = 0; c < CANVAS.length; c++) {
      if (has(b, CANVAS[c])) {
        stat.canvas = true;
        break;
      }
    }
    var n = v.getUint16(8), p = 10, ints = [], utf = [];
    for (var i = 1; i < n; i++) {
      var tag = b[p++];
      switch (tag) {
        case 1: var l = v.getUint16(p); utf[i] = String.fromCharCode.apply(null, b.subarray(p + 2, p + 2 + Math.min(l, 32))); p += 2 + l; break;
        case 3: ints[i] = v.getInt32(p); p += 4; break;
        case 4: p += 4; break;
        case 5: case 6: p += 8; i++; break;
        case 7: case 8: case 16: case 19: case 20: p += 2; break;
        case 9: case 10: case 11: case 12: case 17: case 18: p += 4; break;
        case 15: p += 3; break;
        default: return;
      }
    }
    p += 6;
    p += 2 + 2 * v.getUint16(p);
    for (var kind = 0; kind < 2; kind++) {
      var count = v.getUint16(p);
      p += 2;
      for (var m = 0; m < count; m++) {
        var ac = v.getUint16(p + 6);
        p += 8;
        for (var a = 0; a < ac; a++) {
          var an = utf[v.getUint16(p)], al = v.getUint32(p + 2);
          if (an === "ConstantValue" && ints[v.getUint16(p + 6)] != null) push(stat, ints[v.getUint16(p + 6)], -100);
          if (an === "Code") walk(b, v, p + 6 + 8, v.getUint32(p + 10), ints, stat);
          p += 6 + al;
        }
      }
    }
  }

  var CANVAS = ["javax/microedition/lcdui/Canvas", "javax/microedition/lcdui/game/GameCanvas", "com/nokia/mid/ui/FullCanvas", "com/siemens/mp/color_game/GameCanvas", "com/motorola/game/GameScreen"].map(function (s) {
    return Array.prototype.map.call(s, function (ch) { return ch.charCodeAt(0); });
  });

  function has(b, pat) {
    var f = pat[0], n = pat.length;
    outer: for (var i = b.indexOf(f); i >= 0 && i + n <= b.length; i = b.indexOf(f, i + 1)) {
      for (var k = 1; k < n; k++) if (b[i + k] !== pat[k]) continue outer;
      return true;
    }
    return false;
  }

  function push(stat, val, at) {
    if (!DIMS[val]) return;
    stat.count[val] = (stat.count[val] || 0) + 1;
    var last = stat.last;
    if (last && at - last[1] <= 4 && at > 0) {
      var k = last[0] + "x" + val;
      if (KNOWN.indexOf(k) >= 0) stat.pair[k] = (stat.pair[k] || 0) + 1;
    }
    stat.last = [val, at];
  }

  function walk(b, v, start, len, ints, stat) {
    var end = start + len, pc = start, idx = 0;
    stat.last = null;
    while (pc < end) {
      var op = b[pc], l = LEN[op];
      idx++;
      if (op === 0x10) push(stat, (b[pc + 1] << 24) >> 24, idx);
      else if (op === 0x11) push(stat, v.getInt16(pc + 1), idx);
      else if (op === 0x12 && ints[b[pc + 1]] != null) push(stat, ints[b[pc + 1]], idx);
      else if (op === 0x13 && ints[v.getUint16(pc + 1)] != null) push(stat, ints[v.getUint16(pc + 1)], idx);
      if (l > 0) {
        pc += l;
        continue;
      }
      if (l === -2) {
        pc += b[pc + 1] === 0x84 ? 6 : 4;
        continue;
      }
      var q = start + ((pc - start + 4) & ~3);
      if (op === 0xaa) {
        var lo = v.getInt32(q + 4), hi = v.getInt32(q + 8);
        pc = q + 12 + 4 * (hi - lo + 1);
      } else {
        pc = q + 8 + 8 * v.getInt32(q + 4);
      }
      if (!(pc > start)) return;
    }
  }

  function fromCode(stat, map) {
    KNOWN.forEach(function (k) {
      var d = k.split("x"), cw = stat.count[d[0]] || 0, ch = stat.count[d[1]] || 0, pr = stat.pair[k] || 0;
      if (d[0] === d[1] || +d[0] < 120 || +d[1] < 120 || pr < 2) return;
      add(map, k, Math.min(60, pr * 10) + Math.min(10, Math.min(cw, ch)), "код игры: пары " + k.replace("x", "×") + " ×" + pr);
    });
  }

  function entry(zip, name) {
    try {
      return zip.read(name);
    } catch (e) {
      return null;
    }
  }

  function detect(jarName, buffer, mf) {
    var map = {}, images = [], stat = { count: {}, pair: {}, last: null }, budget = 24 << 20;
    fromManifest(mf, map);
    fromName(jarName, mf, map);
    var zip = new ZipFile(buffer, false);
    Object.keys(zip.directory || {}).forEach(function (name) {
      if (budget <= 0 || /\/$|^META-INF\//.test(name)) return;
      var e = zip.directory[name];
      if (e.uncompressed_len > 4 << 20) return;
      var data = entry(zip, name);
      if (!data) return;
      budget -= data.length;
      if (/\.class$/i.test(name)) scanClass(data, stat);
      else scanImages(name, data, images);
    });
    if (stat.canvas) {
      fromCode(stat, map);
      fromImages(images, map);
    }
    var list = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.score - a.score; });
    var top = list.length ? list[0].score : 0;
    list = list.filter(function (c, i) { return i === 0 || c.score >= 20 || c.score >= top * 0.3; }).slice(0, 4);
    var sure = top >= 60 ? "high" : top >= 25 ? "mid" : top > 0 ? "low" : "none";
    var adaptive = !stat.canvas;
    var touch = /true|yes/i.test(mf["MIDlet-Touch-Support"] || "") || /^no$/i.test(mf["Nokia-MIDlet-On-Screen-Keypad"] || "");
    return { best: sure === "high" || sure === "mid" ? list[0].size : null, sure: sure, candidates: list, touch: touch, adaptive: adaptive, images: images.length };
  }

  function emit() {
    listeners.forEach(function (fn) { fn(result); });
  }

  function fitDisplayContainer() {
    var container = document.getElementById("display-container");
    var display = document.getElementById("display");
    if (!container || !display) return;
    container.style.transform = "";
    container.style.transformOrigin = "center center";

    var scaleVal = typeof config !== "undefined" && config ? (parseFloat(config.scale) || 1) : 1;
    if (scaleVal > 1) return;

    var kp = document.getElementById("keypad");
    var kpH = kp && kp.offsetParent !== null ? kp.getBoundingClientRect().height : 0;
    var availW = window.innerWidth || 0;
    var availH = Math.max(80, (window.innerHeight || 0) - kpH);
    var rect = display.getBoundingClientRect();
    if (!availW || !availH || !rect.width || !rect.height) return;

    if (rect.width > availW + 1 || rect.height > availH + 1) {
      var fit = Math.min(availW / rect.width, availH / rect.height);
      if (fit < 1) {
        container.style.transform = "scale(" + fit.toFixed(4) + ")";
      }
    }
  }

  function refit() {
    syncBodyClasses();
    document.body.classList.toggle("fixed-screen", !!(typeof config !== "undefined" && config && config.screen));
    if (typeof MIDP !== "undefined") {
      if (MIDP.updatePhysicalScreenSize) MIDP.updatePhysicalScreenSize();
      if (MIDP.updateCanvas) MIDP.updateCanvas();
    }
    fitDisplayContainer();
    window.dispatchEvent(new Event("resize"));
  }

  function current() {
    if (config.screenMode === "manual") return config.screen;
    if (config.screenMode === "fit") return "";
    if (result && result.best) return result.best;
    if (result && result.adaptive && window.innerWidth > window.innerHeight && isCompactUI()) {
      return "320x240";
    }
    return "240x320";
  }

  function apply() {
    config.screen = current();
    refit();
  }

  function jarLoaded(jarName, buffer) {
    var t = performance.now();
    try {
      result = detect(jarName, buffer, MIDP.manifest || {});
    } catch (e) {
      console.warn("screen detect failed", e);
      result = { best: null, candidates: [], touch: false };
    }
    result.ms = Math.round(performance.now() - t);
    result.name = (MIDP.manifest || {})["MIDlet-Name"] || "";
    if (config.screenMode === "auto") apply();
    emit();
  }

  function sample() {
    var cv = document.getElementById("canvas");
    var w = cv.width, h = cv.height;
    if (w < 80 || h < 80) return null;
    var d;
    try {
      var t = document.createElement("canvas");
      t.width = w;
      t.height = h;
      var tc = t.getContext("2d", { willReadFrequently: true });
      tc.drawImage(cv, 0, 0);
      d = tc.getImageData(0, 0, w, h).data;
    } catch (e) {
      return null;
    }
    var bg = (h * w - 1) * 4, br = d[bg], bgG = d[bg + 1], bb = d[bg + 2];
    var maxX = -1, maxY = -1, minX = w, minY = h;
    for (var y = 0; y < h; y += 1) {
      var row = y * w * 4;
      for (var x = 0; x < w; x += 1) {
        var i = row + x * 4;
        if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bb) > 24) {
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return [minX, minY, maxX + 1, maxY + 1, w, h];
  }

  function nearest(w, h) {
    var best = null;
    KNOWN.forEach(function (k) {
      var d = k.split("x"), dw = Math.abs(d[0] - w), dh = Math.abs(d[1] - h);
      if (dw <= 2 && dh <= 2 && (!best || dw + dh < best[1])) best = [k, dw + dh];
    });
    return best && best[0];
  }

  function observe() {
    if (config.screenMode === "manual") return;
    var hits = {}, n = 0, delays = [3000, 5000, 8000, 12000, 18000];
    function tick() {
      var s = sample();
      if (s && s[0] <= 2 && s[1] <= 2 && (s[2] < s[4] * 0.92 || s[3] < s[5] * 0.92)) {
        var k = nearest(s[2], s[3]);
        if (k) hits[k] = (hits[k] || 0) + 1;
      }
      n++;
      var top = Object.keys(hits).sort(function (a, b) { return hits[b] - hits[a]; })[0];
      if (top && hits[top] >= 2) {
        if (result) {
          result.observed = top;
          emit();
        }
        hint(top);
        return;
      }
      if (n < delays.length) observeTimer = setTimeout(tick, delays[n] - delays[n - 1]);
    }
    observeTimer = setTimeout(tick, delays[0]);
  }

  function hint(size) {
    var key = "j2me.hint." + config.gameId;
    try {
      if (localStorage.getItem(key) === size) return;
    } catch (e) {}
    var bar = document.createElement("div");
    bar.className = "screen-hint";
    var text = document.createElement("span");
    text.textContent = tr("Игра рисует только в углу " + size.replace("x", "×") + ". Поставить этот размер?", "The game only draws in a " + size.replace("x", "×") + " corner. Use this size?");
    var yes = document.createElement("button");
    yes.type = "button";
    yes.textContent = tr("Поставить", "Apply");
    var no = document.createElement("button");
    no.type = "button";
    no.className = "ghost";
    no.textContent = tr("Не надо", "No");
    append(bar, text, yes, no);
    document.body.appendChild(bar);
    yes.addEventListener("click", function () {
      Settings.setGame(config.gameId, "screen", size);
      location.reload();
    });
    no.addEventListener("click", function () {
      try {
        localStorage.setItem(key, size);
      } catch (e) {}
      bar.remove();
    });
  }

  applyCompactDefaults();
  window.addEventListener("resize", function () {
    syncBodyClasses();
    fitDisplayContainer();
  });

  return {
    detect: detect,
    jarLoaded: jarLoaded,
    started: function () {
      ScreenSetup.running = true;
      fitDisplayContainer();
      observe();
    },
    apply: apply,
    current: current,
    refit: refit,
    result: function () { return result; },
    onChange: function (fn) { listeners.push(fn); },
    isKaiOS: isKaiOS,
    isCompact: isCompactUI,
    running: false
  };
})();