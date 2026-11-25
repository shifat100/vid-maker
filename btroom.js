var BtRoom = (function () {
  var PTR_DOWN = "PointerEvent" in window ? "pointerdown" : "mousedown";
  var WORDS = ["volk", "lisa", "sokol", "kedr", "rys", "bars", "los", "orel", "yozh", "sova"];
  var MODES = [["create", tr("Создать", "Create")], ["join", tr("Подключиться", "Join")], ["near", tr("Рядом", "Nearby")]];
  var NETS = [["auto", tr("Авто", "Auto")], ["p2p", "P2P"], ["turn", "TURN"]];
  var ACTION = { create: tr("Создать комнату", "Create room"), join: tr("Подключиться", "Join"), near: tr("Играть рядом", "Play nearby") };

  var overlay = el("div", "", { id: "btroom", hidden: true });
  var box = el("form", "panel-box bt-box", { noValidate: true, tabIndex: -1 });
  var skBar = el("div", "kaios-softkeys", { id: "bt-softkeys" });
  var skLeft = el("button", "kaios-sk-btn kaios-sk-left", { type: "button" });
  var skCenter = el("button", "kaios-sk-btn kaios-sk-center", { type: "button" });
  var skRight = el("button", "kaios-sk-btn kaios-sk-right", { type: "button" });

  var current = { room: null, peers: 0, via: "" }, watchers = [];
  var handler = null, done = null, mode = "create", busy = false, openedAt = 0;
  var form = { name: "", create: { room: "", pass: "" }, join: { room: "", pass: "" } };
  var focusTargetKey = null;

  append(skBar, skLeft, skCenter, skRight);
  append(overlay, box, skBar);

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

  function padZero(s, n) {
    s = String(s);
    while (s.length < n) s = "0" + s;
    return s;
  }

  function rnd(n) {
    return padZero(Math.floor(Math.random() * Math.pow(10, n)), n);
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

  function stored() {
    try {
      return localStorage.getItem("btname");
    } catch (e) {
      return null;
    }
  }

  function remember(name) {
    try {
      if (name) localStorage.setItem("btname", name);
    } catch (e) {}
  }

  function fresh() {
    form.create = { room: WORDS[Math.floor(Math.random() * WORDS.length)] + "-" + rnd(2), pass: rnd(4), net: "auto" };
  }

  function field(label, value, props, fk, onInput) {
    var wrap = el("label", "bt-field");
    var input = el("input", "", props);
    input.value = value;
    input.dataset.fk = fk;
    input.addEventListener("input", function () { onInput(input.value); });
    append(wrap, txt("span", "", label), input);
    return wrap;
  }

  function copy(btn, f) {
    if (!f) return;
    var text = tr("Комната: ", "Room: ") + f.room + tr("\nПароль: ", "\nPassword: ") + f.pass;
    var ok = function () {
      if (!btn) return;
      btn.textContent = tr("Скопировано", "Copied");
      setTimeout(function () { btn.textContent = tr("Скопировать", "Copy"); }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, function () { fallback(text); ok(); });
    } else {
      fallback(text);
      ok();
    }
  }

  function fallback(text) {
    var t = el("textarea", "", { value: text });
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    t.remove();
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
    var list = Array.prototype.slice.call(box.querySelectorAll("button:not(:disabled), input:not(:disabled)"));
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
    var compact = (typeof ScreenSetup !== "undefined" && ScreenSetup.isCompact) ? ScreenSetup.isCompact() : (Math.min(innerWidth, innerHeight) <= 360);
    skBar.hidden = !compact;
    if (skBar.hidden) return;
    skLeft.textContent = mode === "create" ? tr("Копир.", "Copy") : "";
    skCenter.textContent = tr("ВЫБРАТЬ", "SELECT");
    skRight.textContent = tr("Закрыть", "Close");
  }

  function render(error) {
    var scroll = box.scrollTop;
    box.textContent = "";
    var head = el("div", "pb-head");
    var title = el("div", "pb-title");
    title.appendChild(txt("b", "", tr("Сетевая игра", "Multiplayer")));
    var x = el("button", "pb-close", { type: "button", title: tr("Закрыть", "Close"), textContent: "✕" });
    x.dataset.fk = "bt:close";
    x.addEventListener("click", function () { close(false); });
    append(head, title, x);

    var who = el("section");
    who.appendChild(field(tr("Ваше имя в игре", "Your name in game"), form.name, { maxLength: 16, autocomplete: "nickname", spellcheck: false }, "bt:name", function (v) { form.name = v; }));

    var seg = el("div", "seg");
    MODES.forEach(function (m) {
      var b = txt("button", mode === m[0] ? "on" : "", m[1]);
      b.type = "button";
      b.dataset.fk = "bt-mode:" + m[0];
      b.addEventListener("click", function () {
        mode = m[0];
        render();
      });
      seg.appendChild(b);
    });

    var body = el("section");
    body.appendChild(seg);
    if (mode === "near") {
      body.appendChild(txt("div", "sub", tr("Игроки из одной сети (один Wi‑Fi или один внешний IP) видят друг друга без комнаты и пароля.", "Players on the same network (same Wi‑Fi or public IP) see each other without a room or password.")));
    } else {
      var f = form[mode];
      append(body,
        field(tr("Название комнаты", "Room name"), f.room, { maxLength: 64, autocomplete: "off", spellcheck: false, autocapitalize: "none" }, "bt:room", function (v) { f.room = v; }),
        field(tr("Пароль", "Password"), f.pass, { maxLength: 64, autocomplete: "off", spellcheck: false, autocapitalize: "none" }, "bt:pass", function (v) { f.pass = v; })
      );
      if (mode === "create") {
        var net = el("div", "bt-field");
        var ns = el("div", "seg");
        NETS.forEach(function (n) {
          var b = txt("button", f.net === n[0] ? "on" : "", n[1]);
          b.type = "button";
          b.dataset.fk = "bt-net:" + n[0];
          b.addEventListener("click", function () {
            f.net = n[0];
            render();
          });
          ns.appendChild(b);
        });
        append(net, txt("span", "", tr("Соединение", "Connection")), ns);
        body.appendChild(net);
      }
      body.appendChild(txt("div", "sub", mode === "create"
        ? tr("Передайте второму игроку название и пароль любым способом. Он выберет «Подключиться».", "Send the room name and password to the other player any way you like. They choose “Join”.")
        : tr("Введите название и пароль, которые прислал создатель комнаты.", "Enter the name and password from the room creator.")));
    }
    if (error) body.appendChild(txt("div", "bt-error", error));

    var foot = el("div", "pb-foot bt-foot");
    var go = el("button", "bt-go", { type: "submit", textContent: busy ? tr("Подключение…", "Connecting…") : ACTION[mode], disabled: busy });
    go.dataset.fk = "bt:submit";
    foot.appendChild(go);
    if (mode === "create") {
      var cp = el("button", "ghost", { type: "button", textContent: tr("Скопировать", "Copy") });
      cp.dataset.fk = "bt:copy";
      cp.addEventListener("click", function () { copy(cp, form[mode]); });
      foot.appendChild(cp);
    }
    append(box, head, who, body, foot);
    box.scrollTop = scroll;
    updateSoftkeys();
    if (!overlay.hidden) restoreFocus();
  }

  function close(ok) {
    if (busy) return;
    overlay.hidden = true;
    focusTargetKey = null;
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
    var d = done;
    done = null;
    if (d) ok ? d.resolve() : d.reject();
  }

  function ask(r, error, attempt) {
    if (r) {
      mode = r.mode;
      form.name = r.name || form.name;
      if (mode !== "near") form[mode] = { room: r.room, pass: r.pass, net: r.net || "auto" };
    }
    if (done) done.reject();
    return new Promise(function (resolve, reject) {
      done = { resolve: resolve, reject: reject, attempt: attempt };
      busy = false;
      openedAt = Date.now();
      focusTargetKey = null;
      overlay.hidden = false;
      render(error);
    });
  }

  function status(room, peers, via, rtt) {
    current = { room: room, peers: peers, via: via, rtt: rtt || 0 };
    watchers.forEach(function (fn) { fn(current); });
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
    var bestIdx = -1, bestScore = Infinity;
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
    if (bestIdx < 0) bestIdx = dir === "down" ? 0 : list.length - 1;
    setFocusEl(list[bestIdx]);
  }

  function activateFocused() {
    var target = document.activeElement;
    if (!overlay.contains(target) || target === box) {
      var list = focusables();
      for (var i = 0; i < list.length; i++) {
        if (list[i].classList.contains("kbd-focus")) { target = list[i]; break; }
      }
    }
    if (!target || target === box) return;
    if (target.tagName === "INPUT") {
      var submitBtn = box.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
      return;
    }
    target.click();
  }

  function softLeftAction() {
    if (mode === "create") {
      var cp = box.querySelector('button[data-fk="bt:copy"]');
      copy(cp, form[mode]);
    }
  }

  skLeft.addEventListener("click", softLeftAction);
  skCenter.addEventListener("click", activateFocused);
  skRight.addEventListener("click", function () { close(false); });

  box.addEventListener("focusin", function (e) {
    if (e.target && e.target !== box && e.target.dataset && e.target.dataset.fk) {
      var list = focusables();
      for (var i = 0; i < list.length; i++) list[i].classList.remove("kbd-focus");
      e.target.classList.add("kbd-focus");
      focusTargetKey = e.target.dataset.fk;
    }
  });

  box.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy || !done) return;
    var f = form[mode];
    form.name = form.name.trim();
    if (mode !== "near") {
      f.room = f.room.trim();
      if (!f.room) return render(tr("Введите название комнаты", "Enter a room name"));
    }
    busy = true;
    render();
    done.attempt({ mode: mode, room: mode === "near" ? "" : f.room, pass: mode === "near" ? "" : f.pass, net: mode === "create" ? f.net : "auto", name: form.name }).then(function () {
      remember(form.name);
      busy = false;
      close(true);
    }, function (msg) {
      busy = false;
      render(msg);
    });
  });

  var backdrop = false;
  overlay.addEventListener(PTR_DOWN, function (e) {
    backdrop = e.target === overlay;
  }, true);
  overlay.addEventListener("click", function (e) {
    if (Date.now() - openedAt < 350) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target === overlay && backdrop) close(false);
  }, true);
  overlay.addEventListener("keydown", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;
    e.stopPropagation();

    if (e.key === "SoftLeft") {
      e.preventDefault();
      softLeftAction();
      return;
    }
    if (e.key === "SoftRight" || e.key === "Escape") {
      e.preventDefault();
      close(false);
      return;
    }

    var active = document.activeElement;
    if (e.key === "Backspace") {
      if (active && active.tagName === "INPUT" && (active.value || "").length > 0) return;
      e.preventDefault();
      close(false);
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
      if (active && active.tagName === "INPUT" && typeof active.selectionStart === "number" && active.selectionStart > 0) return;
      e.preventDefault();
      moveFocus("left");
      return;
    }
    if (e.key === "ArrowRight") {
      if (active && active.tagName === "INPUT" && typeof active.selectionStart === "number" && active.selectionStart < (active.value || "").length) return;
      e.preventDefault();
      moveFocus("right");
      return;
    }
  });
  overlay.addEventListener("keyup", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;
    e.stopPropagation();
  });

  window.addEventListener("resize", function () {
    if (!overlay.hidden) updateSoftkeys();
  });

  form.name = queryParam("btname") || stored() || "Player" + rnd(2);
  fresh();

  function mount() {
    document.body.appendChild(overlay);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  return {
    ask: ask,
    status: status,
    state: function () { return current; },
    name: function () { return form.name; },
    watch: function (fn) { watchers.push(fn); },
    change: function () { if (handler && overlay.hidden) handler(); },
    copy: function (btn) { copy(btn, current.room); },
    onSwitch: function (fn) { handler = fn; },
    isOpen: function () { return !overlay.hidden; }
  };
})();