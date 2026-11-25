(function () {
  var cv = document.getElementById("canvas");
  if (!cv || typeof Native === "undefined" || typeof MIDP === "undefined" || !MIDP.sendKeyPress) {
    return;
  }

  var MENU_LABEL = tr("Меню", "Menu");
  var K = config.keys;
  var UP = K.up, DOWN = K.down, LEFT = K.left, RIGHT = K.right, FIRE = K.ok, SOFT_L = K.soft1, SOFT_R = K.soft2;
  var NEGATIVE = { 2: 1, 3: 1, 6: 1, 7: 1 };
  var EXCLUSIVE = 1, MULTIPLE = 2, IMPLICIT = 3, POPUP = 4;

  var peers = new Map();
  var nextId = 1;
  var active = null;
  var picker = null;
  var lastDir = 1;
  var softL = null, softR = null, menuCmds = [];
  var eaten = {};

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  var host = el("div", "lc-host");
  cv.parentNode.insertBefore(host, cv);
  host.appendChild(cv);
  var root = el("div", "lc-ui lc-root");
  root.style.display = "none";
  host.appendChild(root);
  var bar = el("div", "lc-softbar");
  var barL = el("button", "lc-soft lc-soft-l");
  var barR = el("button", "lc-soft lc-soft-r");
  bar.appendChild(barL);
  bar.appendChild(barR);
  bar.style.display = "none";
  host.appendChild(bar);
  var BAR_HEIGHT = 30;
  var barShown = false;
  var pageScroll = null;
  var editors = document.getElementById("editor-layer") || el("div");
  editors.className = "lc-editors";
  host.appendChild(editors);
  Array.prototype.forEach.call(editors.children, function (ed) {
    function guard(e) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") e.stopPropagation();
    }
    ed.addEventListener("keydown", guard);
    ed.addEventListener("keyup", guard);
  });
  var meter = el("div", "lc-ui lc-measure");
  document.body.appendChild(meter);

  function onTap(node, fn) {
    var start = null;
    node.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      start = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    node.addEventListener("pointerup", function (e) {
      var s = start;
      start = null;
      if (!s || s.id !== e.pointerId || Math.abs(e.clientX - s.x) + Math.abs(e.clientY - s.y) > 12) return;
      e.stopPropagation();
      fn(e);
    });
    node.addEventListener("pointercancel", function () {
      start = null;
    });
  }

  onTap(barL, function () { soft(SOFT_L); });
  onTap(barR, function () { soft(SOFT_R); });

  root.addEventListener("focusin", function () {
    if (!pageScroll) pageScroll = [window.scrollX, window.scrollY];
  });

  root.addEventListener("focusout", function () {
    var p = pageScroll;
    pageScroll = null;
    root.scrollTop = 0;
    root.scrollLeft = 0;
    if (p) window.scrollTo(p[0], p[1]);
  });

  function baseFont() {
    return config.fontSize ? +config.fontSize : Math.max(19, cv.height / 35 | 0);
  }

  function fontCss(face, style, size) {
    var b = baseFont();
    var px = (size & 8 ? b / 1.25 : size & 16 ? b * 1.25 : b) | 0;
    var st = style & 1 ? "bold " : style & 2 ? "italic " : "";
    var f = face & 32 ? "monospace" : face & 64 ? "sans-serif" : "Arial,Helvetica,sans-serif";
    return st + px + "px " + f;
  }

  function fontOf(addr) {
    var ctx = addr ? NativeMap.get(addr) : null;
    return ctx && ctx.font ? ctx.font : "";
  }

  function fit() {
    var w = cv.width, h = cv.height;
    var sx = cv.clientWidth / w || 1, sy = cv.clientHeight / h || 1;
    var fs = baseFont() + "px";
    root.style.width = w + "px";
    root.style.height = h + "px";
    root.style.left = cv.offsetLeft + cv.clientLeft + "px";
    root.style.top = cv.offsetTop + cv.clientTop + "px";
    root.style.transform = "scale(" + sx + "," + sy + ")";
    bar.style.width = cv.offsetWidth + "px";
    editors.style.width = w + "px";
    editors.style.height = h + "px";
    editors.style.left = root.style.left;
    editors.style.top = root.style.top;
    editors.style.transform = root.style.transform;
    root.style.fontSize = fs;
    meter.style.fontSize = fs;
  }

  cv.addEventListener("canvasresize", fit);
  window.addEventListener("resize", fit);

  function str(addr) {
    return J2ME.fromStringAddr(addr);
  }

  var offsets = {};

  function off(addr, name, sig) {
    var cid = i32[addr >> 2], key = cid + "." + name;
    if (!(key in offsets)) {
      var f = J2ME.classIdToClassInfoMap[cid].getFieldByName(J2ME.toUTF8(name), J2ME.toUTF8(sig), false);
      offsets[key] = f.byteOffset;
    }
    return addr + offsets[key] >> 2;
  }

  function get(addr, name, sig) {
    return i32[off(addr, name, sig)];
  }

  function put(addr, name, sig, v) {
    i32[off(addr, name, sig)] = v;
  }

  var S = "Ljava/lang/String;";

  function add(p) {
    p.id = nextId++;
    peers.set(p.id, p);
    return p;
  }

  function send(type, id, hint) {
    var p = peers.get(id);
    var scr = p && (p.owner || p);
    MIDP.sendNativeEventToForeground({
      type: 8,
      intParam1: scr && scr.version | 0,
      intParam2: type,
      intParam3: id,
      intParam5: hint | 0
    }, true);
  }

  function imgCanvas(addr) {
    var ci = addr ? NativeMap.get(addr) : null;
    if (!ci || !ci.context) return null;
    var s = ci.context.canvas;
    var c = el("canvas", "lc-img");
    c.width = s.width;
    c.height = s.height;
    if (s.width && s.height) c.getContext("2d").drawImage(s, 0, 0);
    return c;
  }

  function reveal(box, child, top) {
    var t = top === undefined ? child.offsetTop : top;
    var b = t + child.offsetHeight;
    if (t < box.scrollTop) box.scrollTop = t;
    else if (b > box.scrollTop + box.clientHeight) box.scrollTop = b - box.clientHeight;
  }

  function updateRoot() {
    var screen = !!(active && active.el);
    var show = screen || !!(softL || softR);
    root.style.display = screen || picker ? "" : "none";
    bar.style.display = show ? "" : "none";
    if (show !== barShown) {
      barShown = show;
      if (config.screen) {
        MIDP.updatePhysicalScreenSize();
        MIDP.updateCanvas();
        fit();
      }
    }
  }

  MIDP.softbarHeight = function () {
    return !config.screen || barShown ? BAR_HEIGHT : 0;
  };

  function setActive(p) {
    if (active !== p) closePicker();
    active = p;
    peers.forEach(function (q) {
      if (q.screen && q.el) q.el.style.display = q === p ? "" : "none";
    });
    updateRoot();
    fit();
  }

  function setTitle(p, text) {
    p.ttl.textContent = text || "";
    p.ttl.style.display = text ? "" : "none";
  }

  function setTicker(p, text) {
    if (!p.tick) return;
    p.tick.textContent = "";
    p.tick.style.display = text ? "" : "none";
    if (text) {
      var s = el("span", "lc-tick-text");
      s.textContent = text;
      s.style.animationDuration = Math.max(4, text.length / 4) + "s";
      p.tick.appendChild(s);
    }
  }

  function newForm(title, ticker) {
    var p = add({ kind: "form", screen: true, scrollY: 0, focus: 0, version: 0 });
    p.el = el("div", "lc-form");
    p.ttl = el("div", "lc-title");
    p.tick = el("div", "lc-ticker");
    p.vp = el("div", "lc-viewport");
    p.ct = el("div", "lc-content");
    p.vp.appendChild(p.ct);
    p.el.appendChild(p.ttl);
    p.el.appendChild(p.tick);
    p.el.appendChild(p.vp);
    p.el.style.display = "none";
    root.appendChild(p.el);
    setTitle(p, title);
    setTicker(p, ticker);
    p.vp.addEventListener("scroll", function () {
      var y = Math.round(p.vp.scrollTop);
      if (y !== p.scrollY) {
        p.scrollY = y;
        send(1, p.id, y);
      }
    });
    return p;
  }

  function formOf(addr) {
    var p = peers.get(get(addr, "nativeId", "I"));
    return p && p.kind === "form" ? p : null;
  }

  function newAlert(title, ticker) {
    var p = add({ kind: "alert", screen: true, version: 0 });
    p.el = el("div", "lc-alert");
    p.dlg = el("div", "lc-dlg");
    p.ttl = el("div", "lc-dlg-title");
    p.tick = el("div", "lc-ticker");
    p.img = el("div", "lc-dlg-img");
    p.txt = el("div", "lc-dlg-text");
    p.slot = el("div", "lc-dlg-gauge");
    [p.ttl, p.tick, p.img, p.txt, p.slot].forEach(function (c) { p.dlg.appendChild(c); });
    p.el.appendChild(p.dlg);
    p.el.style.display = "none";
    root.appendChild(p.el);
    setTitle(p, title);
    setTicker(p, ticker);
    return p;
  }

  function newItem(kind, ownerId, label, layout) {
    var o = peers.get(ownerId) || null;
    var p = add({ kind: kind, owner: o && o.screen ? o : null, full: layout === -1 });
    p.el = el("div", "lc-item lc-k-" + kind + (p.full ? " lc-full" : ""));
    p.lab = el("div", "lc-label");
    p.body = el("div", "lc-body");
    p.el.appendChild(p.lab);
    p.el.appendChild(p.body);
    p.el.style.display = "none";
    setLabel(p, label);
    if (p.owner) (p.owner.kind === "alert" ? p.owner.slot : p.owner.ct).appendChild(p.el);
    onTap(p.el, function () { focusByUser(p); });
    return p;
  }

  function setLabel(p, label) {
    p.lab.textContent = label || "";
    p.el.classList.toggle("lc-nolabel", !label);
  }

  function setFocus(p) {
    var form = p.owner;
    if (!form || form.kind !== "form") return;
    var old = peers.get(form.focus);
    if (old === p) return;
    if (old) {
      old.el.classList.remove("lc-focus");
      if (old.el.contains(document.activeElement)) document.activeElement.blur();
    }
    form.focus = p.id;
    p.el.classList.add("lc-focus");
    if (p.onFocus) p.onFocus();
  }

  function focusByUser(p) {
    if (!p.focusable || !p.owner || p.owner.kind !== "form" || p.owner.focus === p.id) return;
    setFocus(p);
    send(0, p.id, 0);
  }

  function measure(p, w) {
    var c = p.el.cloneNode(true);
    c.style.cssText = "";
    c.classList.remove("lc-focus");
    c.style.width = w > 0 ? w + "px" : "max-content";
    meter.appendChild(c);
    var r = [c.offsetWidth, c.offsetHeight];
    meter.removeChild(c);
    return r;
  }

  function prefW(p) {
    var W = cv.width;
    return p.wide || p.full ? W : Math.min(W, measure(p, -1)[0] + 1);
  }

  function minW(p) {
    return p.wide || p.full ? (cv.width / 2 | 0) : Math.min(prefW(p), baseFont() * 3);
  }

  function prefH(p, w) {
    return measure(p, w > 0 ? w : prefW(p))[1];
  }

  function dcaBuffer(addr) {
    return get(addr, "buffer", "[C");
  }

  function readDca(addr) {
    return J2ME.fromJavaChars(dcaBuffer(addr), 0, get(addr, "length", "I"));
  }

  function writeDca(addr, s) {
    var a = J2ME.getArrayFromAddr(dcaBuffer(addr));
    var n = Math.min(s.length, a.length);
    for (var i = 0; i < n; i++) a[i] = s.charCodeAt(i);
    put(addr, "length", "I", n);
  }

  function openPicker(title, labels, idx, done) {
    closePicker();
    var pk = { i: Math.max(0, Math.min(idx, labels.length - 1)), n: labels.length, done: done, rows: [] };
    pk.el = el("div", "lc-picker");
    var box = el("div", "lc-pk-box");
    if (title) {
      var t = el("div", "lc-pk-title");
      t.textContent = title;
      box.appendChild(t);
    }
    pk.list = el("div", "lc-pk-list");
    labels.forEach(function (s, i) {
      var r = el("div", "lc-pk-row");
      r.textContent = s;
      onTap(r, function () { pick(i); });
      pk.rows.push(r);
      pk.list.appendChild(r);
    });
    box.appendChild(pk.list);
    pk.el.appendChild(box);
    onTap(pk.el, function (e) {
      if (e.target === pk.el) closePicker();
    });
    root.appendChild(pk.el);
    picker = pk;
    updateRoot();
    fit();
    hiPicker();
  }

  function hiPicker() {
    picker.rows.forEach(function (r, i) { r.classList.toggle("lc-hi", i === picker.i); });
    if (picker.rows[picker.i]) reveal(picker.list, picker.rows[picker.i]);
  }

  function pick(i) {
    var d = picker.done;
    closePicker();
    d(i);
  }

  function closePicker() {
    if (!picker) return;
    root.removeChild(picker.el);
    picker = null;
    updateRoot();
  }

  function pickerKey(k) {
    if (k === UP || k === DOWN) {
      picker.i = (picker.i + (k === UP ? -1 : 1) + picker.n) % picker.n;
      hiPicker();
    } else if (k === FIRE || k === SOFT_L) {
      if (picker.n) pick(picker.i);
    } else if (k === SOFT_R) {
      closePicker();
    }
  }

  function soft(k) {
    if (picker) {
      pickerKey(k);
      return true;
    }
    var a = k === SOFT_L ? softL : softR;
    if (!a) return false;
    a.run();
    return true;
  }

  function command(c) {
    return { label: c.label, run: function () { MIDP.sendCommandEvent(c.id); } };
  }

  function openMenu() {
    if (!menuCmds.length) return;
    openPicker(MENU_LABEL, menuCmds.map(function (c) { return c.long || c.label; }), 0, function (i) {
      MIDP.sendCommandEvent(menuCmds[i].id);
    });
  }

  function cmdList(addr, n) {
    var out = [];
    if (!addr) return out;
    var a = Array.prototype.slice.call(J2ME.getArrayFromAddr(addr), 0, n);
    a.forEach(function (c) {
      if (!c) return;
      out.push({
        id: get(c, "id", "I"),
        type: get(c, "commandType", "I"),
        prio: get(c, "priority", "I"),
        label: str(get(c, "shortLabel", S)) || "",
        long: str(get(c, "longLabel", S))
      });
    });
    return out;
  }

  function setCommands(all) {
    all = all.map(function (c, i) { c.ord = i; return c; }).sort(function (a, b) {
      return a.prio - b.prio || a.ord - b.ord;
    });
    var neg = null;
    all.forEach(function (c) { if (!neg && NEGATIVE[c.type]) neg = c; });
    var rest = all.filter(function (c) { return c !== neg; });
    menuCmds = rest;
    softR = neg ? command(neg) : null;
    softL = null;
    if (rest.length === 1 || (rest.length === 2 && !neg)) {
      softL = command(rest[0]);
      if (rest.length === 2) softR = command(rest[1]);
    } else if (rest.length) {
      softL = { label: MENU_LABEL, run: openMenu };
    }
    barL.textContent = softL ? softL.label : "";
    barR.textContent = softR ? softR.label : "";
    barL.style.visibility = softL ? "" : "hidden";
    barR.style.visibility = softR ? "" : "hidden";
    updateRoot();
    fit();
  }

  function onKey(k) {
    if (picker) {
      pickerKey(k);
      return true;
    }
    if (k === SOFT_L || k === SOFT_R) return soft(k);
    if (active && active.kind === "alert") {
      var a = softL || softR;
      if (k === FIRE && a) {
        a.run();
        return true;
      }
      return false;
    }
    if (active && active.kind === "form") {
      var it = peers.get(active.focus);
      if (it && it.key && it.key(k)) return true;
    }
    if (k === UP || k === LEFT) lastDir = -1;
    else if (k === DOWN || k === RIGHT) lastDir = 1;
    return false;
  }

  var press = MIDP.sendKeyPress, release = MIDP.sendKeyRelease, repeat = MIDP.sendKeyRepeat;
  MIDP.sendKeyPress = function (k) {
    if (onKey(k)) {
      eaten[k] = 1;
      return;
    }
    press(k);
  };
  MIDP.sendKeyRepeat = function (k) {
    if (!eaten[k]) return repeat(k);
    if (k === SOFT_L || k === SOFT_R || k === FIRE || onKey(k)) return;
    delete eaten[k];
    press(k);
  };
  MIDP.sendKeyRelease = function (k) {
    if (eaten[k]) {
      delete eaten[k];
      return;
    }
    release(k);
  };

  function cgEl(addr) {
    return {
      t: str(get(addr, "stringEl", S)) || "",
      img: imgCanvas(get(addr, "imageDataEl", "Ljavax/microedition/lcdui/ImageData;")),
      sel: !!get(addr, "selected", "Z"),
      font: fontOf(get(addr, "fontEl", "Ljavax/microedition/lcdui/Font;"))
    };
  }

  function selIndex(p) {
    for (var i = 0; i < p.els.length; i++) if (p.els[i].sel) return i;
    return -1;
  }

  function setSel(p, i) {
    p.els.forEach(function (e, j) { e.sel = j === i; });
  }

  function renderChoice(p) {
    p.body.textContent = "";
    p.rows = [];
    p.el.classList.toggle("lc-t" + p.type, true);
    if (p.type === POPUP) {
      var s = selIndex(p);
      var b = el("div", "lc-pop");
      b.textContent = s >= 0 ? p.els[s].t : "";
      if (s >= 0 && p.els[s].font) b.style.font = p.els[s].font;
      onTap(b, function () { openPop(p); });
      p.body.appendChild(b);
      return;
    }
    p.els.forEach(function (e, i) {
      var r = el("div", "lc-opt" + (e.sel ? " lc-on" : "") + (i === p.hi ? " lc-hi" : ""));
      r.appendChild(el("span", "lc-mark"));
      if (e.img) r.appendChild(e.img);
      var t = el("span", "lc-opt-text");
      t.textContent = e.t;
      if (e.font) t.style.font = e.font;
      r.appendChild(t);
      onTap(r, function () {
        focusByUser(p);
        p.hi = i;
        act(p, i);
      });
      p.rows.push(r);
      p.body.appendChild(r);
    });
  }

  function hiChoice(p) {
    p.rows.forEach(function (r, i) {
      r.classList.toggle("lc-hi", i === p.hi);
      r.classList.toggle("lc-on", p.els[i].sel);
    });
    var r = p.rows[p.hi];
    if (r && p.owner && p.owner.vp && p.el.parentNode) reveal(p.owner.vp, r, p.el.offsetTop + r.offsetTop);
  }

  function act(p, i) {
    if (p.type === MULTIPLE) p.els[i].sel = !p.els[i].sel;
    else if (p.type === EXCLUSIVE && p.els[i].sel) {
      hiChoice(p);
      return;
    } else setSel(p, i);
    hiChoice(p);
    send(2, p.id, i);
  }

  function openPop(p) {
    focusByUser(p);
    if (!p.els.length) return;
    openPicker(p.lab.textContent, p.els.map(function (e) { return e.t; }), selIndex(p), function (i) {
      setSel(p, i);
      renderChoice(p);
      send(2, p.id, i);
    });
  }

  function choiceKey(k) {
    var p = this, n = p.els.length;
    if (p.type === POPUP) {
      if (k !== FIRE) return false;
      openPop(p);
      return true;
    }
    if ((k === UP && p.hi > 0) || (k === DOWN && p.hi < n - 1)) {
      p.hi += k === UP ? -1 : 1;
      if (p.type === IMPLICIT) setSel(p, p.hi);
      hiChoice(p);
      return true;
    }
    if (k === FIRE && n) {
      act(p, p.hi);
      return true;
    }
    return false;
  }

  function choiceFocus() {
    var p = this, n = p.els.length;
    if (p.type === POPUP) return;
    var s = selIndex(p);
    p.hi = p.type === IMPLICIT && s >= 0 ? s : lastDir < 0 ? n - 1 : 0;
    hiChoice(p);
  }

  var CONS_TYPE = { 1: "email", 3: "tel", 4: "url" };
  var CONS_MODE = { 2: "numeric", 3: "tel", 5: "decimal" };
  var CONS_FILTER = { 2: /[^0-9-]/g, 3: /[^0-9+*#pw ]/g, 5: /[^0-9.-]/g };

  function applyCons(p, c) {
    var base = c & 0xffff, inp = p.inp;
    p.filter = CONS_FILTER[base] || null;
    if (!p.full) inp.type = c & 0x10000 ? "password" : CONS_TYPE[base] || "text";
    inp.inputMode = CONS_MODE[base] || "text";
    inp.readOnly = !!(c & 0x20000);
    inp.autocapitalize = c & 0x100000 ? "words" : c & 0x200000 ? "sentences" : "off";
  }

  function newText(ownerId, label, layout, dca, cons) {
    var p = newItem("text", ownerId, label, layout);
    p.wide = true;
    p.focusable = true;
    p.inp = el(p.full ? "textarea" : "input", "lc-input");
    p.inp.maxLength = J2ME.getArrayFromAddr(dcaBuffer(dca)).length;
    p.inp.value = readDca(dca);
    applyCons(p, cons);
    p.body.appendChild(p.inp);
    p.inp.addEventListener("input", function () {
      if (p.filter) {
        var v = p.inp.value.replace(p.filter, "");
        if (v !== p.inp.value) p.inp.value = v;
      }
      send(2, p.id, 0);
    });
    function guard(e) {
      if (e.key === "Escape" || (!p.full && e.key === "Enter")) {
        if (e.type === "keydown") p.inp.blur();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (p.full || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) e.stopPropagation();
    }
    p.inp.addEventListener("keydown", guard);
    p.inp.addEventListener("keyup", guard);
    p.inp.addEventListener("focus", function () { focusByUser(p); });
    p.key = function (k) {
      if (k !== FIRE) return false;
      p.inp.focus();
      return true;
    };
    p.onFocus = function () {
      if (p.full) p.inp.focus();
    };
    return p;
  }

  function setStringContent(p, text, mode) {
    p.mode = mode;
    p.txt.textContent = text || "";
    p.focusable = mode > 0;
    p.el.classList.toggle("lc-link", mode === 1);
    p.el.classList.toggle("lc-button", mode === 2);
  }

  function activatable(p) {
    onTap(p.body, function () {
      focusByUser(p);
      if (p.mode > 0) send(2, p.id, -1);
    });
    p.key = function (k) {
      if (k !== FIRE || !(p.mode > 0)) return false;
      send(2, p.id, -1);
      return true;
    };
  }

  function setImageContent(p, img, alt, mode) {
    p.body.textContent = "";
    var c = imgCanvas(img);
    if (c) p.body.appendChild(c);
    else {
      p.txt = el("span", "lc-text");
      p.txt.textContent = alt || "";
      p.body.appendChild(p.txt);
    }
    p.mode = mode;
    p.focusable = mode > 0;
    p.el.classList.toggle("lc-link", mode === 1);
    p.el.classList.toggle("lc-button", mode === 2);
  }

  function setGauge(p, v, max) {
    p.val = v;
    p.max = max;
    if (p.inter) {
      p.ctl.max = Math.max(max, 0);
      p.ctl.value = v;
    } else if (max < 0) {
      p.ctl.max = 1;
      if (v === 2 || v === 3) p.ctl.removeAttribute("value");
      else p.ctl.value = 0;
    } else {
      p.ctl.max = max || 1;
      p.ctl.value = v;
    }
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  var DATE_TYPE = { 1: "date", 2: "time", 3: "datetime-local" };

  function dateFormat(ms, mode) {
    if (!ms) return "";
    var d = new Date(ms);
    var ds = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    var ts = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    return mode === 1 ? ds : mode === 2 ? ts : ds + "T" + ts;
  }

  function dateParse(v, mode) {
    if (!v) return 0;
    if (mode === 2) v = "1970-01-01T" + v;
    else if (mode === 1) v += "T00:00";
    return new Date(v).getTime() || 0;
  }

  function setDateMode(p, mode) {
    var ms = p.inp.value ? dateParse(p.inp.value, p.mode) : 0;
    p.mode = mode;
    p.inp.type = DATE_TYPE[mode] || "datetime-local";
    p.inp.value = dateFormat(ms, mode);
  }

  var L = "javax/microedition/lcdui/";

  Native[L + "DisplayableLFImpl.initialize0.()V"] = function () {};
  Native[L + "DisplayableLFImpl.finalize.()V"] = function () {};

  Native[L + "DisplayableLFImpl.deleteNativeResource0.(I)V"] = function (addr, id) {
    var p = peers.get(id);
    if (!p) return;
    peers.delete(id);
    if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    if (active === p) {
      active = null;
      closePicker();
      updateRoot();
    }
  };

  Native[L + "DisplayableLFImpl.setTitle0.(ILjava/lang/String;)V"] = function (addr, id, titleAddr) {
    var p = peers.get(id);
    if (p && p.ttl) setTitle(p, str(titleAddr));
  };

  Native[L + "Display.setTitle.(Ljava/lang/String;)V"] = function () {};

  Native[L + "DisplayableLFImpl.setTicker0.(ILjava/lang/String;)V"] = function (addr, id, textAddr) {
    var p = peers.get(id);
    if (p) setTicker(p, str(textAddr));
  };

  Native[L + "CanvasLFImpl.createNativeResource0.(Ljava/lang/String;Ljava/lang/String;)I"] = function () {
    var p = add({ kind: "canvas", screen: true });
    setActive(p);
    return p.id;
  };

  Native[L + "FormLFImpl.createNativeResource0.(Ljava/lang/String;Ljava/lang/String;)I"] = function (addr, titleAddr, tickerAddr) {
    return newForm(str(titleAddr), str(tickerAddr)).id;
  };

  Native[L + "FormLFImpl.showNativeResource0.(IIII)V"] = function (addr, id, version, w, h) {
    var p = peers.get(id);
    if (!p) return;
    p.version = version;
    p.ct.style.height = h + "px";
    setActive(p);
    p.vp.scrollTop = p.scrollY;
  };

  Native[L + "FormLFImpl.getViewportHeight0.()I"] = function (addr) {
    var p = formOf(addr);
    if (!p) return cv.height;
    return p.vp.clientHeight || cv.height - p.ttl.offsetHeight - p.tick.offsetHeight;
  };

  Native[L + "FormLFImpl.getScrollPosition0.()I"] = function (addr) {
    var p = formOf(addr);
    return p ? p.scrollY : 0;
  };

  Native[L + "FormLFImpl.setScrollPosition0.(I)V"] = function (addr, y) {
    var p = formOf(addr);
    if (!p) return;
    p.scrollY = Math.max(0, y);
    p.vp.scrollTop = p.scrollY;
  };

  Native[L + "FormLFImpl.setCurrentItem0.(III)V"] = function (addr, formId, itemId) {
    var p = peers.get(itemId);
    if (p) setFocus(p);
  };

  Native[L + "AlertLFImpl.createNativeResource0.(Ljava/lang/String;Ljava/lang/String;I)I"] = function (addr, titleAddr, tickerAddr) {
    return newAlert(str(titleAddr), str(tickerAddr)).id;
  };

  Native[L + "AlertLFImpl.setNativeContents0.(ILjavax/microedition/lcdui/ImageData;[ILjava/lang/String;)Z"] = function (addr, id, imgAddr, boundsAddr, textAddr) {
    var p = peers.get(id);
    if (!p) return 0;
    p.img.textContent = "";
    var c = imgCanvas(imgAddr);
    if (c) p.img.appendChild(c);
    p.img.style.display = c ? "" : "none";
    p.txt.textContent = str(textAddr) || "";
    if (boundsAddr) {
      var b = J2ME.getArrayFromAddr(boundsAddr);
      b[0] = 0;
      b[1] = 0;
    }
    var d = p.dlg.cloneNode(true);
    d.style.width = (cv.width * 0.85 | 0) + "px";
    meter.appendChild(d);
    var tall = d.offsetHeight > cv.height * 0.85;
    meter.removeChild(d);
    return tall ? 1 : 0;
  };

  Native[L + "AlertLFImpl.showNativeResource0.(I)V"] = function (addr, id) {
    var p = peers.get(id);
    if (p) setActive(p);
  };

  Native[L + "ItemLFImpl.show0.(I)V"] = function (addr, id) {
    var p = peers.get(id);
    if (p) p.el.style.display = "";
  };

  Native[L + "ItemLFImpl.hide0.(I)V"] = function (addr, id) {
    var p = peers.get(id);
    if (p) p.el.style.display = "none";
  };

  Native[L + "ItemLFImpl.delete0.(I)V"] = function (addr, id) {
    var p = peers.get(id);
    if (!p) return;
    peers.delete(id);
    if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
    if (p.owner && p.owner.focus === id) p.owner.focus = 0;
  };

  Native[L + "ItemLFImpl.setLocation0.(III)V"] = function (addr, id, x, y) {
    var p = peers.get(id);
    if (!p) return;
    p.el.style.left = x + "px";
    p.el.style.top = y + "px";
  };

  Native[L + "ItemLFImpl.setSize0.(III)V"] = function (addr, id, w, h) {
    var p = peers.get(id);
    if (!p) return;
    p.el.style.width = w + "px";
    p.el.style.height = h + "px";
  };

  Native[L + "ItemLFImpl.setLabel0.(ILjava/lang/String;)V"] = function (addr, id, labelAddr) {
    var p = peers.get(id);
    if (p) setLabel(p, str(labelAddr));
  };

  Native[L + "ItemLFImpl.getMinimumWidth0.(I)I"] = function (addr, id) {
    var p = peers.get(id);
    return p ? minW(p) : 0;
  };

  Native[L + "ItemLFImpl.getMinimumHeight0.(I)I"] = function (addr, id) {
    var p = peers.get(id);
    return p ? Math.min(prefH(p, cv.width), cv.height / 2 | 0) : 0;
  };

  Native[L + "ItemLFImpl.getPreferredWidth0.(II)I"] = function (addr, id) {
    var p = peers.get(id);
    return p ? prefW(p) : 0;
  };

  Native[L + "ItemLFImpl.getPreferredHeight0.(II)I"] = function (addr, id, w) {
    var p = peers.get(id);
    return p ? prefH(p, w) : 0;
  };

  Native[L + "ChoiceGroupLFImpl.createNativeResource0.(ILjava/lang/String;III[Ljavax/microedition/lcdui/ChoiceGroup$CGElement;II)I"] = function (addr, ownerId, labelAddr, layout, type, fitPolicy, elsAddr, num, sel) {
    var p = newItem("choice", ownerId, str(labelAddr), layout);
    p.type = type;
    p.wide = true;
    p.focusable = true;
    p.hi = 0;
    p.key = choiceKey;
    p.onFocus = choiceFocus;
    var a = elsAddr ? Array.prototype.slice.call(J2ME.getArrayFromAddr(elsAddr), 0, num) : [];
    p.els = a.map(cgEl);
    if (type !== MULTIPLE && sel >= 0 && sel < p.els.length) setSel(p, sel);
    renderChoice(p);
    return p.id;
  };

  Native[L + "ChoiceGroupLFImpl.insert0.(IILjava/lang/String;Ljavax/microedition/lcdui/ImageData;Z)V"] = function (addr, id, i, strAddr, imgAddr, sel) {
    var p = peers.get(id);
    if (!p) return;
    p.els.splice(i, 0, { t: str(strAddr) || "", img: imgCanvas(imgAddr), sel: false, font: "" });
    if (sel) {
      if (p.type === MULTIPLE) p.els[i].sel = true;
      else setSel(p, i);
    }
    if (p.hi >= i && p.els.length > 1) p.hi++;
    renderChoice(p);
  };

  Native[L + "ChoiceGroupLFImpl.delete0.(III)V"] = function (addr, id, i, sel) {
    var p = peers.get(id);
    if (!p) return;
    p.els.splice(i, 1);
    if (p.type !== MULTIPLE) setSel(p, sel);
    p.hi = Math.max(0, Math.min(p.hi > i ? p.hi - 1 : p.hi, p.els.length - 1));
    renderChoice(p);
  };

  Native[L + "ChoiceGroupLFImpl.deleteAll0.(I)V"] = function (addr, id) {
    var p = peers.get(id);
    if (!p) return;
    p.els = [];
    p.hi = 0;
    renderChoice(p);
  };

  Native[L + "ChoiceGroupLFImpl.set0.(IILjava/lang/String;Ljavax/microedition/lcdui/ImageData;Z)V"] = function (addr, id, i, strAddr, imgAddr, sel) {
    var p = peers.get(id);
    if (!p || !p.els[i]) return;
    p.els[i].t = str(strAddr) || "";
    p.els[i].img = imgCanvas(imgAddr);
    if (p.type === MULTIPLE) p.els[i].sel = !!sel;
    else if (sel) setSel(p, i);
    renderChoice(p);
  };

  Native[L + "ChoiceGroupLFImpl.setSelectedIndex0.(IIZ)V"] = function (addr, id, i, sel) {
    var p = peers.get(id);
    if (!p || !p.els[i]) return;
    if (p.type === MULTIPLE) p.els[i].sel = !!sel;
    else if (sel) {
      setSel(p, i);
      if (p.type === IMPLICIT) p.hi = i;
    }
    renderChoice(p);
  };

  Native[L + "ChoiceGroupLFImpl.setSelectedFlags0.(I[ZI)V"] = function (addr, id, flagsAddr, n) {
    var p = peers.get(id);
    if (!p) return;
    var f = J2ME.getArrayFromAddr(flagsAddr);
    if (p.type === MULTIPLE) p.els.forEach(function (e, i) { e.sel = i < n && !!f[i]; });
    else {
      var s = -1;
      for (var i = 0; i < n && i < p.els.length; i++) if (f[i]) { s = i; break; }
      setSel(p, s < 0 ? 0 : s);
    }
    renderChoice(p);
  };

  Native[L + "ChoiceGroupLFImpl.setFitPolicy0.(II)V"] = function (addr, id, fitPolicy) {
    var p = peers.get(id);
    if (p) p.el.classList.toggle("lc-wrap-off", fitPolicy === 2);
  };

  Native[L + "ChoiceGroupLFImpl.setFont0.(IIIII)V"] = function (addr, id, i, face, style, size) {
    var p = peers.get(id);
    if (!p || !p.els[i]) return;
    p.els[i].font = fontCss(face, style, size);
    renderChoice(p);
  };

  Native[L + "ChoiceGroupLFImpl.getSelectedIndex0.(I)I"] = function (addr, id) {
    var p = peers.get(id);
    return p && p.type !== MULTIPLE ? selIndex(p) : -1;
  };

  Native[L + "ChoiceGroupLFImpl.getSelectedFlags0.(I[ZI)I"] = function (addr, id, flagsAddr, n) {
    var p = peers.get(id);
    var f = J2ME.getArrayFromAddr(flagsAddr);
    var c = 0;
    for (var i = 0; i < n; i++) {
      f[i] = p && p.els[i] && p.els[i].sel ? 1 : 0;
      c += f[i];
    }
    return c;
  };

  Native[L + "ChoiceGroupLFImpl.isSelected0.(II)Z"] = function (addr, id, i) {
    var p = peers.get(id);
    return p && p.els[i] && p.els[i].sel ? 1 : 0;
  };

  Native[L + "TextFieldLFImpl.createNativeResource0.(ILjava/lang/String;ILcom/sun/midp/lcdui/DynamicCharacterArray;ILjava/lang/String;)I"] = function (addr, ownerId, labelAddr, layout, dca, cons) {
    return newText(ownerId, str(labelAddr), layout, dca, cons).id;
  };

  Native[L + "TextFieldLFImpl.getString0.(ILcom/sun/midp/lcdui/DynamicCharacterArray;)Z"] = function (addr, id, dca) {
    var p = peers.get(id);
    if (!p) return 0;
    writeDca(dca, p.inp.value);
    return 1;
  };

  Native[L + "TextFieldLFImpl.setString0.(ILcom/sun/midp/lcdui/DynamicCharacterArray;)V"] = function (addr, id, dca) {
    var p = peers.get(id);
    if (p) p.inp.value = readDca(dca);
  };

  Native[L + "TextFieldLFImpl.setMaxSize0.(II)V"] = function (addr, id, max) {
    var p = peers.get(id);
    if (!p) return;
    p.inp.maxLength = max;
    if (p.inp.value.length > max) p.inp.value = p.inp.value.slice(0, max);
  };

  Native[L + "TextFieldLFImpl.getCaretPosition0.(I)I"] = function (addr, id) {
    var p = peers.get(id);
    if (!p) return 0;
    var s = p.inp.selectionStart;
    return typeof s === "number" ? s : p.inp.value.length;
  };

  Native[L + "TextFieldLFImpl.setConstraints0.(II)V"] = function (addr, id, cons) {
    var p = peers.get(id);
    if (p) applyCons(p, cons);
  };

  Native[L + "StringItemLFImpl.createNativeResource0.(ILjava/lang/String;ILjava/lang/String;ILjavax/microedition/lcdui/Font;)I"] = function (addr, ownerId, labelAddr, layout, textAddr, mode, fontAddr) {
    var p = newItem("string", ownerId, str(labelAddr), layout);
    p.txt = el("span", "lc-text");
    p.body.appendChild(p.txt);
    p.el.style.font = fontOf(fontAddr);
    setStringContent(p, str(textAddr), mode);
    activatable(p);
    return p.id;
  };

  Native[L + "StringItemLFImpl.setContent0.(ILjava/lang/String;I)V"] = function (addr, id, textAddr, mode) {
    var p = peers.get(id);
    if (p) setStringContent(p, str(textAddr), mode);
  };

  Native[L + "StringItemLFImpl.setFont0.(IIII)V"] = function (addr, id, face, style, size) {
    var p = peers.get(id);
    if (p) p.el.style.font = fontCss(face, style, size);
  };

  Native[L + "ImageItemLFImpl.createNativeResource0.(ILjava/lang/String;ILjavax/microedition/lcdui/ImageData;Ljava/lang/String;I)I"] = function (addr, ownerId, labelAddr, layout, imgAddr, altAddr, mode) {
    var p = newItem("image", ownerId, str(labelAddr), layout);
    setImageContent(p, imgAddr, str(altAddr), mode);
    activatable(p);
    return p.id;
  };

  Native[L + "ImageItemLFImpl.setContent0.(ILjavax/microedition/lcdui/ImageData;Ljava/lang/String;I)V"] = function (addr, id, imgAddr, altAddr, mode) {
    var p = peers.get(id);
    if (p) setImageContent(p, imgAddr, str(altAddr), mode);
  };

  Native[L + "GaugeLFImpl.createNativeResource0.(ILjava/lang/String;IZII)I"] = function (addr, ownerId, labelAddr, layout, inter, max, value) {
    var p = newItem("gauge", ownerId, str(labelAddr), layout);
    p.wide = true;
    p.inter = !!inter;
    p.focusable = p.inter;
    if (p.inter) {
      p.ctl = el("input", "lc-range");
      p.ctl.type = "range";
      p.ctl.min = 0;
      p.ctl.step = 1;
      p.ctl.addEventListener("input", function () {
        p.val = +p.ctl.value;
        send(2, p.id, p.val);
      });
      p.key = function (k) {
        if (k !== LEFT && k !== RIGHT) return false;
        var v = Math.max(0, Math.min(p.max, p.val + (k === LEFT ? -1 : 1)));
        if (v !== p.val) {
          setGauge(p, v, p.max);
          send(2, p.id, v);
        }
        return true;
      };
    } else {
      p.ctl = el("progress", "lc-progress");
    }
    p.body.appendChild(p.ctl);
    setGauge(p, value, max);
    return p.id;
  };

  Native[L + "GaugeLFImpl.setValue0.(III)V"] = function (addr, id, value, max) {
    var p = peers.get(id);
    if (p) setGauge(p, value, max);
  };

  Native[L + "DateFieldLFImpl.createNativeResource0.(ILjava/lang/String;IJILjava/lang/String;)I"] = function (addr, ownerId, labelAddr, layout, dl, dh, mode) {
    var p = newItem("date", ownerId, str(labelAddr), layout);
    p.wide = true;
    p.focusable = true;
    p.inp = el("input", "lc-input");
    p.mode = mode;
    p.inp.type = DATE_TYPE[mode] || "datetime-local";
    p.inp.value = dateFormat(J2ME.longToNumber(dl, dh), mode);
    p.inp.addEventListener("change", function () { send(2, p.id, 0); });
    p.inp.addEventListener("keydown", function (e) { e.stopPropagation(); });
    p.inp.addEventListener("keyup", function (e) { e.stopPropagation(); });
    p.inp.addEventListener("focus", function () { focusByUser(p); });
    p.key = function (k) {
      if (k !== FIRE) return false;
      p.inp.focus();
      if (p.inp.showPicker) {
        try { p.inp.showPicker(); } catch (e) {}
      }
      return true;
    };
    p.body.appendChild(p.inp);
    return p.id;
  };

  Native[L + "DateFieldLFImpl.getDate0.(I)J"] = function (addr, id) {
    var p = peers.get(id);
    return J2ME.returnLongValue(p ? dateParse(p.inp.value, p.mode) : 0);
  };

  Native[L + "DateFieldLFImpl.setDate0.(IJ)V"] = function (addr, id, dl, dh) {
    var p = peers.get(id);
    if (p) p.inp.value = dateFormat(J2ME.longToNumber(dl, dh), p.mode);
  };

  Native[L + "DateFieldLFImpl.setInputMode0.(II)V"] = function (addr, id, mode) {
    var p = peers.get(id);
    if (p) setDateMode(p, mode);
  };

  Native[L + "CustomItemLFImpl.createNativeResource0.(ILjava/lang/String;I)I"] = function (addr, ownerId, labelAddr, layout) {
    var p = newItem("custom", ownerId, str(labelAddr), layout);
    p.focusable = true;
    p.cnv = el("canvas", "lc-img");
    p.cnv.width = 0;
    p.cnv.height = 0;
    p.body.appendChild(p.cnv);
    return p.id;
  };

  Native[L + "CustomItemLFImpl.getItemPad0.(I)I"] = function () {
    return 2;
  };

  Native[L + "CustomItemLFImpl.getLabelHeight0.(II)I"] = function (addr, id, w) {
    var p = peers.get(id);
    if (!p || !p.lab.textContent) return 0;
    var c = p.lab.cloneNode(true);
    c.style.width = w > 0 ? w + "px" : cv.width + "px";
    meter.appendChild(c);
    var h = c.offsetHeight;
    meter.removeChild(c);
    return h;
  };

  Native[L + "CustomItemLFImpl.getLabelWidth0.(II)I"] = function (addr, id, w) {
    var p = peers.get(id);
    if (!p || !p.lab.textContent) return 0;
    var c = p.lab.cloneNode(true);
    c.style.width = "max-content";
    meter.appendChild(c);
    var r = c.offsetWidth;
    meter.removeChild(c);
    return w > 0 ? Math.min(r, w) : Math.min(r, cv.width);
  };

  Native[L + "CustomItemLFImpl.setContentBuffer0.(ILjavax/microedition/lcdui/ImageData;)V"] = function (addr, id, imgAddr) {
    var p = peers.get(id);
    if (!p) return;
    var ci = imgAddr ? NativeMap.get(imgAddr) : null;
    p.src = ci && ci.context ? ci.context.canvas : null;
    p.cnv.width = p.src ? p.src.width : 0;
    p.cnv.height = p.src ? p.src.height : 0;
    if (p.src && p.src.width && p.src.height) p.cnv.getContext("2d").drawImage(p.src, 0, 0);
  };

  Native[L + "CustomItemLFImpl.refresh0.(IIIII)V"] = function (addr, id, x, y, w, h) {
    var p = peers.get(id);
    if (!p || !p.src) return;
    x = Math.max(0, x);
    y = Math.max(0, y);
    w = Math.min(w, p.src.width - x);
    h = Math.min(h, p.src.height - y);
    if (w <= 0 || h <= 0) return;
    var ctx = p.cnv.getContext("2d");
    ctx.clearRect(x, y, w, h);
    ctx.drawImage(p.src, x, y, w, h, x, y, w, h);
  };

  Native[L + "NativeMenu.updateCommands.([Ljavax/microedition/lcdui/Command;I[Ljavax/microedition/lcdui/Command;I)V"] = function (addr, itemCmdsAddr, nItem, cmdsAddr, n) {
    setCommands(cmdList(itemCmdsAddr, nItem).concat(cmdList(cmdsAddr, n)));
  };

  Native[L + "NativeMenu.showMenu.()V"] = function () {
    openMenu();
  };

  Native[L + "NativeMenu.dismissMenuAndPopup.()V"] = function () {
    closePicker();
  };

  MIDP.updatePhysicalScreenSize();
  MIDP.updateCanvas();
  fit();
})();
