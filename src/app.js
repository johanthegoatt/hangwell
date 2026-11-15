// Hangwell page glue: read the frames and wall, run the engine in core.js, draw
// a to-scale picture of the wall with the nails marked, and list the exact nail
// height off the floor and spot across the wall for each frame. All the maths
// lives in core.js so it can be tested without a browser. Lengths on screen are
// in whatever unit you pick; the engine always works in cm, so we convert on
// the way in and out.
(function () {
  "use strict";
  var H = window.Hangwell;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = "http://www.w3.org/2000/svg";

  var unitEl = $("unit"), wallEl = $("wall"), eyeEl = $("eye"), dropEl = $("drop"), wallTypeEl = $("walltype");
  var framesEl = $("frames"), addEl = $("add"), out = $("out"), preview = $("preview");

  var unit = "cm";
  // Each frame row holds its own inputs. We keep a small list of ids so we can
  // read them back and remove rows.
  var rows = [];
  var nextId = 1;

  function unitStep() { return unit === "in" ? "0.25" : "1"; }
  function unitLabel() { return unit; }

  // Default sizes shown in a fresh frame, in the current unit.
  function defaults() {
    return unit === "in"
      ? { width: 16, height: 20, weight: 2 }
      : { width: 40, height: 50, weight: 2 };
  }

  function addFrame(preset) {
    var id = nextId++;
    var d = preset || defaults();
    var row = document.createElement("div");
    row.className = "frow";
    row.dataset.id = id;
    row.innerHTML =
      '<span class="frow-n"></span>' +
      '<label class="mini">Width<span class="with-unit"><input type="number" class="f-w" min="0" step="' + unitStep() + '" inputmode="decimal" value="' + d.width + '"><span class="unit">' + unitLabel() + '</span></span></label>' +
      '<label class="mini">Height<span class="with-unit"><input type="number" class="f-h" min="0" step="' + unitStep() + '" inputmode="decimal" value="' + d.height + '"><span class="unit">' + unitLabel() + '</span></span></label>' +
      '<label class="mini">Weight<span class="with-unit"><input type="number" class="f-wt" min="0" step="0.5" inputmode="decimal" value="' + d.weight + '"><span class="unit">kg</span></span></label>' +
      '<button type="button" class="frow-x" aria-label="Remove this frame">&times;</button>';
    framesEl.appendChild(row);
    rows.push(id);

    row.querySelector(".frow-x").addEventListener("click", function () {
      if (rows.length <= 1) return; // always keep one frame
      framesEl.removeChild(row);
      rows = rows.filter(function (r) { return r !== id; });
      renumber();
      render();
    });
    row.querySelectorAll("input").forEach(function (el) {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });
    renumber();
  }

  function renumber() {
    var ns = framesEl.querySelectorAll(".frow-n");
    for (var i = 0; i < ns.length; i++) ns[i].textContent = (i + 1) + ".";
    // Hide the remove button when only one frame is left.
    var xs = framesEl.querySelectorAll(".frow-x");
    for (var j = 0; j < xs.length; j++) xs[j].style.visibility = xs.length > 1 ? "visible" : "hidden";
  }

  function readFrames() {
    var list = [];
    framesEl.querySelectorAll(".frow").forEach(function (row) {
      var w = parseFloat(row.querySelector(".f-w").value) || 0;
      var h = parseFloat(row.querySelector(".f-h").value) || 0;
      var wt = parseFloat(row.querySelector(".f-wt").value) || 0;
      list.push({ width: H.toCm(w, unit), height: H.toCm(h, unit), weight: wt });
    });
    return list;
  }

  function show(valueCm, dp) {
    var v = H.fromCm(valueCm, unit);
    return H.round(v, dp == null ? (unit === "in" ? 1 : 0) : dp);
  }

  function readSettings() {
    return {
      wallWidth: H.toCm(parseFloat(wallEl.value) || 0, unit),
      eyeLevel: H.toCm(parseFloat(eyeEl.value) || 0, unit),
      wireDrop: H.toCm(parseFloat(dropEl.value) || 0, unit),
      wall: wallTypeEl.value
    };
  }

  function drawPreview(plan, settings) {
    preview.innerHTML = "";
    if (!plan.frames.length || !plan.wallWidth) { preview.style.display = "none"; return; }
    preview.style.display = "block";

    // Fit the wall into a fixed viewbox. Show floor to a touch above the
    // tallest frame's top, so the eye-level line and the frames are all visible.
    var topMost = plan.frames.reduce(function (m, f) { return Math.max(m, f.topOfFrame); }, settings.eyeLevel);
    var wallH = Math.max(topMost + 20, 180);
    var W = 620, Hpx = 300, pad = 18;
    var sx = (W - pad * 2) / plan.wallWidth;
    var sy = (Hpx - pad * 2) / wallH;
    var s = Math.min(sx, sy);
    var offX = (W - plan.wallWidth * s) / 2;
    var floorY = Hpx - pad;
    function X(cm) { return offX + cm * s; }
    function Y(cm) { return floorY - cm * s; } // cm is height off the floor

    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + Hpx);
    svg.setAttribute("class", "wallsvg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Scale drawing of the wall with each frame and nail marked");

    function rect(x, y, w, h, cls) {
      var r = document.createElementNS(SVGNS, "rect");
      r.setAttribute("x", x); r.setAttribute("y", y);
      r.setAttribute("width", Math.max(0, w)); r.setAttribute("height", Math.max(0, h));
      r.setAttribute("class", cls);
      svg.appendChild(r); return r;
    }
    function line(x1, y1, x2, y2, cls) {
      var l = document.createElementNS(SVGNS, "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1);
      l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("class", cls);
      svg.appendChild(l); return l;
    }
    function dot(cx, cy) {
      var c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", cx); c.setAttribute("cy", cy);
      c.setAttribute("r", 3.4); c.setAttribute("class", "nail");
      svg.appendChild(c);
    }
    function text(x, y, str, cls) {
      var t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", x); t.setAttribute("y", y);
      t.setAttribute("class", cls);
      t.textContent = str;
      svg.appendChild(t);
    }

    // Wall panel and floor.
    rect(X(0), Y(wallH), plan.wallWidth * s, wallH * s, "wall-bg");
    line(X(0) - 6, floorY, X(plan.wallWidth) + 6, floorY, "floor");

    // Eye-level line.
    line(X(0), Y(settings.eyeLevel), X(plan.wallWidth), Y(settings.eyeLevel), "eyeline");
    text(X(plan.wallWidth) - 2, Y(settings.eyeLevel) - 5, "eye level", "eyelabel");

    // Frames and nails.
    plan.frames.forEach(function (f) {
      rect(X(f.left), Y(f.topOfFrame), f.width * s, f.height * s, "frame");
      f.hooks.forEach(function (hx) { dot(X(hx), Y(f.nailHeight)); });
    });

    preview.appendChild(svg);
  }

  function frameLine(f, i) {
    var hooks = f.hooks.map(function (hx) { return show(hx) + " " + unit; }).join(" and ");
    var fx = H.fixing({ weight: f.weight, wall: $("walltype").value });
    return '<li class="plan ' + fx.level + '">' +
      '<div class="plan-head"><span class="plan-n">Frame ' + (i + 1) + '</span>' +
      '<span class="plan-size">' + show(f.width) + ' &times; ' + show(f.height) + ' ' + unit + (f.weight ? ', ' + f.weight + ' kg' : '') + '</span></div>' +
      '<div class="plan-body">' +
        '<p class="plan-nail"><strong>Nail ' + show(f.nailHeight) + ' ' + unit + '</strong> off the floor' +
          (f.twoHooks ? ', two hooks at ' + hooks + ' across the wall' : ', at ' + hooks + ' across the wall') + '.</p>' +
        '<p class="plan-fix"><span class="fix-tag">' + fx.fitting + '</span> ' + fx.detail + '</p>' +
      '</div></li>';
  }

  function render() {
    var settings = readSettings();
    var framesCm = readFrames();
    // When there's more than one frame, use the gap control; a single picture
    // just centres on the wall.
    var gap = H.toCm(parseFloat($("gap").value) || 0, unit);
    var plan = H.rowPlan({
      wallWidth: settings.wallWidth,
      gap: framesCm.length > 1 ? gap : 0,
      eyeLevel: settings.eyeLevel,
      wireDrop: settings.wireDrop,
      frames: framesCm
    });

    var gapWrap = $("gap-wrap");
    gapWrap.style.display = framesCm.length > 1 ? "" : "none";

    if (!plan.frames.length || !settings.wallWidth) {
      out.innerHTML = '<p class="empty">Add your frame sizes and the wall width and the plan appears here, with a drawing of where each nail goes.</p>';
      preview.style.display = "none";
      if (window.Tack) Tack.context(null);
      return;
    }

    drawPreview(plan, settings);

    var anyHeavy = plan.frames.some(function (f) { return H.fixing({ weight: f.weight, wall: settings.wall }).level === "heavy"; });
    var anyTwoHooks = plan.frames.some(function (f) { return f.twoHooks; });

    var summary;
    if (plan.frames.length === 1) {
      var f0 = plan.frames[0];
      summary = 'Hang the middle of the picture at <strong>' + show(settings.eyeLevel) + ' ' + unit +
        '</strong>, so the nail goes <strong>' + show(f0.nailHeight) + ' ' + unit + '</strong> off the floor.';
    } else {
      summary = '<strong>' + plan.frames.length + ' frames</strong> across a <strong>' + show(settings.wallWidth) + ' ' + unit +
        '</strong> wall, ' + (plan.overflow
          ? 'but they’re <strong>wider than the wall</strong> as set — shrink the gap or drop one.'
          : 'centred with <strong>' + show(plan.gap) + ' ' + unit + '</strong> gaps and <strong>' + show(plan.sideMargin) + ' ' + unit + '</strong> each end.');
    }

    var list = plan.frames.map(frameLine).join("");
    out.innerHTML =
      '<p class="built">' + summary + '</p>' +
      (plan.overflow ? '<p class="warn">The frames and gaps add up to ' + show(plan.groupWidth) + ' ' + unit + ', more than the ' + show(plan.wallWidth) + ' ' + unit + ' wall.</p>' : '') +
      '<ul class="planlist">' + list + '</ul>';

    if (window.Tack) Tack.context({
      count: plan.frames.length,
      overflow: plan.overflow,
      anyHeavy: anyHeavy,
      anyTwoHooks: anyTwoHooks
    });
  }

  // Keep the inputs in the URL so a link rebuilds the same plan.
  function toQuery() {
    var q = new URLSearchParams();
    q.set("u", unit);
    q.set("wall", wallEl.value);
    q.set("eye", eyeEl.value);
    q.set("drop", dropEl.value);
    q.set("wt", wallTypeEl.value);
    if (rows.length > 1) q.set("gap", $("gap").value);
    var fr = [];
    framesEl.querySelectorAll(".frow").forEach(function (row) {
      fr.push([row.querySelector(".f-w").value, row.querySelector(".f-h").value, row.querySelector(".f-wt").value].join("x"));
    });
    q.set("f", fr.join(","));
    return q.toString();
  }

  function fromQuery() {
    if (!location.search) { addFrame(); return; }
    var q = new URLSearchParams(location.search);
    if (q.get("u") === "in") { unit = "in"; unitEl.value = "in"; }
    if (q.has("wall")) wallEl.value = q.get("wall");
    if (q.has("eye")) eyeEl.value = q.get("eye");
    if (q.has("drop")) dropEl.value = q.get("drop");
    if (q.has("wt")) wallTypeEl.value = q.get("wt");
    if (q.has("gap")) $("gap").value = q.get("gap");
    var f = q.get("f");
    if (f) {
      f.split(",").forEach(function (part) {
        var p = part.split("x");
        addFrame({ width: parseFloat(p[0]) || 0, height: parseFloat(p[1]) || 0, weight: parseFloat(p[2]) || 0 });
      });
    }
    if (!rows.length) addFrame();
  }

  // Switching unit converts the numbers already typed so the plan stays the
  // same size, just shown in the other unit.
  function switchUnit(to) {
    if (to === unit) return;
    var fromU = unit;
    function conv(el, dp) {
      var v = parseFloat(el.value);
      if (!isFinite(v)) return;
      el.value = H.round(H.fromCm(H.toCm(v, fromU), to), dp);
    }
    unit = to;
    conv(wallEl, to === "in" ? 1 : 0);
    conv(eyeEl, to === "in" ? 1 : 0);
    conv(dropEl, to === "in" ? 2 : 1);
    conv($("gap"), to === "in" ? 1 : 0);
    framesEl.querySelectorAll(".frow").forEach(function (row) {
      conv(row.querySelector(".f-w"), to === "in" ? 1 : 0);
      conv(row.querySelector(".f-h"), to === "in" ? 1 : 0);
    });
    // Relabel the unit spans and steps.
    document.querySelectorAll(".with-unit .unit").forEach(function (sp) {
      if (sp.textContent === "cm" || sp.textContent === "in") sp.textContent = to;
    });
    document.querySelectorAll('input[type="number"]').forEach(function (inp) {
      if (inp.classList.contains("f-wt") || inp.id === "gap") return;
      if (inp.step === "1" || inp.step === "0.25") inp.step = unitStep();
    });
    render();
  }

  unitEl.addEventListener("change", function () { switchUnit(unitEl.value); });
  addEl.addEventListener("click", function () { addFrame(); render(); });
  [wallEl, eyeEl, dropEl, wallTypeEl, $("gap")].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  $("share").addEventListener("click", function () {
    var url = location.origin + location.pathname + "?" + toQuery();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        if (window.Tack) Tack.say("Link copied. Paste it to anyone and they'll see the same plan.");
      });
    } else if (window.Tack) {
      Tack.say(url);
    }
  });

  $("clear").addEventListener("click", function () {
    framesEl.innerHTML = ""; rows = [];
    wallEl.value = unit === "in" ? "60" : "150";
    eyeEl.value = unit === "in" ? "57" : "145";
    dropEl.value = unit === "in" ? "2" : "5";
    $("gap").value = unit === "in" ? "4" : "10";
    wallTypeEl.value = "plasterboard";
    addFrame();
    history.replaceState(null, "", location.pathname);
    render();
  });

  fromQuery();
  render();
})();
