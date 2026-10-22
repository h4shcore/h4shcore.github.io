(function () {
  var root = document.documentElement;

  /* ---------- themes: green / amber / gruvbox / solarized light ---------- */
  var THEMES = ["dark", "amber", "gruvbox", "bios", "light"];
  var NAMES = { dark: "Green", amber: "Amber", gruvbox: "Gruvbox", bios: "BIOS", light: "Solarized" };
  var toggle = document.getElementById("theme-toggle");

  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (THEMES.indexOf(t) > -1) return t;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function label() { if (toggle) toggle.textContent = "Theme: " + NAMES[currentTheme()]; }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    label();
  }
  function cycleTheme() { setTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]); }
  if (toggle) toggle.addEventListener("click", cycleTheme);
  label();

  /* ---------- active nav link ---------- */
  document.querySelectorAll("nav a").forEach(function (a) {
    var p = new URL(a.href).pathname;
    if (p !== "/" && location.pathname.indexOf(p) === 0) a.classList.add("active");
  });

  /* ---------- effects toggle (lite mode) ---------- */
  var fxBtn = document.getElementById("fx-toggle");
  function fxOn() { return root.getAttribute("data-fx") !== "off"; }
  function syncFx() {
    if (fxBtn) fxBtn.textContent = "FX: " + (fxOn() ? "On" : "Off");
  }
  if (fxBtn) fxBtn.addEventListener("click", function () {
    var on = !fxOn();
    if (on) root.removeAttribute("data-fx"); else root.setAttribute("data-fx", "off");
    try { localStorage.setItem("fx", on ? "on" : "off"); } catch (e) {}
    syncFx();
  });
  syncFx();

  /* ---------- CRT power-on ---------- */
  function powerOn() {
    if (!fxOn()) return;
    root.classList.add("poweron");
    setTimeout(function () { root.classList.remove("poweron"); }, 600);
  }

  /* ---------- toast ---------- */
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  /* ---------- konami code ---------- */
  var seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var pos = 0;
  window.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === seq[pos]) {
      pos++;
      if (pos === seq.length) {
        pos = 0;
        setTheme("gruvbox");
        root.classList.add("glitch");
        setTimeout(function () { root.classList.remove("glitch"); }, 900);
        toast("ACCESS GRANTED: you are now root");
      }
    } else {
      pos = k === seq[0] ? 1 : 0;
    }
  });

  /* ---------- command prompt ( / or Ctrl+K ) ---------- */
  (function initPalette() {
    var data = document.getElementById("cmd-data");
    if (!data) return;
    var items = [].slice.call(data.querySelectorAll("a")).map(function (a) {
      return { label: a.textContent.trim(), group: a.getAttribute("data-group") || "", href: a.getAttribute("href"), action: a.getAttribute("data-action") };
    });
    var box = document.createElement("div");
    box.id = "cmd";
    box.innerHTML = '<div class="cmd-box"><div class="cmd-input"><span class="prompt">$</span>' +
      '<input id="cmd-q" type="text" autocomplete="off" spellcheck="false" placeholder="cd ..."></div>' +
      '<ul id="cmd-list"></ul><div class="cmd-hint">up/down select - enter open - esc close</div></div>';
    document.body.appendChild(box);
    var q = box.querySelector("#cmd-q"), list = box.querySelector("#cmd-list");
    var shown = [], sel = 0;

    function run(it) {
      close();
      if (it.action === "theme") { cycleTheme(); return; }
      location.href = it.href;
    }
    function render() {
      var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      shown = items.filter(function (it) {
        var h = (it.label + " " + it.group).toLowerCase();
        return terms.every(function (t) { return h.indexOf(t) > -1; });
      }).slice(0, 8);
      if (sel >= shown.length) sel = Math.max(0, shown.length - 1);
      list.innerHTML = "";
      shown.forEach(function (it, i) {
        var li = document.createElement("li");
        if (i === sel) li.className = "sel";
        var a = document.createElement("span"); a.textContent = it.label;
        var g = document.createElement("span"); g.className = "grp"; g.textContent = "[" + it.group + "]";
        li.appendChild(a); li.appendChild(g);
        li.addEventListener("mousedown", function (e) { e.preventDefault(); run(it); });
        list.appendChild(li);
      });
      if (!shown.length) {
        var none = document.createElement("li");
        none.textContent = "bash: command not found";
        list.appendChild(none);
      }
    }
    function open() { box.classList.add("open"); q.value = ""; sel = 0; render(); q.focus(); }
    function close() { box.classList.remove("open"); q.blur(); }

    q.addEventListener("input", function () { sel = 0; render(); });
    q.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (shown.length) { sel = (sel + 1) % shown.length; render(); } }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (shown.length) { sel = (sel - 1 + shown.length) % shown.length; render(); } }
      else if (e.key === "Enter") { e.preventDefault(); if (shown[sel]) run(shown[sel]); }
      else if (e.key === "Escape") { close(); }
    });
    box.addEventListener("mousedown", function (e) { if (e.target === box) close(); });
    var btn = document.getElementById("cmd-open");
    if (btn) btn.addEventListener("click", open);
    window.addEventListener("keydown", function (e) {
      var typing = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
      if ((e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault(); open();
      }
    });
  })();

  /* ---------- typewriter ---------- */
  function typeEl(el, speed, cb) {
    var nodes = [], full = [];
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(function (n) { full.push(n.nodeValue); n.nodeValue = ""; });
    el.style.visibility = "visible";
    var i = 0, j = 0;
    (function step() {
      if (i >= nodes.length) { if (cb) cb(); return; }
      if (/^\s*$/.test(full[i]) || j >= full[i].length) {
        if (/^\s*$/.test(full[i])) nodes[i].nodeValue = full[i];
        i++; j = 0; return step();
      }
      nodes[i].nodeValue = full[i].slice(0, ++j);
      setTimeout(step, speed);
    })();
  }

  function startTypewriter() {
    if (!root.classList.contains("js-type")) return;
    var els = [].slice.call(document.querySelectorAll("[data-type]"));
    var reveals = [].slice.call(document.querySelectorAll("[data-reveal]"));
    if (!els.length) return;
    try { sessionStorage.setItem("typed", "1"); } catch (e) {}
    var k = 0;
    (function next() {
      if (k >= els.length) {
        reveals.forEach(function (r, i) {
          setTimeout(function () { r.classList.add("revealed"); }, i * 250);
        });
        return;
      }
      var el = els[k++];
      typeEl(el, parseInt(el.getAttribute("data-type"), 10) || 30, next);
    })();
  }

  /* ---------- linux boot log ---------- */
  var boot = document.getElementById("boot");
  if (!root.classList.contains("booting") || !boot) {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) powerOn();
    startTypewriter();
    return;
  }

  var out = document.getElementById("boot-text");
  var title = boot.getAttribute("data-title") || "portfolio";
  var author = (boot.getAttribute("data-author") || "root").toLowerCase().replace(/\s+/g, "");
  var host = boot.getAttribute("data-host") || "zeus";
  var alive = true, finished = false, t = 0;

  function later(fn, ms) { setTimeout(function () { if (alive) fn(); }, ms); }

  function finish() {
    if (finished) return;
    finished = true; alive = false;
    try { sessionStorage.setItem("booted", "1"); } catch (e) {}
    boot.classList.add("off");
    setTimeout(function () {
      root.classList.remove("booting");
      powerOn();
      startTypewriter();
    }, 350);
  }

  ["keydown", "click", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, finish, { once: true });
  });

  function ts() {
    t += Math.random() * 0.35;
    var s = t.toFixed(6);
    while (s.length < 11) s = " " + s;
    return "[" + s + "]";
  }
  function addLine(kind, text) {
    var d = document.createElement("div");
    if (kind === "ok") {
      var s = document.createElement("span");
      s.className = "ok"; s.textContent = "  OK  ";
      d.appendChild(document.createTextNode("["));
      d.appendChild(s);
      d.appendChild(document.createTextNode("] " + text));
    } else if (kind === "k") {
      d.textContent = ts() + " " + text;
    } else {
      d.textContent = text || "\u00a0";
    }
    out.appendChild(d);
  }

  var lines = [
    ["raw", "Loading Linux " + host + " ..."],
    ["raw", "Loading initial ramdisk ..."],
    ["raw", ""],
    ["k", "Linux version 6.x (" + author + "@" + host + ")"],
    ["k", "Command line: root=/dev/nvme0n1p2 quiet splash"],
    ["k", "Memory: 640K available (enough for anybody)"],
    ["k", "systemd[1]: Detected architecture x86-64."],
    ["ok", "Mounted /home/portfolio."],
    ["ok", "Reached target Local File Systems."],
    ["ok", "Started nix-daemon.service."],
    ["ok", "Started dotfiles.service."],
    ["ok", "Started " + title.toLowerCase().replace(/\s+/g, "-") + ".service."],
    ["ok", "Reached target Graphical Interface."],
    ["raw", ""],
    ["raw", host + " login: guest (automatic login)"],
    ["raw", ""]
  ];
  var i = 0;

  function nextLine() {
    if (i >= lines.length) { later(finish, 500); return; }
    var l = lines[i++];
    addLine(l[0], l[1]);
    later(nextLine, l[0] === "raw" && !l[1] ? 70 : 60 + Math.random() * 110);
  }
  nextLine();
})();
