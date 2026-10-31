/*
 * 平面図：各階を真上から見た地図を、データ（ブロック・廊下・ゲート・階段の位置）から描き、
 * その上に現在地・座席・道順を描く。
 * - 最初は現在地の階を表示し、ブロックを選ぶとその席を光らせる
 * - 道順は、地図の下のカードを指で横にスライドして1手順ずつ進む。
 *   階段・エレベーターの手順では、下の階から上の階へ移る様子をアニメーションで見せる
 * - 地図はドラッグで移動、2本指で拡大・縮小、ブロックをタップして選べる
 */
(function () {
  "use strict";

  var V = window.VENUE;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var W = V.mapWidth, H = V.mapHeight;
  var CENTER = V.courtCenter;
  var FLOOR_ORDER = ["4F", "2F"];
  var DEFAULT_LEVEL = "2F";

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    svg: $("axo"),
    badge: $("axo-floor"),
    caption: $("axo-caption"),
    rail: $("floor-rail"),
    slider: $("step-slider"),
    dots: $("step-dots"),
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
    viewBox: [0, 0, W, H],
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
  function pts(list) { return list.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function pathD(points) {
    return points.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  }

  // ───────── 平面図の形（座席図PDFの位置をもとにした簡略図）

  // コートのまわり（ブロックの内側の線）
  var APRON = [[740, 690], [1345, 690], [1395, 740], [1395, 1005], [1345, 1060], [740, 1060], [690, 1005], [690, 740]];
  // 下段スタンドの外側（座席図の紺色の八角形）
  var LOWER_OUTER = ["L-NN-W", "L-NN-E", "L-NE", "L-SE", "L-SS-E", "L-SS-W", "L-SW", "L-NW"].map(function (id) { return nodesById[id].pos; });
  // 上段スタンドの外側
  var UPPER_OUTER = [[580, 30], [1510, 30], [1700, 225], [1880, 420], [1880, 1310], [1700, 1500], [1510, 1705], [580, 1705], [95, 1230], [95, 520]];

  // 多角形を中心に向かって縮める（rate: 0〜1）
  function shrink(poly, amount) {
    return poly.map(function (p) {
      var dx = p[0] - CENTER[0], dy = p[1] - CENTER[1];
      var d = Math.hypot(dx, dy);
      return [p[0] - dx / d * amount, p[1] - dy / d * amount];
    });
  }

  // 中心から角度 a の方向に伸ばした線と多角形の交点
  function rayHit(poly, a) {
    var dx = Math.cos(a), dy = Math.sin(a);
    var best = null;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      var ex = q[0] - p[0], ey = q[1] - p[1];
      var den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      var t = ((p[0] - CENTER[0]) * ey - (p[1] - CENTER[1]) * ex) / den;
      var u = ((p[0] - CENTER[0]) * dy - (p[1] - CENTER[1]) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && (best === null || t < best)) best = t;
    }
    return [CENTER[0] + dx * best, CENTER[1] + dy * best];
  }

  function angleOf(p) { return Math.atan2(p[1] - CENTER[1], p[0] - CENTER[0]); }
  function norm(a) { while (a <= -Math.PI) a += 2 * Math.PI; while (a > Math.PI) a -= 2 * Math.PI; return a; }

  // 同じ輪の中のブロックを、中心から見た角度で区切って扇形にする
  function sectorShapes(blocks, inner, outer, maxHalf) {
    var list = blocks.map(function (b) { return { b: b, a: angleOf(b.pos) }; }).sort(function (x, y) { return x.a - y.a; });
    var n = list.length;
    var shapes = {};
    list.forEach(function (it, i) {
      var prev = list[(i - 1 + n) % n], next = list[(i + 1) % n];
      var gapPrev = norm(it.a - prev.a), gapNext = norm(next.a - it.a);
      if (n === 1) { gapPrev = gapNext = 2 * maxHalf; }
      var a0 = it.a - Math.min(gapPrev / 2, maxHalf);
      var a1 = it.a + Math.min(gapNext / 2, maxHalf);
      var gap = 0.006;
      a0 += gap; a1 -= gap;
      var steps = 6, inPts = [], outPts = [];
      for (var k = 0; k <= steps; k++) {
        var a = a0 + (a1 - a0) * k / steps;
        inPts.push(rayHit(inner, a));
        outPts.push(rayHit(outer, a));
      }
      shapes[it.b.id] = inPts.concat(outPts.reverse());
    });
    return shapes;
  }

  var BOX_INNER = shrink(LOWER_OUTER, 75);
  var UPPER_INNER = shrink(LOWER_OUTER, -45);
  // 上段：客席の外側に廊下（コンコース）がある。ゲートは客席と廊下の境目
  var UPPER_SEAT_OUT = shrink(UPPER_OUTER, 64);
  var UPPER_CONC = shrink(UPPER_OUTER, 32);
  var shapes = {};
  (function buildShapes() {
    var byGroup = function (g) { return V.blocks.filter(function (b) { return b.group === g; }); };
    Object.assign(shapes, sectorShapes(byGroup("lower"), APRON, BOX_INNER, 0.16));
    Object.assign(shapes, sectorShapes(byGroup("box"), BOX_INNER, shrink(LOWER_OUTER, 6), 0.045));
    Object.assign(shapes, sectorShapes(byGroup("upper"), UPPER_INNER, UPPER_SEAT_OUT, 0.13));
    byGroup("lounge").forEach(function (b) {
      var x = b.pos[0], y = b.pos[1];
      shapes[b.id] = [[x - 28, y - 34], [x + 28, y - 34], [x + 28, y + 34], [x - 28, y + 34]];
    });
  })();

  // 4Fの廊下・ゲート・階段は、データの位置から中心と反対向きにずらして、客席の外側に描く
  var upperNodeAt = {};
  V.nodes.forEach(function (n) { if (n.floor === "U") upperNodeAt[n.pos.join(",")] = n; });
  function place(p, level) {
    if (level !== "4F") return p;
    var n = upperNodeAt[p.join(",")];
    if (!n) return p;
    return rayHit(n.type === "gate" ? UPPER_SEAT_OUT : UPPER_CONC, angleOf(p));
  }
  function placeAll(points, level) { return points.map(function (p) { return place(p, level); }); }

  // ブロック番号の位置（上段は帯の真ん中）
  function labelPos(b) {
    if (b.group !== "upper") return b.pos;
    var a = angleOf(b.pos), i = rayHit(UPPER_INNER, a), o = rayHit(UPPER_SEAT_OUT, a);
    return [(i[0] + o[0]) / 2, (i[1] + o[1]) / 2];
  }

  // 廊下（コンコース）の線：通路データの walk のうち、廊下どうしをつなぐもの
  function concourseLines(floor) {
    return V.edges.filter(function (e) {
      var a = nodesById[e[0]], b = nodesById[e[1]];
      return (e[2] || "walk") === "walk" && a.floor === floor && b.floor === floor;
    }).map(function (e) { return [nodesById[e[0]].pos, nodesById[e[1]].pos]; });
  }

  var levelFloor = {};
  Object.keys(V.floors).forEach(function (f) { levelFloor[V.floors[f].axo] = f; });

  function drawBase(g, level) {
    var floor = levelFloor[level];
    var upper = level === "4F";
    el("rect", { "class": "fm-ground", x: -400, y: -400, width: W + 800, height: H + 800 }, g);
    el("polygon", { "class": "fm-building", points: pts(UPPER_OUTER) }, g);

    // 上の階では、下段スタンドとコートは「吹き抜けの下」としてうすく描く
    var lowerG = el("g", { "class": upper ? "fm-below" : "" }, g);
    el("polygon", { "class": "fm-bowl", points: pts(LOWER_OUTER) }, lowerG);
    el("polygon", { "class": "fm-apron", points: pts(APRON) }, lowerG);
    el("rect", { "class": "fm-court", x: 792, y: 740, width: 500, height: 267, rx: 6 }, lowerG);
    el("line", { "class": "fm-court-line", x1: 1042, y1: 740, x2: 1042, y2: 1007 }, lowerG);
    el("circle", { "class": "fm-court-line", cx: 1042, cy: 873, r: 45, fill: "none" }, lowerG);

    if (upper) {
      el("polygon", { "class": "fm-upper-ring", points: pts(UPPER_OUTER) + " " + pts(UPPER_INNER.slice().reverse()), "fill-rule": "evenodd" }, g);
    } else {
      // パノラマラウンジ（2F・東側）
      el("rect", { "class": "fm-lounge-area", x: 1815, y: 400, width: 140, height: 960, rx: 18 }, g);
    }

    // 廊下
    var lines = concourseLines(floor);
    lines.forEach(function (l) { el("path", { "class": "fm-concourse", d: pathD(placeAll(l, level)) }, g); });

    // ブロック
    V.blocks.forEach(function (b) {
      if (blockLevel(b) !== level || !shapes[b.id]) return;
      var sel = state.block && state.block.id === b.id && state.mode !== "here";
      el("polygon", { "class": "fm-block " + b.group + (sel ? " selected" : ""), points: pts(shapes[b.id]), "data-block": b.id }, g);
      var lp = labelPos(b);
      var t = el("text", { "class": "fm-block-label" + (b.group === "box" || b.group === "lounge" ? " small" : ""), x: lp[0], y: lp[1] + 9, "text-anchor": "middle" }, g);
      t.textContent = b.id;
    });

    // 階段・エレベーター
    V.nodes.forEach(function (n) {
      if (n.type !== "core" || n.floor !== floor) return;
      var cp = place(n.pos, level);
      var gi = el("g", { "class": "fm-core", transform: "translate(" + cp[0] + "," + cp[1] + ")" }, g);
      el("rect", { x: -26, y: -26, width: 52, height: 52, rx: 10 }, gi);
      var hasEv = V.edges.some(function (e) { return e[2] === "elevator" && (e[0] === n.id || e[1] === n.id); });
      var t = el("text", { x: 0, y: 10, "text-anchor": "middle" }, gi);
      t.textContent = hasEv ? "EV" : "階";
    });

    // 入口（ゲート）
    V.nodes.forEach(function (n) {
      if (n.type !== "gate" || n.floor !== floor) return;
      var gp = place(n.pos, level);
      el("circle", { "class": "fm-gate", cx: gp[0], cy: gp[1], r: 15 }, g);
      // 上段のゲート名は廊下側（外側）に出す
      var lp = upper ? rayHit(shrink(UPPER_OUTER, 4), angleOf(gp)) : [gp[0], gp[1] - 14];
      var t = el("text", { "class": "fm-gate-label", x: lp[0], y: lp[1] - 10, "text-anchor": "middle" }, g);
      t.textContent = n.id.replace("gate-", "");
    });
  }

  // ───────── 表示範囲（拡大・移動）

  function setViewBox(vb) {
    state.viewBox = vb;
    els.svg.setAttribute("viewBox", vb.join(" "));
  }

  function clampView(vb) {
    var minW = W / 6, maxW = W * 1.1;
    var w = Math.min(Math.max(vb[2], minW), maxW);
    var h = w * H / W;
    var cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
    cx = Math.min(Math.max(cx, 0), W);
    cy = Math.min(Math.max(cy, 0), H);
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
    var pad = 160;
    var x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    var y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    var ratio = W / H;
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

  // 画面上の位置 → 地図の座標（preserveAspectRatio="xMidYMid meet" を考える）
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

  // 表示中の階のブロックのうち、タップした所にあるもの（なければ一番近いもの）を選ぶ
  function onTap(clientX, clientY) {
    if (!state.onBlockTap || !state.shownLevel) return;
    var p = svgPoint(clientX, clientY);
    var tolerance = Math.max(50, 30 / p[2]);
    var best = null, bestD = Infinity;
    V.blocks.forEach(function (b) {
      if (blockLevel(b) !== state.shownLevel) return;
      var d = Math.hypot(b.pos[0] - p[0], b.pos[1] - p[1]);
      if (d < bestD) { best = b; bestD = d; }
    });
    if (best && bestD <= tolerance) state.onBlockTap(best);
  }

  // ───────── 1つの階の地図と、その上の印

  function drawLevel(parent, level, opts) {
    opts = opts || {};
    var g = el("g", { "class": "axo-layer" + (opts.className ? " " + opts.className : "") }, parent);
    drawBase(g, level);

    var r = state.mode === "route" ? state.result : null;
    if (r) {
      // この階を通る道順全体（うすく）
      r.steps.forEach(function (s) {
        if (s.points.length < 2 || levelOf(s.floor) !== level) return;
        el("path", { "class": "axo-route-all", d: pathD(placeAll(s.points, level)) }, g);
      });
      // いまの手順（太く、流れる線）
      var step = opts.step;
      if (step && levelOf(step.floor) === level && step.points.length > 1) {
        var d2 = pathD(placeAll(step.points, level));
        el("path", { "class": "axo-route-halo", d: d2 }, g);
        el("path", { "class": "axo-route", d: d2 }, g);
        el("path", { "class": "axo-route-flow", d: d2 }, g);
      }
      // 使う階段・エレベーター
      r.steps.forEach(function (st) {
        if (st.kind !== "stairs" && st.kind !== "elevator") return;
        if (levelOf(st.floor) !== level && levelOf(st.toFloor) !== level) return;
        var p = place(st.points[0], level);
        var gi = el("g", { "class": "axo-lift", transform: "translate(" + p[0] + "," + p[1] + ")" }, g);
        el("rect", { x: -32, y: -32, width: 64, height: 64, rx: 12 }, gi);
        var t = el("text", { x: 0, y: 12, "text-anchor": "middle" }, gi);
        t.textContent = st.kind === "stairs" ? "階" : "EV";
      });
    }

    // 現在地
    if (state.from) {
      var here = nodesById[state.from];
      if (levelOf(here.floor) === level) {
        var h = place(here.pos, level);
        el("circle", { "class": "axo-here-pulse", cx: h[0], cy: h[1], r: 40 }, g);
        el("circle", { "class": "axo-here", cx: h[0], cy: h[1], r: 17 }, g);
        label(g, h, "現在地", "here");
      }
    }

    // 座席（選んだブロック）
    if (state.block && blockLevel(state.block) === level && state.mode !== "here") {
      var s = state.block.pos;
      el("circle", { "class": "axo-seat-glow", cx: s[0], cy: s[1], r: 60 }, g);
      el("path", { "class": "axo-seat", d: "M0 0 C -9 -20 -26 -29 -26 -46 A 26 26 0 1 1 26 -46 C 26 -29 9 -20 0 0 Z", transform: "translate(" + s[0] + "," + s[1] + ")" }, g);
      label(g, s, state.block.id + "ブロック", "seat");
    }
    return g;
  }

  function label(parent, pos, text, kind) {
    var w = text.length * 30 + 24;
    var y = kind === "seat" ? pos[1] + 24 : pos[1] - 86;
    var g = el("g", { "class": "axo-label " + kind }, parent);
    el("rect", { x: pos[0] - w / 2, y: y, width: w, height: 48, rx: 11 }, g);
    var t = el("text", { x: pos[0], y: y + 35, "text-anchor": "middle" }, g);
    t.textContent = text;
  }

  // ───────── 階の表示（4F・2F。道順で通る階に印）

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
    hideSlider();
    var level = fromId ? levelOf(nodesById[fromId].floor) : DEFAULT_LEVEL;
    showSingle(level);
    if (fromId) {
      var n = nodesById[fromId];
      els.caption.textContent = "現在地：" + n.name.replace(/（.*）$/, "");
      fitTo([n.pos], 1150);
    } else {
      els.caption.textContent = "QRコードを読むか、現在地を選ぶと、ここに表示します。";
      fitTo([[0, 0], [W, H]], W);
    }
    setHint("");
  }

  // ───────── ブロックを選んだ（道順を出す前）

  function preview(block, fromId) {
    state.mode = "preview";
    state.block = block;
    state.from = fromId;
    state.result = null;
    hideSlider();
    var level = blockLevel(block);
    showSingle(level);
    els.caption.textContent = block.id + "ブロックはここです。";
    var p = [block.pos];
    if (fromId && levelOf(nodesById[fromId].floor) === level) p.push(nodesById[fromId].pos);
    fitTo(p, 1000);
    setHint("");
  }

  // ───────── 道順の手順（スライドするカード）

  function hideSlider() {
    els.slider.hidden = true;
    els.dots.hidden = true;
    els.slider.innerHTML = "";
    els.dots.innerHTML = "";
  }

  function buildSlider(r) {
    els.slider.innerHTML = "";
    els.dots.innerHTML = "";
    r.steps.forEach(function (s, i) {
      var card = document.createElement("div");
      card.className = "step-card" + (s.kind === "seat" ? " seat" : "");
      var head = document.createElement("div");
      head.className = "step-card-head";
      var num = document.createElement("span");
      num.className = "step-num";
      num.textContent = (i + 1) + " / " + r.steps.length;
      var fl = document.createElement("span");
      fl.className = "step-floor";
      fl.textContent = s.toFloor ? levelOf(s.floor) + " → " + levelOf(s.toFloor) : levelOf(s.floor);
      head.append(num, fl);
      var text = document.createElement("p");
      text.className = "step-text";
      text.textContent = s.text;
      card.append(head, text);
      if (s.sub) {
        var sub = document.createElement("p");
        sub.className = "step-sub";
        sub.textContent = s.sub;
        card.appendChild(sub);
      }
      if (i === 0 && r.steps.length > 1) {
        var swipe = document.createElement("p");
        swipe.className = "step-swipe";
        swipe.textContent = "← 左へスライドで次の手順";
        card.appendChild(swipe);
      }
      els.slider.appendChild(card);
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "step-dot";
      dot.setAttribute("aria-label", (i + 1) + "番目の手順");
      dot.addEventListener("click", function () { goTo(i); });
      els.dots.appendChild(dot);
    });
    els.slider.hidden = false;
    els.dots.hidden = false;
    els.slider.scrollLeft = 0;
  }

  function goTo(i) {
    var card = els.slider.children[i];
    if (card) els.slider.scrollTo({ left: i * els.slider.clientWidth, behavior: "smooth" });
  }

  // スライドが止まった位置から、いま見ている手順を求める
  var scrollTimer = null;
  els.slider.addEventListener("scroll", function () {
    if (state.mode !== "route") return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      var w = els.slider.clientWidth;
      var i = Math.round(els.slider.scrollLeft / w);
      if (i !== state.index) show(i);
    }, 90);
  });

  function show(index) {
    var r = state.result;
    index = Math.max(0, Math.min(r.steps.length - 1, index));
    state.index = index;
    var step = r.steps[index];
    var level = levelOf(step.floor);
    els.caption.textContent = r.seatLabel + " まで（" + (index + 1) + " / " + r.steps.length + "）";
    Array.prototype.forEach.call(els.dots.children, function (d, i) { d.classList.toggle("active", i === index); });
    Array.prototype.forEach.call(els.slider.children, function (c, i) { c.classList.toggle("active", i === index); });

    if (step.kind === "stairs" || step.kind === "elevator") {
      // 下の階 → 上の階（または逆）へ、地図ごと入れ替わるアニメーション
      var fromLv = level;
      var toLv = levelOf(step.toFloor);
      var up = FLOOR_ORDER.indexOf(toLv) < FLOOR_ORDER.indexOf(fromLv);
      els.svg.innerHTML = "";
      var stage = el("g", { "class": "axo-stage " + (up ? "going-up" : "going-down") }, els.svg);
      drawLevel(stage, fromLv, { step: step, className: "from" });
      drawLevel(stage, toLv, { step: step, className: "to" });
      var p = step.points[0];
      var arrow = el("g", { "class": "fm-climb", transform: "translate(" + p[0] + "," + (p[1] - 60) + ")" }, stage);
      el("circle", { r: 46 }, arrow);
      var t = el("text", { y: 16, "text-anchor": "middle" }, arrow);
      t.textContent = up ? "↑" : "↓";
      els.badge.textContent = fromLv + " → " + toLv;
      renderRail([fromLv, toLv], toLv);
      fitTo([p], 1000);
      state.shownLevel = toLv;
      return;
    }

    showSingle(level, step);
    var pp = placeAll(step.points, level);
    if (step.kind === "seat") pp.push(state.block.pos);
    fitTo(pp, 850);
  }

  function render(result, block) {
    state.mode = "route";
    state.result = result;
    state.block = block;
    state.from = result.path[0];
    state.index = 0;
    buildSlider(result);
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

  window.AxoView = { init: init, showHere: showHere, preview: preview, render: render, show: show, goTo: goTo, setHint: setHint };
})();
