/*
 * 立体ビュー：各階を斜め上から見た絵（assets/floors）の上に道順を描く
 * 手順を1つずつ進め、階段・エレベーターの手順では、下の階から上の階へ
 * 移る様子をアニメーションで見せる。
 */
(function () {
  "use strict";

  var V = window.VENUE;
  var A = V.axo;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var FLOOR_ORDER = ["5F", "4F", "3F", "2F", "1F"];

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    card: $("axo-card"),
    svg: $("axo"),
    badge: $("axo-floor"),
    caption: $("axo-caption"),
    rail: $("floor-rail"),
    prev: $("step-prev"),
    next: $("step-next"),
    count: $("step-count"),
    steps: $("steps")
  };

  var state = { result: null, block: null, index: 0, viewBox: null, anim: null, shownLevel: null };

  function el(name, attrs, parent) {
    var e = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function levelOf(floorId) { return V.floors[floorId].axo; }

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

  // ───────── 表示範囲をなめらかに動かす

  function setViewBox(vb) {
    state.viewBox = vb;
    els.svg.setAttribute("viewBox", vb.join(" "));
  }

  function animateViewBox(target) {
    var from = state.viewBox || [0, 0, A.width, A.height];
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

  function fitBox(points, minW) {
    var xs = points.map(function (p) { return p[0]; });
    var ys = points.map(function (p) { return p[1]; });
    var pad = 220;
    var x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    var y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    var ratio = A.width / A.height;
    var w = Math.max(x1 - x0, (y1 - y0) * ratio, minW);
    var h = w / ratio;
    return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
  }

  // ───────── 1つの階の絵と、その階の道順

  function drawLevel(parent, level, step, opts) {
    var g = el("g", { "class": "axo-layer" }, parent);
    el("image", { href: A.levels[level].image, x: 0, y: 0, width: A.width, height: A.height }, g);
    var r = state.result;

    // この階を通る道順全体（うすく）
    r.steps.forEach(function (s) {
      if (s.points.length < 2 || levelOf(s.floor) !== level) return;
      var d = pathD(s.points.map(function (p) { return project(p, level); }));
      el("path", { "class": "axo-route-all", d: d }, g);
    });

    // いまの手順（太く、流れる線）
    if (step && levelOf(step.floor) === level && step.points.length > 1) {
      var d2 = pathD(step.points.map(function (p) { return project(p, level); }));
      el("path", { "class": "axo-route-halo", d: d2 }, g);
      el("path", { "class": "axo-route", d: d2 }, g);
      el("path", { "class": "axo-route-flow", d: d2 }, g);
    }

    // 現在地と座席の印
    var startStep = r.steps[0];
    if (levelOf(startStep.floor) === level) {
      var h = project(startStep.points[0], level);
      el("circle", { "class": "axo-here-pulse", cx: h[0], cy: h[1], r: 46 }, g);
      el("circle", { "class": "axo-here", cx: h[0], cy: h[1], r: 20 }, g);
      label(g, h, "現在地", "here");
    }
    var gateLevel = levelOf(r.steps[r.steps.length - 1].floor);
    if (gateLevel === level) {
      var s = project(state.block.pos, level);
      el("circle", { "class": "axo-seat-glow", cx: s[0], cy: s[1], r: 70 }, g);
      el("path", { "class": "axo-seat", d: "M0 0 C -12 -26 -34 -38 -34 -60 A 34 34 0 1 1 34 -60 C 34 -38 12 -26 0 0 Z", transform: "translate(" + s[0] + "," + s[1] + ")" }, g);
      label(g, s, r.seatLabel.split(" ")[0], "seat");
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

    if (opts && opts.className) g.setAttribute("class", "axo-layer " + opts.className);
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
    state.result.steps.forEach(function (s) {
      used[levelOf(s.floor)] = true;
      if (s.toFloor) used[levelOf(s.toFloor)] = true;
    });
    els.rail.innerHTML = "";
    FLOOR_ORDER.forEach(function (lv) {
      var d = document.createElement("div");
      d.className = "rail-floor" + (used[lv] ? " used" : "") + (activeLevels.indexOf(lv) >= 0 ? " active" : "") + (lv === current ? " current" : "");
      d.textContent = lv;
      els.rail.appendChild(d);
    });
  }

  // ───────── 手順の表示

  function show(index) {
    var r = state.result;
    index = Math.max(0, Math.min(r.steps.length - 1, index));
    state.index = index;
    var step = r.steps[index];
    var level = levelOf(step.floor);
    els.svg.innerHTML = "";
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
      var stage = el("g", { "class": "axo-stage " + (up ? "going-up" : "going-down") }, els.svg);
      drawLevel(stage, fromLv, step, { className: "from" });
      drawLevel(stage, toLv, step, { className: "to" });
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
      animateViewBox(fitBox([a, b], 1500));
      state.shownLevel = toLv;
      return;
    }

    var enter = "";
    if (state.shownLevel && state.shownLevel !== level) {
      enter = FLOOR_ORDER.indexOf(level) < FLOOR_ORDER.indexOf(state.shownLevel) ? "enter-from-above" : "enter-from-below";
    }
    drawLevel(els.svg, level, step, { className: enter });
    els.badge.textContent = level;
    renderRail([level], level);
    var pts = step.points.map(function (p) { return project(p, level); });
    if (step.kind === "seat") pts.push(project(state.block.pos, level));
    animateViewBox(fitBox(pts, 1300));
    state.shownLevel = level;
  }

  function render(result, block) {
    state.result = result;
    state.block = block;
    state.shownLevel = null;
    els.card.hidden = false;
    setViewBox([0, 0, A.width, A.height]);
    show(0);
  }

  els.prev.addEventListener("click", function () { show(state.index - 1); });
  els.next.addEventListener("click", function () { show(state.index + 1); });
  els.steps.addEventListener("click", function (e) {
    var li = e.target.closest("li");
    if (!li || !state.result) return;
    show(Array.prototype.indexOf.call(els.steps.children, li));
    els.card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  window.AxoView = { render: render, show: show };
})();
