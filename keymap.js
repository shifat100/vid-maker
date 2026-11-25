(function () {
  var KEYS = {
    ArrowUp: -1, ArrowDown: -2, ArrowLeft: -3, ArrowRight: -4,
    Enter: -5, SoftLeft: -6, SoftRight: -7,
    Backspace: -8, Delete: -8,
    Escape: -11, GoBack: -11, BrowserBack: -11,
    "*": 42, Asterisk: 42, Multiply: 42,
    "#": 35, Hash: 35
  };
  var BUTTONS = {
    up: -1, down: -2, left: -3, right: -4, ok: -5,
    choice: -6, back: -7, ret: -11, clear: -8,
    star: 42, pound: 35
  };
  var ROTATE = {
    "90": { "-1": -3, "-4": -1, "-2": -4, "-3": -2, "50": 52, "54": 50, "56": 54, "52": 56 },
    "-90": { "-1": -4, "-3": -1, "-2": -3, "-4": -2, "50": 54, "52": 50, "56": 52, "54": 56 }
  };
  var NAMES = {
    "-1": "up", "-2": "down", "-3": "left", "-4": "right",
    "-5": "ok", "-6": "soft1", "-7": "soft2", "-8": "clear", "-11": "back"
  };
  var CODES = {
    KeyQ: -6,
    KeyE: -7,
    NumpadMultiply: 42,
    NumpadDivide: 35
  };

  for (var d = 0; d <= 9; d++) {
    KEYS[String(d)] = 48 + d;
    BUTTONS["num" + d] = 48 + d;
  }

  var held = {}, reps = {}, down = {}, physicalDown = {};
  var softHeldAt = {};
  var activeEditor = null;

  var T9_KEYS = {
    num1: ".,?!1'-@:/()",
    num2: "abc2",
    num3: "def3",
    num4: "ghi4",
    num5: "jkl5",
    num6: "mno6",
    num7: "pqrs7",
    num8: "tuv8",
    num9: "wxyz9",
    num0: " 0",
    star: "+*-_=<>#$%&"
  };
  var t9State = { keyId: null, idx: 0, timer: 0, mode: "abc" };

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (el.matches) {
        if (el.matches(selector)) return el;
      } else if (el.mozMatchesSelector) {
        if (el.mozMatchesSelector(selector)) return el;
      } else if (el.webkitMatchesSelector) {
        if (el.webkitMatchesSelector(selector)) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function isVisibleOverlay(id) {
    var el = document.getElementById(id);
    return !!(el && !el.hidden && el.style.display !== "none");
  }

  function isOverlayOpen() {
    return (window.Panel && Panel.isOpen && Panel.isOpen()) ||
      (window.Files && Files.isOpen && Files.isOpen()) ||
      isVisibleOverlay("panel") ||
      isVisibleOverlay("files") ||
      isVisibleOverlay("btroom");
  }

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
  }

  function isInEditorLayer(el) {
    return !!(el && closest(el, "#editor-layer"));
  }

  function hideT9Hud() {
    var hud = document.getElementById("t9-hud");
    if (hud) hud.hidden = true;
  }

  function showT9Hud(text) {
    var hud = document.getElementById("t9-hud");
    if (!hud) return;
    hud.textContent = text;
    hud.hidden = false;
  }

  function commitT9() {
    if (t9State.timer) {
      clearTimeout(t9State.timer);
      t9State.timer = 0;
    }
    t9State.keyId = null;
    t9State.idx = 0;
    hideT9Hud();
  }

  function dispatchEditorInput(ed) {
    if (!ed) return;
    try {
      ed.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (err) {
      var ev = document.createEvent("Event");
      ev.initEvent("input", true, true);
      ed.dispatchEvent(ev);
    }
  }

  function editorText(ed) {
    return ed.isContentEditable ? (ed.textContent || "") : (ed.value || "");
  }

  function replaceLastEditorChar(ed, ch, replacePrev) {
    if (!ed) return;
    if (ed.isContentEditable) {
      var txt = ed.textContent || "";
      ed.textContent = (replacePrev && txt.length ? txt.slice(0, -1) : txt) + ch;
    } else {
      var val = ed.value || "";
      var start = typeof ed.selectionStart === "number" ? ed.selectionStart : val.length;
      var end = typeof ed.selectionEnd === "number" ? ed.selectionEnd : start;
      if (replacePrev && start > 0) start--;
      ed.value = val.slice(0, start) + ch + val.slice(end);
      var pos = start + ch.length;
      if (ed.setSelectionRange) {
        try { ed.setSelectionRange(pos, pos); } catch (err) {}
      }
    }
    dispatchEditorInput(ed);
  }

  function backspaceEditor(ed) {
    if (!ed) return;
    commitT9();
    if (ed.isContentEditable) {
      var txt = ed.textContent || "";
      if (txt.length) ed.textContent = txt.slice(0, -1);
    } else {
      var val = ed.value || "";
      var start = typeof ed.selectionStart === "number" ? ed.selectionStart : val.length;
      var end = typeof ed.selectionEnd === "number" ? ed.selectionEnd : start;
      if (end > start) {
        ed.value = val.slice(0, start) + val.slice(end);
      } else if (start > 0) {
        ed.value = val.slice(0, start - 1) + val.slice(end);
        start--;
      }
      if (ed.setSelectionRange) {
        try { ed.setSelectionRange(start, start); } catch (err) {}
      }
    }
    dispatchEditorInput(ed);
  }

  function formatT9Char(ch) {
    if (t9State.mode === "ABC") return ch.toUpperCase();
    return ch;
  }

  function handleVirtualT9(keyId, ed) {
    if (!ed) return false;
    if (keyId === "clear") {
      backspaceEditor(ed);
      return true;
    }
    if (keyId === "pound") {
      commitT9();
      t9State.mode = t9State.mode === "abc" ? "Abc" : t9State.mode === "Abc" ? "ABC" : t9State.mode === "ABC" ? "123" : "abc";
      showT9Hud("T9: " + t9State.mode);
      setTimeout(hideT9Hud, 1200);
      return true;
    }
    if (!(keyId in T9_KEYS)) return false;

    if (t9State.mode === "123" || ed.type === "number" || ed.type === "tel") {
      commitT9();
      var digit = keyId === "star" ? "*" : keyId.replace("num", "");
      replaceLastEditorChar(ed, digit, false);
      return true;
    }

    var pool = T9_KEYS[keyId];
    var sameKey = t9State.keyId === keyId && t9State.timer;
    if (t9State.timer) clearTimeout(t9State.timer);

    if (sameKey) {
      t9State.idx = (t9State.idx + 1) % pool.length;
      replaceLastEditorChar(ed, formatT9Char(pool.charAt(t9State.idx)), true);
    } else {
      t9State.keyId = keyId;
      t9State.idx = 0;
      var ch = pool.charAt(0);
      if (t9State.mode === "Abc") {
        var cur = editorText(ed);
        var cap = !cur.length || /[.!?]\s$/.test(cur);
        ch = cap ? ch.toUpperCase() : ch;
      } else {
        ch = formatT9Char(ch);
      }
      replaceLastEditorChar(ed, ch, false);
    }
    showT9Hud(t9State.mode + ": " + formatT9Char(pool.charAt(t9State.idx)));
    t9State.timer = setTimeout(commitT9, 850);
    return true;
  }

  function rotated(code) {
    var rot = typeof config !== "undefined" && config ? config.rotate : 0;
    var map = ROTATE[rot];
    if (map && map[code] !== undefined) code = map[code];
    if (NAMES[code] && typeof config !== "undefined" && config && config.keys && config.keys[NAMES[code]] !== undefined) {
      return config.keys[NAMES[code]];
    }
    return code;
  }

  function setTimer(fn, ms) {
    return typeof vmSetTimeout === "function" ? vmSetTimeout(fn, ms) : setTimeout(fn, ms);
  }

  function clearTimer(id) {
    if (!id) return;
    if (typeof vmClearTimeout === "function") vmClearTimeout(id);
    else clearTimeout(id);
  }

  function sendPress(code) {
    if (typeof MIDP !== "undefined" && MIDP.sendKeyPress) MIDP.sendKeyPress(code);
  }

  function sendRelease(code) {
    if (typeof MIDP !== "undefined" && MIDP.sendKeyRelease) MIDP.sendKeyRelease(code);
  }

  function sendRepeat(code) {
    if (typeof MIDP !== "undefined" && MIDP.sendKeyRepeat) MIDP.sendKeyRepeat(code);
  }

  function press(code) {
    code = rotated(code);
    var d = down[code];
    if (d && d.timer) {
      clearTimer(d.timer);
      sendRelease(code);
    }
    var frames = typeof MIDP !== "undefined" ? (MIDP.frames | 0) : 0;
    down[code] = { frame: frames, time: performance.now() };
    sendPress(code);
  }

  function release(code) {
    code = rotated(code);
    var d = down[code];
    if (!d) return sendRelease(code);
    (function check() {
      var frames = typeof MIDP !== "undefined" ? (MIDP.frames | 0) : 0;
      if (frames - d.frame < 2 && performance.now() - d.time < 250) {
        d.timer = setTimer(check, 16);
        return;
      }
      if (down[code] === d) delete down[code];
      sendRelease(code);
    })();
  }

  function releaseAll() {
    Object.keys(held).forEach(function (id) {
      hold(id, null);
      delete held[id];
    });
    Object.keys(physicalDown).forEach(function (tok) {
      delete physicalDown[tok];
    });
    Object.keys(down).forEach(function (c) {
      if (!down[c].timer) {
        delete down[c];
        sendRelease(+c);
      }
    });
    softHeldAt = {};
  }

  function toggleMenu() {
    releaseAll();
    if (window.Panel && Panel.toggle) Panel.toggle();
    else {
      var gear = document.getElementById("gear");
      if (gear) gear.click();
    }
  }

  function keyToken(e) {
    if (e.code && e.code !== "N/A" && e.code !== "Unidentified") return e.code;
    if (e.keyCode) return "kc:" + e.keyCode + ":" + (e.location || 0);
    return "key:" + e.key;
  }

  function keyOf(e) {
    if (e.code && e.code in CODES) return CODES[e.code];
    if (e.code === "Numpad5" && e.key === "Clear") return -5;
    if (e.key && e.key in KEYS) return KEYS[e.key];
    if (!e.key || e.key === "Unidentified") {
      var kc = e.keyCode;
      if (kc >= 48 && kc <= 57) return kc;
      if (kc >= 96 && kc <= 105) return 48 + (kc - 96);
      if (kc === 170 || kc === 106) return 42;
      if (kc === 163 || kc === 111) return 35;
      if (kc === 37) return -3;
      if (kc === 38) return -1;
      if (kc === 39) return -4;
      if (kc === 40) return -2;
      if (kc === 13) return -5;
      if (kc === 8) return -8;
      if (kc === 27) return -11;
    }
    return null;
  }

  document.addEventListener("focusin", function (e) {
    if (isInEditorLayer(e.target)) activeEditor = e.target;
  }, true);

  window.addEventListener("keydown", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;

    if (e.key === "Call" || e.key === "F10" || e.key === "ContextMenu") {
      e.preventDefault();
      if (!e.repeat) toggleMenu();
      return;
    }

    if (isOverlayOpen()) return;

    if (isEditable(e.target)) {
      if (isInEditorLayer(e.target) && (e.key === "SoftLeft" || e.key === "SoftRight") && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        var sk = e.key === "SoftLeft" ? -6 : -7;
        var skTok = keyToken(e);
        if (e.repeat) sendRepeat(rotated(sk));
        else {
          physicalDown[skTok] = sk;
          press(sk);
        }
      }
      return;
    }

    var k = keyOf(e);
    if (k === null) return;

    e.preventDefault();

    if (!e.repeat && (k === -6 || k === -7)) {
      var now = performance.now();
      softHeldAt[k] = now;
      var other = k === -6 ? -7 : -6;
      if (softHeldAt[other] && now - softHeldAt[other] < 350) {
        toggleMenu();
        return;
      }
    }

    var tok = keyToken(e);
    if (e.repeat) {
      sendRepeat(rotated(physicalDown[tok] !== undefined ? physicalDown[tok] : k));
    } else {
      physicalDown[tok] = k;
      press(k);
    }
  });

  window.addEventListener("keyup", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;
    var tok = keyToken(e);
    if (tok in physicalDown) {
      var pressed = physicalDown[tok];
      delete physicalDown[tok];
      if (pressed === -6 || pressed === -7) delete softHeldAt[pressed];
      if (rotated(pressed) in down) release(pressed);
      return;
    }
    if (isOverlayOpen() || isEditable(e.target)) return;
    var k = keyOf(e);
    if (k !== null && rotated(k) in down) release(k);
  }, true);

  window.addEventListener("blur", releaseAll);

  function keyAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var key = el && closest(el, ".key");
    return key && key.id in BUTTONS ? key : null;
  }

  function isEditorActiveNow() {
    var ed = document.activeElement;
    if (isInEditorLayer(ed)) return ed;
    if (activeEditor && document.body.contains(activeEditor)) {
      var layer = document.getElementById("editor-layer");
      if (layer && activeEditor.offsetParent !== null) return activeEditor;
    }
    return null;
  }

  function hold(id, key) {
    var prev = held[id];
    if (prev === key) return;
    clearTimer(reps[id]);
    if (prev) {
      prev.classList.remove("down");
      if (!prev._t9Consumed) release(BUTTONS[prev.id]);
      delete prev._t9Consumed;
    }
    if (key) {
      key.classList.add("down");
      held[id] = key;
      var ed = isEditorActiveNow();
      if (ed && handleVirtualT9(key.id, ed)) {
        key._t9Consumed = true;
        return;
      }
      press(BUTTONS[key.id]);
      reps[id] = setTimer(function tick() {
        sendRepeat(rotated(BUTTONS[key.id]));
        reps[id] = setTimer(tick, 100);
      }, 450);
    } else if (id in held) {
      held[id] = null;
    }
  }

  function pointerDownHandler(id, x, y, target, e) {
    if (closest(target, "#btroom, #panel, #files, .kaios-softkeys")) return;
    var key = keyAt(x, y);
    if (!key) return;
    e.preventDefault();
    held[id] = null;
    hold(id, key);
  }

  function pointerMoveHandler(id, x, y) {
    if (!(id in held)) return;
    hold(id, keyAt(x, y));
  }

  function pointerUpHandler(id) {
    if (!(id in held)) return;
    hold(id, null);
    delete held[id];
  }

  if ("PointerEvent" in window) {
    document.addEventListener("pointerdown", function (e) {
      pointerDownHandler(e.pointerId, e.clientX, e.clientY, e.target, e);
    });
    document.addEventListener("pointermove", function (e) {
      pointerMoveHandler(e.pointerId, e.clientX, e.clientY);
    });
    document.addEventListener("pointerup", function (e) { pointerUpHandler(e.pointerId); });
    document.addEventListener("pointercancel", function (e) { pointerUpHandler(e.pointerId); });
  } else {
    document.addEventListener("touchstart", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        pointerDownHandler("t:" + t.identifier, t.clientX, t.clientY, e.target, e);
      }
    });
    document.addEventListener("touchmove", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        pointerMoveHandler("t:" + t.identifier, t.clientX, t.clientY);
      }
    });
    document.addEventListener("touchend", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) pointerUpHandler("t:" + e.changedTouches[i].identifier);
    });
    document.addEventListener("touchcancel", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) pointerUpHandler("t:" + e.changedTouches[i].identifier);
    });
    document.addEventListener("mousedown", function (e) {
      if (e.button === 0) pointerDownHandler("mouse", e.clientX, e.clientY, e.target, e);
    });
    document.addEventListener("mousemove", function (e) {
      pointerMoveHandler("mouse", e.clientX, e.clientY);
    });
    document.addEventListener("mouseup", function () { pointerUpHandler("mouse"); });
  }

  document.addEventListener("contextmenu", function (e) {
    if (closest(e.target, "#keypad")) e.preventDefault();
  });
})();