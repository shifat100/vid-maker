(function () {
  var id = config.gameId;
  var PTR_DOWN = "PointerEvent" in window ? "pointerdown" : "mousedown";
  var gear = el("button", "", { id: "gear", type: "button", title: tr("Настройки игры", "Game settings") });
  var panel = el("div", "", { id: "panel", hidden: true });
  var box = el("div", "panel-box", { tabIndex: -1 });
  var skBar = el("div", "kaios-softkeys", { id: "panel-softkeys" });
  var skLeft = el("button", "kaios-sk-btn kaios-sk-left", { type: "button" });
  var skCenter = el("button", "kaios-sk-btn kaios-sk-center", { type: "button" });
  var skRight = el("button", "kaios-sk-btn kaios-sk-right", { type: "button" });
  var toast = el("div", "", { id: "kaios-toast", hidden: true });

  append(skBar, skLeft, skCenter, skRight);
  append(panel, box, skBar);
  append(document.body, gear, panel, toast);

  var startSize = null, btKey = "", btStatus = null, page = "main";
  var state = Settings.resolve(id);
  var focusTargetKey = null;
  var toastTimer = 0;

  function el(tag, cls, props) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (props) Object.keys(props).forEach(function (k) { e[k] = props[k]; });
    return e;
  }

  function append(parent) {
    for (var i = 1; i < arguments.length; i++) {
      var child = arguments[i];
      if (child != null) {
        parent.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
      }
    }
    return parent;
  }

  function txt(tag, cls, text) {
    return el(tag, cls, { textContent: text });
  }

  function queryParam(name) {
    var q = location.search;
    if (!q || q.length < 2) return null;
    var parts = q.slice(1).split("&");
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf("=");
      var k = decodeURIComponent((eq >= 0 ? parts[i].slice(0, eq) : parts[i]).replace(/\+/g, " "));
      if (k === name) return eq >= 0 ? decodeURIComponent(parts[i].slice(eq + 1).replace(/\+/g, " ")) : "";
    }
    return null;
  }

  function pretty(s) {
    return s ? s.replace("x", " × ") : tr("окно", "window");
  }

  function canvasSize() {
    var c = document.getElementById("canvas");
    return c.width + "x" + c.height;
  }

  function save(key, value) {
    Settings.setGame(id, key, value);
    state = Settings.resolve(id);
  }

  function setScreen(mode, size) {
    config.screenMode = mode;
    if (mode === "manual") config.screen = size;
    save("screen", mode === "manual" ? size : mode);
    ScreenSetup.apply();
    render();
  }

  var apply = {
    scale: function (v) {
      config.scale = parseFloat(v) || 1;
      ScreenSetup.refit();
    },
    keypad: function (v) {
      config.keypad = v | 0;
      document.getElementById("keypad").className = "keypad-" + config.keypad;
      ScreenSetup.refit();
    },
    rotate: function (v) {
      config.rotate = v | 0;
      ScreenSetup.refit();
    },
    fps: function (v) {
      config.fps = v | 0;
    },
    jit: function () {
      location.reload();
    },
    platform: function () {
      location.reload();
    }
  };

  function showToast(text, ms) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = text;
    toast.hidden = false;
    toastTimer = setTimeout(function () {
      toast.hidden = true;
      toastTimer = 0;
    }, ms || 2600);
  }

  function scrollIntoBox(target) {
    if (!target || !box) return;
    var bRect = box.getBoundingClientRect();
    var tRect = target.getBoundingClientRect();
    var bottomPad = skBar.hidden ? 8 : 34;
    if (tRect.top < bRect.top + 4) box.scrollTop -= (bRect.top + 4 - tRect.top);
    else if (tRect.bottom > bRect.bottom - bottomPad) box.scrollTop += (tRect.bottom - (bRect.bottom - bottomPad));
  }

  function focusables() {
    var list = Array.prototype.slice.call(box.querySelectorAll("button:not(:disabled), select:not(:disabled), input:not(:disabled)"));
    return list.filter(function (node) { return node.offsetParent !== null; });
  }

  function setFocusEl(target) {
    var list = focusables();
    for (var i = 0; i < list.length; i++) list[i].classList.remove("kbd-focus");
    if (!target) return;
    target.classList.add("kbd-focus");
    if (target.dataset && target.dataset.fk) focusTargetKey = target.dataset.fk;
    scrollIntoBox(target);
    if (target.focus) {
      try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
    }
  }

  function restoreFocus() {
    var list = focusables();
    if (!list.length) return;
    var match = null;
    if (focusTargetKey) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].dataset && list[i].dataset.fk === focusTargetKey) {
          match = list[i];
          break;
        }
      }
    }
    if (!match) {
      for (var j = 0; j < list.length; j++) {
        if (!list[j].classList.contains("pb-close")) {
          match = list[j];
          break;
        }
      }
    }
    setFocusEl(match || list[0]);
  }

  function updateSoftkeys() {
    var compact = ScreenSetup.isCompact ? ScreenSetup.isCompact() : (Math.min(innerWidth, innerHeight) <= 360);
    skBar.hidden = !compact;
    if (skBar.hidden) return;
    if (page === "props") {
      skLeft.textContent = tr("Назад", "Back");
      skCenter.textContent = tr("ВЫБРАТЬ", "SELECT");
      skRight.textContent = tr("Закрыть", "Close");
    } else {
      skLeft.textContent = tr("Файлы", "Files");
      skCenter.textContent = tr("ВЫБРАТЬ", "SELECT");
      skRight.textContent = tr("Закрыть", "Close");
    }
  }

  function head(title, sub, withBack) {
    var r = ScreenSetup.result();
    var h = el("div", "pb-head");
    if (withBack) {
      var b = el("button", "pb-close", { type: "button", title: tr("Назад", "Back"), textContent: "‹" });
      b.dataset.fk = "head:back";
      b.addEventListener("click", back);
      h.appendChild(b);
    }
    var t = el("div", "pb-title");
    append(t,
      txt("b", "", title || r && r.name || config.jars.replace(/^.*[\/:]/, "").replace(/\.jar$/i, "")),
      txt("span", "", sub || tr("Настройки сохраняются для этой игры", "Settings are saved for this game")));
    var x = el("button", "pb-close", { type: "button", title: tr("Закрыть", "Close"), textContent: "✕" });
    x.dataset.fk = "head:close";
    x.addEventListener("click", function () { toggle(false); });
    append(h, t, x);
    return h;
  }

  function go(v) {
    page = v;
    focusTargetKey = null;
    box.scrollTop = 0;
    render();
  }

  function back() {
    if (page !== "main") go("main");
    else toggle(false);
  }

  function propDefault(key) {
    var v = typeof systemProperty === "function" ? systemProperty(key) : null;
    return v == null ? "" : String(v);
  }

  function propsChanged() {
    return JSON.stringify(Settings.props(id)) !== JSON.stringify(config.props || {});
  }

  function propRow(key, own) {
    var row = el("label", "prop");
    var name = el("span", "opt-name");
    name.appendChild(txt("span", "prop-key", key));
    if (key in own) {
      var reset = el("button", "own", { type: "button", textContent: tr("своё ✕", "custom ✕"), title: tr("Вернуть значение по умолчанию", "Restore default") });
      reset.dataset.fk = "prop-reset:" + key;
      reset.addEventListener("click", function (e) {
        e.preventDefault();
        Settings.setProp(id, key, null);
        render();
      });
      name.appendChild(reset);
    }
    var def = propDefault(key);
    var input = el("input", "", { value: key in own ? own[key] : "", placeholder: def || tr("не задано", "not set"), spellcheck: false, autocomplete: "off", autocapitalize: "none" });
    input.dataset.fk = "prop:" + key;
    input.addEventListener("change", function () {
      Settings.setProp(id, key, input.value === "" ? null : input.value);
      render();
    });
    append(row, name, input);
    return row;
  }

  function propsView() {
    var own = Settings.props(id);
    var keys = Settings.sysprops.slice();
    Object.keys(own).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    var sec = el("section");
    if (propsChanged()) {
      var bar = el("div", "restart");
      var rb = txt("button", "", tr("Перезапустить", "Restart"));
      rb.type = "button";
      rb.dataset.fk = "props:restart";
      rb.addEventListener("click", function () { location.reload(); });
      append(bar, txt("span", "", tr("Свойства применятся после перезапуска игры.", "Properties apply after the game restarts.")), rb);
      sec.appendChild(bar);
    }
    var list = el("div", "props");
    keys.forEach(function (k) { list.appendChild(propRow(k, own)); });
    sec.appendChild(list);
    var add = el("form", "prop-add");
    var k = el("input", "", { placeholder: tr("Свойство", "Property"), spellcheck: false, autocomplete: "off", autocapitalize: "none" });
    k.dataset.fk = "prop-add:k";
    var v = el("input", "", { placeholder: tr("Значение", "Value"), spellcheck: false, autocomplete: "off", autocapitalize: "none" });
    v.dataset.fk = "prop-add:v";
    var ok = el("button", "", { type: "submit", textContent: tr("Добавить", "Add") });
    ok.dataset.fk = "prop-add:ok";
    add.addEventListener("submit", function (e) {
      e.preventDefault();
      var key = k.value.trim();
      if (!key) { setFocusEl(k); return; }
      Settings.setProp(id, key, v.value);
      render();
    });
    append(add, k, v, ok);
    append(sec, txt("h3", "", tr("Своё свойство", "Custom property")), add);
    append(box, head(tr("Системные свойства", "System properties"), tr("System.getProperty для этой игры", "System.getProperty for this game"), true), sec);
    if (Object.keys(own).length) {
      var f = el("div", "pb-foot");
      var reset = txt("button", "ghost", tr("Сбросить все свойства", "Reset all properties"));
      reset.type = "button";
      reset.dataset.fk = "props:reset";
      reset.addEventListener("click", function () {
        if (!reset.classList.contains("confirm")) {
          reset.classList.add("confirm");
          reset.textContent = tr("Точно сбросить?", "Reset?");
          return;
        }
        Settings.resetProps(id);
        render();
      });
      f.appendChild(reset);
      box.appendChild(f);
    }
  }

  function segment() {
    var seg = el("div", "seg");
    [["auto", tr("Авто", "Auto")], ["manual", tr("Свой размер", "Custom")], ["fit", tr("По окну", "Fit window")]].forEach(function (o) {
      var b = txt("button", config.screenMode === o[0] ? "on" : "", o[1]);
      b.type = "button";
      b.dataset.fk = "scr-mode:" + o[0];
      b.addEventListener("click", function () {
        if (o[0] === "manual") setScreen("manual", config.screenMode === "manual" ? config.screen : ScreenSetup.current() || canvasSize());
        else setScreen(o[0]);
      });
      seg.appendChild(b);
    });
    if (config.urlLocked.screen) seg.classList.add("locked");
    return seg;
  }

  function now() {
    var r = ScreenSetup.result();
    var size = config.screenMode === "fit" ? canvasSize() : ScreenSetup.current();
    var wrap = el("div", "scr-now");
    var big = txt("div", "scr-size", pretty(size));
    var src = "";
    if (config.urlLocked.screen) src = tr("Задано в адресе страницы", "Set in page URL");
    else if (config.screenMode === "manual") src = tr("Выбрано вручную", "Chosen manually");
    else if (config.screenMode === "fit") src = tr("Подстраивается под окно браузера", "Fits the browser window");
    else if (!r) src = tr("Определяется…", "Detecting…");
    else src = tr("Подобран автоматически", "Detected automatically");
    append(wrap, big, txt("div", "scr-src", src));
    return wrap;
  }

  function candidates() {
    var r = ScreenSetup.result();
    var cbox = el("div", "cands");
    if (!r) return cbox;
    var list = r.candidates.slice();
    if (r.observed && !list.some(function (c) { return c.size === r.observed; })) {
      list.push({ size: r.observed });
    }
    var others = list.filter(function (c) { return c.size !== ScreenSetup.current(); });
    if (others.length) {
      cbox.appendChild(txt("div", "sub", tr("Если картинка не та, попробуйте", "If the picture looks wrong, try")));
      var chips = el("div", "chips");
      others.forEach(function (c) {
        var b = txt("button", "chip", pretty(c.size));
        b.type = "button";
        b.dataset.fk = "cand:" + c.size;
        b.addEventListener("click", function () { setScreen("manual", c.size); });
        chips.appendChild(b);
      });
      cbox.appendChild(chips);
    }
    if (r.touch && config.keypad && !config.urlLocked.keypad) {
      var tip = el("div", "tip");
      var hide = txt("button", "ghost", tr("Скрыть", "Hide"));
      hide.type = "button";
      hide.dataset.fk = "tip:hide-keypad";
      hide.addEventListener("click", function () {
        save("keypad", "0");
        apply.keypad("0");
        render();
      });
      append(tip, txt("span", "muted", tr("Игра сенсорная — экранная клавиатура ей не нужна.", "Touch game — the on-screen keypad is not needed.")), hide);
      cbox.appendChild(tip);
    }
    return cbox;
  }

  function manual() {
    var wrap = el("div", "manual");
    var has240 = false, has320 = false;
    Settings.presets.forEach(function (g) {
      wrap.appendChild(txt("div", "sub", g.title));
      var chips = el("div", "chips");
      g.items.forEach(function (s) {
        if (s === "240x320") has240 = true;
        if (s === "320x240") has320 = true;
        var b = txt("button", "chip" + (config.screen === s ? " on" : ""), pretty(s));
        b.type = "button";
        b.dataset.fk = "preset:" + s;
        b.addEventListener("click", function () { setScreen("manual", s); });
        chips.appendChild(b);
      });
      wrap.appendChild(chips);
    });
    if (!has240 || !has320) {
      var extra = el("div", "chips");
      [["240x320", !has240], ["320x240", !has320]].forEach(function (pair) {
        if (!pair[1]) return;
        var s = pair[0];
        var b = txt("button", "chip" + (config.screen === s ? " on" : ""), pretty(s));
        b.type = "button";
        b.dataset.fk = "preset:" + s;
        b.addEventListener("click", function () { setScreen("manual", s); });
        extra.appendChild(b);
      });
      wrap.appendChild(extra);
    }

    var cur = Settings.parse(config.screen) || [240, 320];
    var row = el("form", "custom");
    var w = el("input", "", { type: "tel", value: String(cur[0]), inputMode: "numeric", pattern: "[0-9]*", maxLength: 4, title: tr("Ширина", "Width") });
    w.dataset.fk = "custom:w";
    var h = el("input", "", { type: "tel", value: String(cur[1]), inputMode: "numeric", pattern: "[0-9]*", maxLength: 4, title: tr("Высота", "Height") });
    h.dataset.fk = "custom:h";
    var swap = el("button", "ghost", { type: "button", textContent: "⇄", title: tr("Поменять местами", "Swap") });
    swap.dataset.fk = "custom:swap";
    var ok = el("button", "", { type: "submit", textContent: tr("Применить", "Apply") });
    ok.dataset.fk = "custom:ok";
    swap.addEventListener("click", function () {
      setScreen("manual", cur[1] + "x" + cur[0]);
    });
    row.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = Math.max(64, Math.min(2048, parseInt(w.value, 10) || 240));
      var b = Math.max(64, Math.min(2048, parseInt(h.value, 10) || 320));
      setScreen("manual", a + "x" + b);
    });
    append(row, txt("span", "sub", tr("Свой", "Custom")), w, txt("span", "", "×"), h, swap, ok);
    wrap.appendChild(row);
    return wrap;
  }

  function restart() {
    if (!startSize || startSize === canvasSize()) return null;
    var bar = el("div", "restart");
    var b = txt("button", "", tr("Перезапустить", "Restart"));
    b.type = "button";
    b.dataset.fk = "scr:restart";
    b.addEventListener("click", function () { location.reload(); });
    append(bar, txt("span", "", tr("Игра запущена в " + pretty(startSize) + ". Новый размер точно заработает после перезапуска.", "The game started at " + pretty(startSize) + ". The new size will apply after a restart.")), b);
    return bar;
  }

  function selects() {
    var wrap = el("div", "opts");
    ["scale", "rotate", "keypad", "fps", "jit", "platform"].forEach(function (key) {
      var opt = Settings.options[key];
      var row = el("label", "opt");
      var name = el("span", "opt-name");
      name.appendChild(txt("span", "", opt.label));
      if (state.own[key]) {
        var reset = el("button", "own", { type: "button", textContent: tr("своё ✕", "custom ✕"), title: tr("Вернуть значение по умолчанию", "Restore default") });
        reset.dataset.fk = "opt-reset:" + key;
        reset.addEventListener("click", function (e) {
          e.preventDefault();
          save(key, null);
          apply[key](state.values[key]);
          render();
        });
        name.appendChild(reset);
      }
      var sel = el("select");
      sel.dataset.fk = "opt:" + key;
      opt.items.forEach(function (it) {
        sel.appendChild(el("option", "", { value: it[0], textContent: it[1] }));
      });
      if (config.urlLocked[key]) {
        sel.value = key === "jit" ? (config.jit ? "1" : "0") : key === "platform" ? (queryParam("platform") || "") : String(config[key]);
      } else if (key === "keypad" && !state.own.keypad) {
        sel.value = String(config.keypad);
      } else {
        sel.value = state.values[key];
      }
      sel.disabled = !!config.urlLocked[key];
      sel.addEventListener("change", function () {
        save(key, sel.value);
        apply[key](sel.value);
        render();
      });
      append(row, name, sel);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function linkText(st) {
    var link = !st.peers ? tr("нет связи с сервером", "no server connection") : st.via === "P2P" ? tr("напрямую (P2P)", "direct (P2P)") : st.via === "TURN" ? tr("через TURN", "via TURN") : tr("через сервер", "via server");
    return tr("Игроков: ", "Players: ") + st.peers + " · " + link + (st.via && st.rtt ? " · " + st.rtt + tr(" мс", " ms") : "");
  }

  function roomKey(st) {
    return st.room ? [st.room.mode, st.room.room, st.room.pass].join("\n") : "";
  }

  function bluetooth() {
    var st = BtRoom.state();
    btKey = roomKey(st);
    btStatus = null;
    if (!st.room) return null;
    var sec = el("section");
    var info = el("div", "bt-info");
    if (st.room.mode === "near") {
      info.appendChild(txt("b", "", tr("Рядом", "Nearby")));
    } else {
      [[tr("Комната", "Room"), st.room.room], [tr("Пароль", "Password"), st.room.pass]].forEach(function (p) {
        var line = el("div", "bt-line");
        append(line, txt("span", "muted", p[0]), txt("b", "bt-sel", p[1]));
        info.appendChild(line);
      });
    }
    btStatus = txt("span", "muted", linkText(st));
    info.appendChild(btStatus);
    var row = el("div", "bt-actions");
    var change = txt("button", "ghost", tr("Сменить комнату", "Change room"));
    change.type = "button";
    change.dataset.fk = "bt:change";
    change.addEventListener("click", function () {
      toggle(false);
      BtRoom.change();
    });
    row.appendChild(change);
    if (st.room.mode !== "near") {
      var cp = txt("button", "ghost", tr("Скопировать", "Copy"));
      cp.type = "button";
      cp.dataset.fk = "bt:copy";
      cp.addEventListener("click", function () { BtRoom.copy(cp); });
      row.appendChild(cp);
    }
    append(sec, txt("h3", "", tr("Сетевая игра", "Multiplayer")), info, row);
    return sec;
  }

  function footer() {
    var f = el("div", "pb-foot");
    var reset = txt("button", "ghost", tr("Сбросить для этой игры", "Reset for this game"));
    reset.type = "button";
    reset.dataset.fk = "foot:reset";
    reset.addEventListener("click", function () {
      if (!reset.classList.contains("confirm")) {
        reset.classList.add("confirm");
        reset.textContent = tr("Точно сбросить?", "Reset?");
        return;
      }
      var hadJit = state.own.jit || state.own.platform || Object.keys(Settings.props(id)).length;
      Settings.resetGame(id);
      if (hadJit) {
        location.reload();
        return;
      }
      state = Settings.resolve(id);
      config.screenMode = state.values.screen === "fit" ? "fit" : Settings.parse(state.values.screen) ? "manual" : "auto";
      if (config.screenMode === "manual") config.screen = state.values.screen;
      ["scale", "rotate", "keypad", "fps"].forEach(function (k) { apply[k](state.values[k]); });
      if (ScreenSetup.isCompact && ScreenSetup.isCompact() && !config.urlLocked.keypad) {
        apply.keypad("0");
      }
      ScreenSetup.apply();
      render();
    });
    f.appendChild(reset);
    return f;
  }

  function render() {
    if (panel.hidden) return;
    var scroll = box.scrollTop;
    box.textContent = "";
    if (page === "props") {
      propsView();
      box.scrollTop = scroll;
      updateSoftkeys();
      restoreFocus();
      return;
    }

    var nav = el("section");
    var home = txt("button", "fm-open ghost", tr("← К списку игр", "← All games"));
    home.type = "button";
    home.dataset.fk = "nav:home";
    home.addEventListener("click", function () { location.href = "index.html"; });
    nav.appendChild(home);

    var scr = el("section");
    append(scr, txt("h3", "", tr("Экран", "Screen")), now(), segment());
    var rs = restart();
    if (rs) scr.appendChild(rs);
    if (config.screenMode === "auto") scr.appendChild(candidates());
    if (config.screenMode === "manual") scr.appendChild(manual());
    var view = el("section");
    append(view, txt("h3", "", tr("Изображение и управление", "Display and controls")), selects());
    var files = el("section");
    var fm = txt("button", "fm-open", tr("Открыть файлы телефона", "Open phone files"));
    fm.type = "button";
    fm.dataset.fk = "files:open";
    fm.addEventListener("click", function () {
      toggle(false);
      Files.open();
    });
    append(files, txt("h3", "", tr("Файлы", "Files")), fm);
    var n = Object.keys(Settings.props(id)).length;
    var pb = txt("button", "fm-open ghost", tr("Системные свойства", "System properties") + (n ? " · " + n : ""));
    pb.type = "button";
    pb.dataset.fk = "props:open";
    pb.addEventListener("click", function () { go("props"); });
    files.appendChild(pb);

    box.appendChild(head());
    var bt = bluetooth();
    if (bt) box.appendChild(bt);
    append(box, nav, scr, view, files, footer());
    box.scrollTop = scroll;
    updateSoftkeys();
    restoreFocus();
  }

  function toggle(open) {
    if (open === undefined) open = panel.hidden;
    if (!open) {
      page = "main";
      focusTargetKey = null;
    }
    panel.hidden = !open;
    gear.classList.toggle("on", open);
    if (open) render();
    else if (panel.contains(document.activeElement)) document.activeElement.blur();
  }

  function place() {
    var c = document.getElementById("display").getBoundingClientRect();
    var s = 46, top = c.top >= s, right = innerWidth - c.right >= s, left = c.left >= s;
    gear.classList.toggle("left", !top && !right && left);
    gear.classList.toggle("over", !top && !right && !left);
  }

  function moveFocus(dir) {
    var list = focusables();
    if (!list.length) return;
    var active = document.activeElement;
    var idx = list.indexOf(active);
    if (idx < 0) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].classList.contains("kbd-focus")) { idx = i; break; }
      }
    }
    if (idx < 0) {
      setFocusEl(list[0]);
      return;
    }

    if (dir === "left" || dir === "right") {
      idx = (idx + (dir === "right" ? 1 : -1) + list.length) % list.length;
      setFocusEl(list[idx]);
      return;
    }

    var rects = list.map(function (el) {
      var r = el.getBoundingClientRect();
      return { el: el, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 };
    });
    var c = rects[idx];
    var bestIdx = -1;
    var bestScore = Infinity;
    for (var j = 0; j < rects.length; j++) {
      if (j === idx) continue;
      var dy = dir === "down" ? (rects[j].cy - c.cy) : (c.cy - rects[j].cy);
      if (dy <= 10) continue;
      var score = dy * 2 + Math.abs(rects[j].cx - c.cx);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) {
      bestIdx = dir === "down" ? 0 : list.length - 1;
    }
    setFocusEl(list[bestIdx]);
  }

  function activateFocused() {
    var target = document.activeElement;
    if (!panel.contains(target) || target === box) {
      var list = focusables();
      for (var i = 0; i < list.length; i++) {
        if (list[i].classList.contains("kbd-focus")) { target = list[i]; break; }
      }
    }
    if (!target || target === box) return;
    if (target.tagName === "INPUT") {
      if (target.form && target.form.requestSubmit) target.form.requestSubmit();
      else if (target.form) {
        var sub = target.form.querySelector('button[type="submit"]');
        if (sub) sub.click();
      }
      return;
    }
    target.click();
  }

  function softLeftAction() {
    if (page === "props") back();
    else {
      toggle(false);
      Files.open();
    }
  }

  skLeft.addEventListener("click", softLeftAction);
  skCenter.addEventListener("click", activateFocused);
  skRight.addEventListener("click", back);

  box.addEventListener("focusin", function (e) {
    if (e.target && e.target !== box && e.target.dataset && e.target.dataset.fk) {
      var list = focusables();
      for (var i = 0; i < list.length; i++) list[i].classList.remove("kbd-focus");
      e.target.classList.add("kbd-focus");
      focusTargetKey = e.target.dataset.fk;
    }
  });

  BtRoom.watch(function (st) {
    gear.dataset.bt = !st.room ? "" : !st.peers ? "off" : st.via ? "direct" : "server";
    if (panel.hidden) return;
    if (btStatus && roomKey(st) === btKey) btStatus.textContent = linkText(st);
    else render();
  });
  ScreenSetup.onChange(function () {
    place();
    render();
  });
  window.addEventListener("resize", function () {
    place();
    if (!panel.hidden) updateSoftkeys();
  });
  var origStarted = ScreenSetup.started;
  ScreenSetup.started = function () {
    startSize = canvasSize();
    origStarted();
    place();
    if (ScreenSetup.isCompact && ScreenSetup.isCompact()) {
      showToast(tr("Вызов / LSK+RSK — меню", "Call / LSK+RSK — menu"), 2800);
    }
  };

  gear.addEventListener("click", function () { toggle(panel.hidden); });
  var backdrop = false;
  panel.addEventListener(PTR_DOWN, function (e) {
    backdrop = e.target === panel;
  });
  panel.addEventListener("click", function (e) {
    if (e.target === panel && backdrop) toggle(false);
  });
  panel.addEventListener("keydown", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;
    e.stopPropagation();

    if (e.key === "Call" || e.key === "F10" || e.key === "ContextMenu") {
      e.preventDefault();
      toggle(false);
      return;
    }
    if (e.key === "SoftLeft") {
      e.preventDefault();
      softLeftAction();
      return;
    }
    if (e.key === "SoftRight" || e.key === "Escape") {
      e.preventDefault();
      back();
      return;
    }

    var active = document.activeElement;
    if (e.key === "Backspace") {
      if (active && active.tagName === "INPUT" && (active.value || "").length > 0) return;
      e.preventDefault();
      back();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus("down");
      return;
    }
    if (e.key === "ArrowLeft") {
      if (active && active.tagName === "INPUT") {
        if (typeof active.selectionStart === "number" && active.selectionStart > 0) return;
      }
      if (active && active.tagName === "SELECT") {
        e.preventDefault();
        if (active.selectedIndex > 0) {
          active.selectedIndex--;
          save(active.dataset.fk.replace("opt:", ""), active.value);
          apply[active.dataset.fk.replace("opt:", "")](active.value);
          render();
        }
        return;
      }
      e.preventDefault();
      moveFocus("left");
      return;
    }
    if (e.key === "ArrowRight") {
      if (active && active.tagName === "INPUT") {
        if (typeof active.selectionStart === "number" && active.selectionStart < (active.value || "").length) return;
      }
      if (active && active.tagName === "SELECT") {
        e.preventDefault();
        if (active.selectedIndex < active.options.length - 1) {
          active.selectedIndex++;
          save(active.dataset.fk.replace("opt:", ""), active.value);
          apply[active.dataset.fk.replace("opt:", "")](active.value);
          render();
        }
        return;
      }
      e.preventDefault();
      moveFocus("right");
      return;
    }
  });
  panel.addEventListener("keyup", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;
    e.stopPropagation();
  });

  window.Panel = {
    toggle: toggle,
    open: function () { toggle(true); },
    close: function () { toggle(false); },
    isOpen: function () { return !panel.hidden; }
  };
})();