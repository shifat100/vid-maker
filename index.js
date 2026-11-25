(function () {
  var apps = document.getElementById("apps");
  var empty = document.getElementById("empty");
  var uploadInput = document.getElementById("upload");
  var about = document.getElementById("about-box");
  var aboutCard = about.querySelector(".about");
  var optMenu = document.getElementById("opt-menu");
  var t9Bar = document.getElementById("t9-bar");
  var skBar = document.getElementById("softkeys");
  var skLeft = document.getElementById("sk-left");
  var skCenter = document.getElementById("sk-center");
  var skRight = document.getElementById("sk-right");

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

  var focusedKey = null;
  var tileMeta = {};
  var menuState = null;
  var t9Query = "";
  var t9Matches = [];
  var t9Cursor = 0;

  function append(parent) {
    for (var i = 1; i < arguments.length; i++) {
      var child = arguments[i];
      if (child != null) {
        parent.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
      }
    }
    return parent;
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/([^\w-])/g, "\\$1");
  }

  function isKaiOSMode() {
    var uaKai = /\bKAIOS\b/i.test(navigator.userAgent || "");
    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    return uaKai || (Math.min(w, h) <= 280 && Math.max(w, h) <= 360);
  }

  function updateUIProfile() {
    var compact = isKaiOSMode();
    document.body.classList.toggle("kaios-ui", compact);
    skBar.hidden = !compact;
    updateSoftkeys();
  }

  function allTiles() {
    return Array.prototype.slice.call(apps.querySelectorAll(".app"));
  }

  function focusedTile() {
    if (!focusedKey) return null;
    return apps.querySelector('.app[data-key="' + cssEscape(focusedKey) + '"]');
  }

  function scrollInside(container, el) {
    if (!container || !el) return;
    var cRect = container.getBoundingClientRect();
    var eRect = el.getBoundingClientRect();
    if (eRect.top < cRect.top) container.scrollTop -= (cRect.top - eRect.top) + 4;
    else if (eRect.bottom > cRect.bottom) container.scrollTop += (eRect.bottom - cRect.bottom) + 4;
  }

  function setFocusedTile(el, shouldFocusDom) {
    var list = allTiles();
    for (var i = 0; i < list.length; i++) list[i].classList.remove("kbd-focus");
    if (!el) {
      focusedKey = null;
      updateSoftkeys();
      return;
    }
    focusedKey = el.dataset.key;
    el.classList.add("kbd-focus");
    scrollInside(apps, el);
    if (shouldFocusDom && el.focus) {
      try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
    }
    updateSoftkeys();
  }

  function ensureSelection() {
    var list = allTiles();
    if (!list.length) {
      setFocusedTile(null, false);
      return null;
    }
    var cur = focusedTile();
    if (!cur) {
      cur = list[0];
      setFocusedTile(cur, false);
    }
    return cur;
  }

  function refreshEmpty() {
    empty.hidden = apps.children.length > 0;
    ensureSelection();
  }

  function updateSoftkeys() {
    if (skBar.hidden) return;
    if (!about.hidden) {
      skLeft.textContent = "";
      skCenter.textContent = tr("ЗАКРЫТЬ", "CLOSE");
      skRight.textContent = tr("Назад", "Back");
      return;
    }
    if (menuState) {
      skLeft.textContent = tr("Назад", "Back");
      skCenter.textContent = tr("ВЫБРАТЬ", "SELECT");
      skRight.textContent = tr("Закрыть", "Close");
      return;
    }
    skLeft.textContent = tr("Добавить", "Add .jar");
    skCenter.textContent = apps.children.length ? tr("ОТКРЫТЬ", "OPEN") : tr("ДОБАВИТЬ", "ADD");
    skRight.textContent = apps.children.length ? tr("Опции", "Options") : tr("О сайте", "About");
  }

  function tile(info, local) {
    var a = document.createElement("a");
    var key = (local ? "l:" : "s:") + info.file;
    a.className = "app" + (local ? " local" : "");
    a.href = "main.html?jar=" + (local ? LocalJars.PREFIX : "jar/") + encodeURIComponent(info.file);
    a.dataset.key = key;
    if (local) a.dataset.mine = tr("моё", "mine");
    tileMeta[key] = { info: info, local: local };

    var img = document.createElement("div");
    img.className = "icon";
    var src = local ? info.icon && URL.createObjectURL(info.icon) : info.icon && "__icon?jar=" + encodeURIComponent(info.file);
    if (src) img.style.backgroundImage = "url('" + src + "')";
    else img.textContent = (info.name || "?").charAt(0).toUpperCase();

    var meta = document.createElement("div");
    meta.className = "app-meta";
    var name = document.createElement("span");
    name.className = "name";
    name.textContent = info.name;
    var vendor = document.createElement("span");
    vendor.className = "vendor";
    vendor.textContent = info.vendor || info.file;
    append(meta, name, vendor);

    a.addEventListener("focus", function () {
      setFocusedTile(a, false);
    });
    append(a, img, meta, menuButton(a, info, local));
    return a;
  }

  function closeMenu() {
    if (!menuState) return;
    optMenu.hidden = true;
    optMenu.textContent = "";
    menuState = null;
    updateSoftkeys();
    var cur = focusedTile();
    if (cur && cur.focus) {
      try { cur.focus({ preventScroll: true }); } catch (err) { cur.focus(); }
    }
  }

  function focusMenuIndex(idx) {
    if (!menuState || !menuState.items.length) return;
    var n = menuState.items.length;
    menuState.idx = ((idx % n) + n) % n;
    for (var i = 0; i < n; i++) {
      menuState.items[i].classList.toggle("kbd-focus", i === menuState.idx);
    }
    var target = menuState.items[menuState.idx];
    if (target.focus) {
      try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
    }
    scrollInside(menuState.box, target);
  }

  function addMenuAction(box, items, label, confirmLabel, action) {
    var item = document.createElement("button");
    item.type = "button";
    item.className = "opt-item";
    item.textContent = label;
    item.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirmLabel && !item.classList.contains("confirm")) {
        item.classList.add("confirm");
        item.textContent = confirmLabel;
        return;
      }
      closeMenu();
      action();
    });
    box.appendChild(item);
    items.push(item);
  }

  function openOptionsFor(a, info, local) {
    closeMenu();
    var box = document.createElement("div");
    box.className = "opt-box";
    var title = document.createElement("div");
    title.className = "opt-title";
    title.textContent = info ? info.name : tr("Меню", "Menu");
    box.appendChild(title);

    var items = [];
    if (a && info) {
      var jar = (local ? LocalJars.PREFIX : "jar/") + info.file;
      addMenuAction(box, items, tr("Открыть", "Open"), null, function () {
        a.click();
      });
      addMenuAction(box, items, tr("Очистить данные", "Clear data"), tr("Точно очистить?", "Clear data?"), function () {
        LocalJars.clearData(jar);
      });
      if (Object.keys(Settings.game(LocalJars.storageId(info.file))).length) {
        addMenuAction(box, items, tr("Сбросить настройки", "Reset settings"), tr("Точно сбросить?", "Reset settings?"), function () {
          Settings.resetGame(LocalJars.storageId(info.file));
        });
      }
      if (local) {
        addMenuAction(box, items, tr("Удалить", "Delete"), tr("Точно удалить?", "Delete?"), function () {
          remove(a, info.file, jar);
        });
      }
    }
    addMenuAction(box, items, tr("Добавить .jar", "Add .jar"), null, function () {
      uploadInput.click();
    });
    addMenuAction(box, items, tr("Об эмуляторе", "About"), null, function () {
      toggleAbout(true);
    });

    optMenu.textContent = "";
    optMenu.appendChild(box);
    optMenu.hidden = false;
    menuState = { box: box, items: items, idx: 0 };
    focusMenuIndex(0);
    updateSoftkeys();
  }

  function menuButton(a, info, local) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "more";
    btn.title = tr("Действия", "Actions");
    btn.textContent = "⋮";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setFocusedTile(a, false);
      openOptionsFor(a, info, local);
    });
    return btn;
  }

  function remove(a, file, jar) {
    var next = a.nextSibling;
    var prev = a.previousSibling;
    a.remove();
    delete tileMeta[a.dataset.key];
    if (focusedKey === a.dataset.key) {
      var fallback = (next && next.classList && next.classList.contains("app")) ? next : (prev && prev.classList && prev.classList.contains("app")) ? prev : null;
      focusedKey = fallback ? fallback.dataset.key : null;
    }
    refreshEmpty();
    LocalJars.remove(file).then(function () {
      return LocalJars.clearData(jar);
    }).catch(function () {
      apps.insertBefore(a, next);
      tileMeta[a.dataset.key] = { info: { file: file }, local: true };
      refreshEmpty();
    });
  }

  var menuBackdrop = false;
  optMenu.addEventListener(PTR_DOWN, function (e) { menuBackdrop = e.target === optMenu; });
  optMenu.addEventListener("click", function (e) {
    if (e.target === optMenu && menuBackdrop) closeMenu();
  });

  var aboutBackdrop = false;
  function toggleAbout(open) {
    about.hidden = !open;
    updateSoftkeys();
    if (open) {
      aboutCard.scrollTop = 0;
      if (aboutCard.focus) {
        try { aboutCard.focus({ preventScroll: true }); } catch (err) { aboutCard.focus(); }
      }
    } else {
      var cur = focusedTile();
      if (cur && cur.focus) {
        try { cur.focus({ preventScroll: true }); } catch (err) { cur.focus(); }
      }
    }
  }
  document.getElementById("about").addEventListener("click", function () { toggleAbout(true); });
  about.querySelector(".about-close").addEventListener("click", function () { toggleAbout(false); });
  about.addEventListener(PTR_DOWN, function (e) { aboutBackdrop = e.target === about; });
  about.addEventListener("click", function (e) {
    if (e.target === about && aboutBackdrop) toggleAbout(false);
  });

  function navigateApps(dir) {
    var list = allTiles();
    if (!list.length) return;
    var cur = ensureSelection();
    var idx = list.indexOf(cur);
    if (idx < 0) idx = 0;

    var rects = list.map(function (el) {
      var r = el.getBoundingClientRect();
      return { el: el, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, h: r.height || 36 };
    });
    var c = rects[idx];
    var multiCol = rects.some(function (r) { return Math.abs(r.cx - c.cx) > 20; });

    if (!multiCol) {
      if (dir === "up" || dir === "left") idx = (idx - 1 + list.length) % list.length;
      else idx = (idx + 1) % list.length;
      setFocusedTile(list[idx], true);
      return;
    }

    if (dir === "left") {
      idx = (idx - 1 + list.length) % list.length;
      setFocusedTile(list[idx], true);
      return;
    }
    if (dir === "right") {
      idx = (idx + 1) % list.length;
      setFocusedTile(list[idx], true);
      return;
    }

    var rowTol = Math.max(12, c.h * 0.45);
    var bestIdx = -1;
    var bestScore = Infinity;
    for (var i = 0; i < rects.length; i++) {
      if (i === idx) continue;
      var dy = dir === "down" ? rects[i].cy - c.cy : c.cy - rects[i].cy;
      if (dy <= rowTol) continue;
      var score = dy * 2 + Math.abs(rects[i].cx - c.cx);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      bestIdx = dir === "down" ? 0 : list.length - 1;
    }
    setFocusedTile(list[bestIdx], true);
  }

  function t9Regex(query) {
    var parts = [];
    for (var i = 0; i < query.length; i++) {
      var ch = query.charAt(i);
      var chars = T9_MAP[ch] || ch;
      parts.push("[" + chars.replace(/[\\\]^-]/g, "\\$&") + "]");
    }
    return new RegExp(parts.join(""), "i");
  }

  function renderT9Bar() {
    if (!t9Query) {
      t9Bar.hidden = true;
      t9Bar.textContent = "";
      return;
    }
    t9Bar.hidden = false;
    t9Bar.textContent = "T9: " + t9Query + " (" + (t9Matches.length ? (t9Cursor + 1) + "/" + t9Matches.length : "0") + ") · * " + tr("след.", "next") + " · ⌫";
  }

  function runT9Search(keepCursor) {
    if (!t9Query) {
      t9Matches = [];
      t9Cursor = 0;
      renderT9Bar();
      return;
    }
    var re = t9Regex(t9Query);
    var prefixRe = new RegExp("(?:^|[\\s._-])" + re.source, "i");
    var list = allTiles();
    var primary = [];
    var secondary = [];
    for (var i = 0; i < list.length; i++) {
      var nameEl = list[i].querySelector(".name");
      var text = nameEl ? nameEl.textContent : "";
      if (prefixRe.test(text)) primary.push(list[i]);
      else if (re.test(text)) secondary.push(list[i]);
    }
    t9Matches = primary.concat(secondary);
    if (!keepCursor || t9Cursor >= t9Matches.length) t9Cursor = 0;
    if (t9Matches.length) setFocusedTile(t9Matches[t9Cursor], true);
    renderT9Bar();
  }

  function clearT9() {
    if (!t9Query) return;
    t9Query = "";
    t9Matches = [];
    t9Cursor = 0;
    renderT9Bar();
  }

  function activateSoftLeft() {
    if (!about.hidden) {
      toggleAbout(false);
      return;
    }
    if (menuState) {
      closeMenu();
      return;
    }
    uploadInput.click();
  }

  function activateSoftCenter() {
    if (!about.hidden) {
      toggleAbout(false);
      return;
    }
    if (menuState) {
      menuState.items[menuState.idx].click();
      return;
    }
    var cur = ensureSelection();
    if (cur) cur.click();
    else uploadInput.click();
  }

  function activateSoftRight() {
    if (!about.hidden) {
      toggleAbout(false);
      return;
    }
    if (menuState) {
      closeMenu();
      return;
    }
    var cur = ensureSelection();
    if (cur) {
      var meta = tileMeta[cur.dataset.key];
      openOptionsFor(cur, meta && meta.info, meta && meta.local);
    } else {
      toggleAbout(true);
    }
  }

  skLeft.addEventListener("click", activateSoftLeft);
  skCenter.addEventListener("click", activateSoftCenter);
  skRight.addEventListener("click", activateSoftRight);

  document.addEventListener("keydown", function (e) {
    if (e.key === "EndCall" || e.key === "MicrophoneToggle") return;

    if (!about.hidden) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        aboutCard.scrollTop += 36;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        aboutCard.scrollTop -= 36;
      } else if (e.key === "Escape" || e.key === "Backspace" || e.key === "SoftRight" || e.key === "SoftLeft" || e.key === "Enter") {
        e.preventDefault();
        toggleAbout(false);
      }
      return;
    }

    if (menuState) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusMenuIndex(menuState.idx + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusMenuIndex(menuState.idx - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        activateSoftCenter();
      } else if (e.key === "Escape" || e.key === "Backspace" || e.key === "SoftRight" || e.key === "SoftLeft") {
        e.preventDefault();
        closeMenu();
      }
      return;
    }

    if (e.key === "SoftLeft" || e.code === "KeyQ") {
      e.preventDefault();
      activateSoftLeft();
      return;
    }
    if (e.key === "SoftRight" || e.code === "KeyE") {
      e.preventDefault();
      activateSoftRight();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateApps("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateApps("down");
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateApps("left");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      navigateApps("right");
      return;
    }
    if (e.key === "Enter") {
      var active = document.activeElement;
      if (active && (active.id === "about" || active.classList.contains("btn") || active.classList.contains("more"))) return;
      var cur = ensureSelection();
      if (cur) {
        e.preventDefault();
        cur.click();
      }
      return;
    }
    if (e.key >= "0" && e.key <= "9" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      t9Query += e.key;
      runT9Search(false);
      return;
    }
    if (e.key === "*" || e.key === "Asterisk" || e.key === "Multiply") {
      if (t9Query && t9Matches.length) {
        e.preventDefault();
        t9Cursor = (t9Cursor + 1) % t9Matches.length;
        setFocusedTile(t9Matches[t9Cursor], true);
        renderT9Bar();
      }
      return;
    }
    if (e.key === "#" || e.key === "Hash") {
      e.preventDefault();
      if (t9Query) clearT9();
      else toggleAbout(true);
      return;
    }
    if (e.key === "Backspace" && t9Query) {
      e.preventDefault();
      t9Query = t9Query.slice(0, -1);
      runT9Search(false);
      return;
    }
    if (e.key === "Escape") {
      clearT9();
    }
  });

  function place(el) {
    var old = apps.querySelector('[data-key="' + cssEscape(el.dataset.key) + '"]');
    if (old) apps.replaceChild(el, old);
    else apps.insertBefore(el, apps.firstChild);
    refreshEmpty();
    return old;
  }

  function upload(files) {
    Array.prototype.forEach.call(files, function (file) {
      if (!/\.jar$/i.test(file.name)) return;
      var pending = tile({ file: file.name, name: file.name.replace(/\.jar$/i, ""), vendor: tr("Загрузка…", "Loading…") }, true);
      pending.classList.add("pending");
      var old = place(pending);
      LocalJars.add(file).then(function (info) {
        var added = tile(info, true);
        place(added);
        setFocusedTile(added, isKaiOSMode());
      }).catch(function () {
        if (old && pending.parentNode) apps.replaceChild(old, pending);
        else pending.remove();
        refreshEmpty();
      });
    });
  }

  uploadInput.addEventListener("change", function (e) {
    upload(e.target.files);
    e.target.value = "";
  });
  document.addEventListener("dragover", function (e) {
    e.preventDefault();
    document.body.classList.add("drop");
  });
  document.addEventListener("dragleave", function (e) {
    if (!e.relatedTarget) document.body.classList.remove("drop");
  });
  document.addEventListener("drop", function (e) {
    e.preventDefault();
    document.body.classList.remove("drop");
    upload(e.dataTransfer.files);
  });

  window.addEventListener("resize", updateUIProfile);
  updateUIProfile();

  Promise.all([
    LocalJars.list().catch(function () {
      return [];
    }),
    fetch("__jars").then(function (r) {
      return r.json();
    }).catch(function () {
      return [];
    })
  ]).then(function (res) {
    res[0].sort(function (a, b) {
      return a.name.localeCompare(b.name);
    }).forEach(function (info) {
      apps.appendChild(tile(info, true));
    });
    res[1].forEach(function (info) {
      apps.appendChild(tile(info, false));
    });
    refreshEmpty();
    if (isKaiOSMode()) {
      var first = ensureSelection();
      if (first) setFocusedTile(first, true);
    }
  });
})();