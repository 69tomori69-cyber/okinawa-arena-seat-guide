/*
 * 立体ビュー：各階を斜め上から見た絵（assets/floors）の上に、現在地・座席・道順を描く
 * - 最初は現在地の階を表示し、ブロックを選ぶとその席を光らせる
 * - 道順を出したら手順を1つずつ進め、階段・エレベーターの手順では、
 *   下の階から上の階へ移る様子をアニメーションで見せる
 * - 指でドラッグして移動、2本指で拡大・縮小、ブロックをタップして選べる
 */
(function () {
  "use strict";

  var V = window.VENUE;
  var A = V.axo;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var FLOOR_ORDER = ["5F", "4F", "3F", "2F", "1F"];
  var DEFAULT_LEVEL = "2F";

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    svg: $("axo"),
    badge: $("axo-floor"),
    caption: $("axo-caption"),
    rail: $("floor-rail"),
    nav: $("axo-nav"),
    prev: $("step-prev"),
    next: $("step-next"),
    count: $("step-count"),
    steps: $("steps"),
    hint: $("axo-hint")
  };

  var nodesById = {};
  V.nodes.forEach(function (n) { nodesById[n.id] = n; });

  var state = {
    mode: "here",         // here=現在地だけ, preview=ブロックを選んだ, route=道順
    result: null,
    block: null,
    from: null,
    index: 0,
    viewBox: [0, 0, A.width, A.height],
    fitBox: null,
    anim: null,
    shownLevel: null,
    onBlockTap: null
  };

  function el(name, attrs, parent) {
    var e = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function levelOf(floorId) { return V.floors[floorId].axo; }
  function blockLevel(block) { return levelOf(nodesById[block.gate].floor); }

  // 座席図の位置 → 立体図の位置
  function project(pos, level) {
    var h = A.levels[level].homography;
    if (h) {
      var w = h[6] * pos[0] + h[7] * pos[1] + h[8];
      return [(h[0] * pos[0] + h[1] * pos[1] + h[2]) / w, (h[3] * pos[0] + h[4] * pos[1] + h[5]) / w];
    }
    var m = A.matrix;
    var lift = A.levels[level].lift;
    return [m[0] * pos[0] + m[1] * pos[1] + m[2], m[3] * pos[0] + m[4] * pos[1] + m[5] - lift];
  }

  function pathD(points) {
    return points.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  }

  // ───────── 表示範囲（拡大・移動）

  function setViewBox(vb) {
    state.viewBox = vb;
    els.svg.setAttribute("viewBox", vb.join(" "));
  }

  function clampView(vb) {
    var minW = A.width / 6, maxW = A.width * 1.1;
    var w = Math.min(Math.max(vb[2], minW), maxW);
    var h = w * A.height / A.width;
    var cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
    cx = Math.min(Math.max(cx, 0), A.width);
    cy = Math.min(Math.max(cy, 0), A.height);
    return [cx - w / 2, cy - h / 2, w, h];
  }

  function animateViewBox(target) {
    var from = state.viewBox;
    var start = performance.now();
    var dur = 550;
    if (state.anim) cancelAnimationFrame(state.anim);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setViewBox(target); return; }
    function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setViewBox(from.map(function (v, i) { return v + (target[i] - v) * e; }));
      if (t < 1) state.anim = requestAnimationFrame(tick);
    }
    state.anim = requestAnimationFrame(tick);
  }

  function fitTo(points, minW) {
    var xs = points.map(function (p) { return p[0]; });
    var ys = points.map(function (p) { return p[1]; });
    var pad = 220;
    var x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    var y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    var ratio = A.width / A.height;
    var w = Math.max(x1 - x0, (y1 - y0) * ratio, minW);
    var h = w / ratio;
    state.fitBox = [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
    animateViewBox(state.fitBox);
  }

  function zoomAt(factor, cx, cy) {
    if (state.anim) cancelAnimationFrame(state.anim);
    var vb = state.viewBox;
    var w = vb[2] / factor, h = vb[3] / factor;
    setViewBox(clampView([cx - (cx - vb[0]) * (w / vb[2]), cy - (cy - vb[1]) * (h / vb[3]), w, h]));
  }

  // 画面上の位置 → 立体図の座標（preserveAspectRatio="xMidYMid meet" を考える）
  function svgPoint(clientX, clientY) {
    var r = els.svg.getBoundingClientRect();
    var vb = state.viewBox;
    var s = Math.min(r.width / vb[2], r.height / vb[3]);
    var ox = r.left + (r.width - vb[2] * s) / 2;
    var oy = r.top + (r.height - vb[3] * s) / 2;
    return [vb[0] + (clientX - ox) / s, vb[1] + (clientY - oy) / s, s];
  }

  function setupGestures() {
    var pointers = {};
    var last = null;
    var tap = null;
    els.svg.addEventListener("pointerdown", function (e) {
      els.svg.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = [e.clientX, e.clientY];
      tap = Object.keys(pointers).length === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
      if (state.anim) cancelAnimationFrame(state.anim);
    });
    els.svg.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId]) return;
      if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) tap = null;
      var ids = Object.keys(pointers);
      if (ids.length === 1) {
        var p = pointers[e.pointerId];
        var s = svgPoint(0, 0)[2];
        var vb = state.viewBox;
        setViewBox(clampView([vb[0] - (e.clientX - p[0]) / s, vb[1] - (e.clientY - p[1]) / s, vb[2], vb[3]]));
      }
      pointers[e.pointerId] = [e.clientX, e.clientY];
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (last) {
          var c = svgPoint((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
          zoomAt(d / last, c[0], c[1]);
        }
        last = d;
      }
    });
    function end(e) {
      if (e.type === "pointerup" && tap && tap.id === e.pointerId) onTap(e.clientX, e.clientY);
      tap = null;
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) last = null;
    }
    els.svg.addEventListener("pointerup", end);
    els.svg.addEventListener("pointercancel", end);
    els.svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var c = svgPoint(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, c[0], c[1]);
    }, { passive: false });

    var center = function () { var vb = state.viewBox; return [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2]; };
    $("axo-zoom-in").addEventListener("click", function () { var c = center(); zoomAt(1.4, c[0], c[1]); });
    $("axo-zoom-out").addEventListener("click", function () { var c = center(); zoomAt(1 / 1.4, c[0], c[1]); });
    $("axo-zoom-fit").addEventListener("click", function () { if (state.fitBox) animateViewBox(state.fitBox); });
  }

  // 表示中の階にあるブロックのうち、タップした所に一番近いものを選ぶ
  function onTap(clientX, clientY) {
    if (!state.onBlockTap || !state.shownLevel) return;
    var p = svgPoint(clientX, clientY);
    var tolerance = Math.max(60, 34 / p[2]);
    var best = null, bestD = Infinity;
    V.blocks.forEach(function (b) {
      if (blockLevel(b) !== state.shownLevel) return;
      var q = project(b.pos, state.shownLevel);
      var d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < bestD) { best = b; bestD = d; }
    });
    if (best && bestD <= tolerance) state.onBlockTap(best);
  }

  // ───────── 1つの階の絵と、その上の印

  function drawLevel(parent, level, opts) {
    opts = opts || {};
    var g = el("g", { "class": "axo-layer" + (opts.className ? " " + opts.className : "") }, parent);
    el("image", { href: A.levels[level].image, x: 0, y: 0, width: A.width, height: A.height }, g);

    // 入口（ゲート）の赤い印
    V.nodes.forEach(function (n) {
      if (n.type !== "gate" || levelOf(n.floor) !== level) return;
      var q = project(n.pos, level);
      el("circle", { "class": "axo-gate", cx: q[0], cy: q[1], r: 16 }, g);
    });

    var r = state.mode === "route" ? state.result : null;
    if (r) {
      // この階を通る道順全体（うすく）
      r.steps.forEach(function (s) {
        if (s.points.length < 2 || levelOf(s.floor) !== level) return;
        el("path", { "class": "axo-route-all", d: pathD(s.points.map(function (p) { return project(p, level); })) }, g);
      });
      // いまの手順（太く、流れる線）
      var step = opts.step;
      if (step && levelOf(step.floor) === level && step.points.length > 1) {
        var d2 = pathD(step.points.map(function (p) { return project(p, level); }));
        el("path", { "class": "axo-route-halo", d: d2 }, g);
        el("path", { "class": "axo-route", d: d2 }, g);
        el("path", { "class": "axo-route-flow", d: d2 }, g);
      }
      // 階段・エレベーターの位置
      r.steps.forEach(function (st) {
        if (st.kind !== "stairs" && st.kind !== "elevator") return;
        if (levelOf(st.floor) !== level && levelOf(st.toFloor) !== level) return;
        var p = project(st.points[0], level);
        var gIcon = el("g", { "class": "axo-lift", transform: "translate(" + p[0] + "," + p[1] + ")" }, g);
        el("rect", { x: -34, y: -34, width: 68, height: 68, rx: 14 }, gIcon);
        var t = el("text", { x: 0, y: 14, "text-anchor": "middle" }, gIcon);
        t.textContent = st.kind === "stairs" ? "階" : "EV";
      });
    }

    // 現在地
    if (state.from) {
      var here = nodesById[state.from];
      if (levelOf(here.floor) === level) {
        var h = project(here.pos, level);
        el("circle", { "class": "axo-here-pulse", cx: h[0], cy: h[1], r: 46 }, g);
        el("circle", { "class": "axo-here", cx: h[0], cy: h[1], r: 20 }, g);
        label(g, h, "現在地", "here");
      }
    }

    // 座席（選んだブロック）
    if (state.block && blockLevel(state.block) === level && state.mode !== "here") {
      var s = project(state.block.pos, level);
      el("circle", { "class": "axo-seat-glow", cx: s[0], cy: s[1], r: 80 }, g);
      el("path", { "class": "axo-seat", d: "M0 0 C -12 -26 -34 -38 -34 -60 A 34 34 0 1 1 34 -60 C 34 -38 12 -26 0 0 Z", transform: "translate(" + s[0] + "," + s[1] + ")" }, g);
      label(g, s, state.block.id + "ブロック", "seat");
    }
    return g;
  }

  function label(parent, pos, text, kind) {
    var w = text.length * 40 + 30;
    var y = kind === "seat" ? pos[1] + 30 : pos[1] - 110;
    var g = el("g", { "class": "axo-label " + kind }, parent);
    el("rect", { x: pos[0] - w / 2, y: y, width: w, height: 62, rx: 14 }, g);
    var t = el("text", { x: pos[0], y: y + 45, "text-anchor": "middle" }, g);
    t.textContent = text;
  }

  // ───────── 階のレール（5F〜1F。道順で通る階に印）

  function renderRail(activeLevels, current) {
    var used = {};
    if (state.mode === "route") {
      state.result.steps.forEach(function (s) {
        used[levelOf(s.floor)] = true;
        if (s.toFloor) used[levelOf(s.toFloor)] = true;
      });
    }
    els.rail.innerHTML = "";
    FLOOR_ORDER.forEach(function (lv) {
      var d = document.createElement("div");
      d.className = "rail-floor" + (used[lv] ? " used" : "") + (activeLevels.indexOf(lv) >= 0 ? " active" : "") + (lv === current ? " current" : "");
      d.textContent = lv;
      els.rail.appendChild(d);
    });
  }

  // 1つの階だけを表示する（階が変わるときは上下からすべり込む）
  function showSingle(level, step) {
    var enter = "";
    if (state.shownLevel && state.shownLevel !== level) {
      enter = FLOOR_ORDER.indexOf(level) < FLOOR_ORDER.indexOf(state.shownLevel) ? "enter-from-above" : "enter-from-below";
    }
    els.svg.innerHTML = "";
    drawLevel(els.svg, level, { step: step, className: enter });
    els.badge.textContent = level;
    renderRail([level], level);
    state.shownLevel = level;
  }

  // ───────── 現在地だけ

  function showHere(fromId) {
    state.mode = "here";
    state.from = fromId;
    state.result = null;
    els.nav.hidden = true;
    var level = fromId ? levelOf(nodesById[fromId].floor) : DEFAULT_LEVEL;
    showSingle(level);
    if (fromId) {
      var n = nodesById[fromId];
      els.caption.textContent = "現在地：" + n.name.replace(/（.*）$/, "");
      fitTo([project(n.pos, level)], 1700);
    } else {
      els.caption.textContent = "QRコードを読むか、現在地を選ぶと、ここに表示します。";
      fitTo([[A.width * 0.2, A.height * 0.1], [A.width * 0.8, A.height * 0.85]], A.width * 0.6);
    }
    setHint("");
  }

  // ───────── ブロックを選んだ（道順を出す前）

  function preview(block, fromId) {
    state.mode = "preview";
    state.block = block;
    state.from = fromId;
    state.result = null;
    els.nav.hidden = true;
    var level = blockLevel(block);
    showSingle(level);
    els.caption.textContent = block.id + "ブロックはここです。";
    var pts = [project(block.pos, level)];
    if (fromId && levelOf(nodesById[fromId].floor) === level) pts.push(project(nodesById[fromId].pos, level));
    fitTo(pts, 1500);
    setHint("");
  }

  // ───────── 道順の手順

  function show(index) {
    var r = state.result;
    index = Math.max(0, Math.min(r.steps.length - 1, index));
    state.index = index;
    var step = r.steps[index];
    var level = levelOf(step.floor);
    els.count.textContent = (index + 1) + " / " + r.steps.length;
    els.prev.disabled = index === 0;
    els.next.disabled = index === r.steps.length - 1;
    els.caption.textContent = step.text;

    // 手順の一覧にも、いまの手順の印を付ける
    Array.prototype.forEach.call(els.steps.children, function (li, i) {
      li.classList.toggle("active", i === index);
    });

    if (step.kind === "stairs" || step.kind === "elevator") {
      // 下の階 → 上の階（または逆）へ、床ごと入れ替わるアニメーション
      var fromLv = level;
      var toLv = levelOf(step.toFloor);
      var up = FLOOR_ORDER.indexOf(toLv) < FLOOR_ORDER.indexOf(fromLv);
      els.svg.innerHTML = "";
      var stage = el("g", { "class": "axo-stage " + (up ? "going-up" : "going-down") }, els.svg);
      drawLevel(stage, fromLv, { step: step, className: "from" });
      drawLevel(stage, toLv, { step: step, className: "to" });
      var a = project(step.points[0], fromLv);
      var b = project(step.points[0], toLv);
      var arrow = el("g", { "class": "axo-climb" }, stage);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, arrow);
      var tip = up ? b : a;
      var tail = up ? a : b;
      var dir = up ? -1 : 1;
      el("path", { d: "M" + (tip[0] - 30) + " " + (tip[1] - dir * 40) + " L" + tip[0] + " " + tip[1] + " L" + (tip[0] + 30) + " " + (tip[1] - dir * 40) }, arrow);
      el("circle", { cx: tail[0], cy: tail[1], r: 12 }, arrow);
      els.badge.textContent = fromLv + " → " + toLv;
      renderRail([fromLv, toLv], toLv);
      fitTo([a, b], 1500);
      state.shownLevel = toLv;
      return;
    }

    showSingle(level, step);
    var pts = step.points.map(function (p) { return project(p, level); });
    if (step.kind === "seat") pts.push(project(state.block.pos, level));
    fitTo(pts, 1300);
  }

  function render(result, block) {
    state.mode = "route";
    state.result = result;
    state.block = block;
    state.from = result.path[0];
    els.nav.hidden = false;
    show(0);
    setHint("");
  }

  var defaultHint = null;
  function setHint(text) {
    if (defaultHint === null) defaultHint = els.hint.textContent;
    els.hint.textContent = text || defaultHint;
  }

  function init(opts) {
    state.onBlockTap = opts && opts.onBlockTap;
    els.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    setViewBox(state.viewBox);
    setupGestures();
  }

  els.prev.addEventListener("click", function () { show(state.index - 1); });
  els.next.addEventListener("click", function () { show(state.index + 1); });
  els.steps.addEventListener("click", function (e) {
    var li = e.target.closest("li");
    if (!li || state.mode !== "route") return;
    show(Array.prototype.indexOf.call(els.steps.children, li));
    $("axo-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  window.AxoView = { init: init, showHere: showHere, preview: preview, render: render, show: show, setHint: setHint };
})();
