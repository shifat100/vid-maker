var Files = (function () {
  var PTR_DOWN = "PointerEvent" in window ? "pointerdown" : "mousedown";
  var T9_MAP = {
    "0": "0 ",
    "1": "1._-",
    "2": "abc2абвг",
    "3": "def3дежз",
    "4": "ghi4ийкл",
    "5": "jkl5мноп",
    "6": "mno6рсту",
    "7": "pqrs7фхцч",
    "8": "tuv8шщъы",
    "9": "wxyz9ьэюя"
  };

  var overlay = el("div", "", { id: "files", hidden: true });
  var box = el("div", "panel-box fm-box", { tabIndex: -1 });
  var picker = el("input", "", { type: "file", multiple: true, hidden: true });
  var skBar = el("div", "kaios-softkeys", { id: "files-softkeys" });
  var skLeft = el("button", "kaios-sk-btn kaios-sk-left", { type: "button" });
  var skCenter = el("button", "kaios-sk-btn kaios-sk-center", { type: "button" });
  var skRight = el("button", "kaios-sk-btn kaios-sk-right", { type: "button" });

  var cwd = "/", armed = null, making = false, error = "", backdrop = false, url = null;
  var focusTargetKey = null, t9Query = "", t9Timer = 0;

  append(skBar, skLeft, skCenter, skRight);
  append(overlay, box, picker, skBar);

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

  function btn(cls, text, title, fn) {
    var b = el("button", cls, { type: "button", textContent: text, title: title || "" });
    b.addEventListener("click", fn);
    return b;
  }

  function join(dir, name) {
    return (dir === "/" ? "" : dir) + "/" + name;
  }

  function human(n) {
    if (n < 1024) return n + tr(" Б", " B");
    if (n < 1048576) return (n / 1024).toFixed(1) + tr(" КБ", " KB");
    return (n / 1048576).toFixed(1) + tr(" МБ", " MB");
  }

  function flushSafe() {
    if (typeof myflushAll === "function") myflushAll();
  }

  function entries(dir) {
    return fs.list(dir).map(function (n) {
      var isDir = n.slice(-1) === "/";
      var name = isDir ? n.slice(0, -1) : n;
      var st = fs.stat(join(dir, name)) || {};
      return { name: name, path: join(dir, name), isDir: isDir, size: st.size || 0, mtime: st.mtime };
    }).sort(function (a, b) {
      return a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name);
    });
  }

  function remove(path) {
    var st = fs.stat(path);
    if (st && st.isDir) {
      fs.list(path).forEach(function (n) {
        remove(join(path, n.replace(/\/$/, "")));
      });
    }
    return fs.remove(path);
  }

  function act(fn) {
    armed = null;
    error = "";
    fn();
    fs.syncStore();
    render();
  }

  function download(path) {
    flushSafe();
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(fs.getBlob(path));
    var a = el("a", "", { href: url, download: path.slice(path.lastIndexOf("/") + 1) });
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function upload(list) {
    act(function () {
      Array.prototype.forEach.call(list, function (f) {
        var path = join(cwd, f.name), st = fs.stat(path);
        if (st && st.isDir) error = tr("Здесь уже есть папка «" + f.name + "»", "There is already a folder “" + f.name + "” here");
        else if (st && !fs.remove(path)) error = tr("«" + f.name + "» сейчас открыт игрой", "“" + f.name + "” is open by the game");
        else fs.create(path, f);
      });
    });
  }

  function folder(name) {
    name = name.trim();
    if (!name || /[\/\\]/.test(name)) return render(tr("Недопустимое имя папки", "Invalid folder name"));
    act(function () {
      if (!fs.mkdir(join(cwd, name))) error = tr("Не удалось создать папку", "Could not create folder");
      making = false;
      focusTargetKey = null;
    });
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
        if (list[j].dataset && /^row:|^open:/.test(list[j].dataset.fk || "")) {
          match = list[j];
          break;
        }
      }
    }
    if (!match) {
      for (var k = 0; k < list.length; k++) {
        if (!list[k].classList.contains("pb-close")) {
          match = list[k];
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
    if (making) {
      skLeft.textContent = tr("Создать", "Create");
      skCenter.textContent = "OK";
      skRight.textContent = tr("Отмена", "Cancel");
    } else {
      skLeft.textContent = tr("Загрузить", "Upload");
      skCenter.textContent = tr("ОТКРЫТЬ", "OPEN");
      skRight.textContent = tr("Закрыть", "Close");
    }
  }

  function crumbs() {
    var wrap = el("div", "fm-path");
    var parts = cwd === "/" ? [] : cwd.slice(1).split("/");
    var rootBtn = btn("fm-crumb", tr("Телефон", "Phone"), "", function () { cd("/"); });
    rootBtn.dataset.fk = "crumb:0";
    wrap.appendChild(rootBtn);
    parts.forEach(function (p, i) {
      var path = "/" + parts.slice(0, i + 1).join("/");
      var b = btn("fm-crumb", p, "", function () { cd(path); });
      b.dataset.fk = "crumb:" + (i + 1);
      append(wrap, txt("span", "fm-sep", "/"), b);
    });
    return wrap;
  }

  function row(e) {
    var r = el("div", "fm-row" + (e.isDir ? " fm-dir" : ""));
    var open = btn("fm-name", "", e.isDir ? tr("Открыть", "Open") : tr("Скачать", "Download"), function () {
      if (e.isDir) cd(e.path);
      else download(e.path);
    });
    open.dataset.fk = "open:" + e.path;
    open.dataset.entryName = e.name;
    append(open, txt("span", "fm-icon", e.isDir ? "📁" : "📄"), txt("span", "fm-label", e.name));
    if (!e.isDir) open.appendChild(txt("span", "fm-meta", human(e.size)));
    r.appendChild(open);
    if (!e.isDir) {
      var dl = btn("fm-act", "⬇", tr("Скачать", "Download"), function () { download(e.path); });
      dl.dataset.fk = "dl:" + e.path;
      r.appendChild(dl);
    }
    var del = btn("fm-act del" + (armed === e.path ? " confirm" : ""), armed === e.path ? tr("Удалить?", "Delete?") : "✕", tr("Удалить", "Delete"), function () {
      if (armed !== e.path) {
        armed = e.path;
        focusTargetKey = "del:" + e.path;
        return render();
      }
      act(function () {
        if (!remove(e.path)) error = tr("«" + e.name + "» сейчас открыт игрой", "“" + e.name + "” is open by the game");
        else focusTargetKey = null;
      });
    });
    del.dataset.fk = "del:" + e.path;
    r.appendChild(del);
    return r;
  }

  function render(msg) {
    if (msg) error = msg;
    var list;
    try {
      list = entries(cwd);
    } catch (e) {
      if (cwd !== "/") return cd("/");
      list = [];
      error = tr("Файловая система ещё не готова", "File system is not ready yet");
    }
    var scroll = box.scrollTop;
    box.textContent = "";

    var head = el("div", "pb-head");
    var title = el("div", "pb-title");
    append(title,
      txt("b", "", tr("Файлы телефона", "Phone files")),
      txt("span", "", tr("Общие для всех игр: карта памяти, память телефона, сохранения", "Shared by all games: memory card, phone memory, saves")));
    var closeBtn = btn("pb-close", "✕", tr("Закрыть", "Close"), close);
    closeBtn.dataset.fk = "head:close";
    append(head, title, closeBtn);

    var tools = el("section", "fm-tools");
    tools.appendChild(crumbs());
    var bar = el("div", "fm-bar");
    var upBtn = btn("fm-btn", tr("Загрузить", "Upload"), tr("Загрузить файлы в эту папку", "Upload files to this folder"), function () { picker.click(); });
    upBtn.dataset.fk = "tool:upload";
    var mkBtn = btn("fm-btn ghost", tr("Новая папка", "New folder"), "", function () {
      making = !making;
      armed = null;
      focusTargetKey = making ? "new:name" : "tool:new";
      render();
    });
    mkBtn.dataset.fk = "tool:new";
    append(bar, upBtn, mkBtn);
    tools.appendChild(bar);

    if (making) {
      var form = el("form", "fm-new");
      var name = el("input", "", { placeholder: tr("Имя папки", "Folder name"), maxLength: 64, spellcheck: false, autocapitalize: "none" });
      name.dataset.fk = "new:name";
      var submit = el("button", "fm-btn", { type: "submit", textContent: tr("Создать", "Create") });
      submit.dataset.fk = "new:submit";
      append(form, name, submit);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        folder(name.value);
      });
      tools.appendChild(form);
    }
    if (error) tools.appendChild(txt("div", "bt-error", error));

    var rows = el("section", "fm-list");
    if (cwd !== "/") {
      var up = btn("fm-name", "", tr("Наверх", "Up"), function () { cd(fs.dirname(cwd)); });
      up.dataset.fk = "row:up";
      append(up, txt("span", "fm-icon", "↩"), txt("span", "fm-label", ".."));
      var r = el("div", "fm-row fm-dir");
      r.appendChild(up);
      rows.appendChild(r);
    }
    list.forEach(function (e) { rows.appendChild(row(e)); });
    if (!list.length) rows.appendChild(txt("div", "sub fm-empty", tr("Папка пуста. Файлы можно перетащить сюда.", "Folder is empty. Drop files here.")));

    append(box, head, tools, rows);
    box.scrollTop = scroll;
    updateSoftkeys();
    if (!overlay.hidden) restoreFocus();
  }

  function cd(path) {
    cwd = path;
    armed = null;
    making = false;
    error = "";
    focusTargetKey = null;
    box.scrollTop = 0;
    render();
  }

  function open() {
    flushSafe();
    overlay.hidden = false;
    render();
  }

  function close() {
    overlay.hidden = true;
    armed = null;
    making = false;
    error = "";
    focusTargetKey = null;
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
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
    if (bestIdx < 0) bestIdx = dir === "down" ? 0 : list.length - 1;
    setFocusEl(list[bestIdx]);
  }

  function jumpT9(digit) {
    if (t9Timer) clearTimeout(t9Timer);
    t9Query += digit;
    t9Timer = setTimeout(function () { t9Query = ""; t9Timer = 0; }, 1200);

    var parts = [];
    for (var i = 0; i < t9Query.length; i++) {
      var chars = T9_MAP[t9Query.charAt(i)] || t9Query.charAt(i);
      parts.push("[" + chars.replace(/[\\\]^-]/g, "\\$&") + "]");
    }
    var re = new RegExp(parts.join(""), "i");
    var list = focusables();
    for (var j = 0; j < list.length; j++) {
      var name = list[j].dataset && list[j].dataset.entryName;
      if (name && re.test(name)) {
        setFocusEl(list[j]);
        return;
      }
    }
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
    if (target.tagName === "INPUT" && target.form) {
      var sub = target.form.querySelector('button[type="submit"]');
      if (sub) sub.click();
      return;
    }
    target.click();
  }

  function softLeftAction() {
    if (making) {
      var inp = box.querySelector('input[data-fk="new:name"]');
      if (inp) folder(inp.value);
    } else {
      picker.click();
    }
  }

  function softRightAction() {
    if (making) {
      making = false;
      focusTargetKey = "tool:new";
      render();
    } else {
      close();
    }
  }

  skLeft.addEventListener("click", softLeftAction);
  skCenter.addEventListener("click", activateFocused);
  skRight.addEventListener("click", softRightAction);

  box.addEventListener("focusin", function (e) {
    if (e.target && e.target !== box && e.target.dataset && e.target.dataset.fk) {
      var list = focusables();
      for (var i = 0; i < list.length; i++) list[i].classList.remove("kbd-focus");
      e.target.classList.add("kbd-focus");
      focusTargetKey = e.target.dataset.fk;
    }
  });

  picker.addEventListener("change", function () {
    upload(picker.files);
    picker.value = "";
  });
  overlay.addEventListener("dragover", function (e) {
    e.preventDefault();
    overlay.classList.add("drop");
  });
  overlay.addEventListener("dragleave", function (e) {
    if (!e.relatedTarget || !overlay.contains(e.relatedTarget)) overlay.classList.remove("drop");
  });
  overlay.addEventListener("drop", function (e) {
    e.preventDefault();
    overlay.classList.remove("drop");
    upload(e.dataTransfer.files);
  });
  overlay.addEventListener(PTR_DOWN, function (e) {
    backdrop = e.target === overlay;
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay && backdrop) close();
  });
  overlay.addEventListener("keydown", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;
    e.stopPropagation();

    if (e.key === "SoftLeft"||e.key === "F1") {
      e.preventDefault();
      softLeftAction();
      return;
    }
    if (e.key === "SoftRight" || e.key === "Escape") {
      e.preventDefault();
      softRightAction();
      return;
    }

    var active = document.activeElement;
    if (e.key === "Backspace") {
      if (active && active.tagName === "INPUT" && (active.value || "").length > 0) return;
      e.preventDefault();
      if (making) softRightAction();
      else if (cwd !== "/") cd(fs.dirname(cwd));
      else close();
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
    if ((!active || active.tagName !== "INPUT") && e.key >= "0" && e.key <= "9" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      jumpT9(e.key);
    }
  });
  overlay.addEventListener("keyup", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;
    e.stopPropagation();
  });

  window.addEventListener("resize", function () {
    if (!overlay.hidden) updateSoftkeys();
  });

  function mount() {
    document.body.appendChild(overlay);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  return {
    open: open,
    close: close,
    isOpen: function () { return !overlay.hidden; }
  };
})();