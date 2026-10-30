/*
 * 画面の動き：現在地の表示、座席番号の入力、座席図の上へのルート表示
 */
(function () {
  "use strict";

  var V = window.VENUE;
  var R = window.SeatRoute;
  var graph = R.buildGraph(V);
  var SVG_NS = "http://www.w3.org/2000/svg";
  var STORAGE_KEY = "seat-guide:last-seat";

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    hereText: $("here-text"),
    herePicker: $("here-picker"),
    fromSelect: $("from-select"),
    form: $("seat-form"),
    block: $("block-select"),
    rowField: $("row-field"),
    row: $("row-select"),
    seat: $("seat-input"),
    avoid: $("avoid-stairs"),
    error: $("form-error"),
    map: $("map"),
    result: $("result"),
    summary: $("result-summary"),
    steps: $("steps"),
    note: $("result-note")
  };

  var blocksById = {};
  V.blocks.forEach(function (b) { blocksById[b.id] = b; });

  // ───────── 現在地

  // QRのURLの「?from=gate-B21」から現在地を知る。QRのID（?from=qr-002）でも受け付ける。
  function readFromParam() {
    var v = new URLSearchParams(location.search).get("from");
    if (!v) return null;
    if (graph.nodes[v]) return v;
    var qr = V.qrCodes.filter(function (q) { return q.id === v; })[0];
    return qr ? qr.node : null;
  }

  var currentFrom = readFromParam();

  function selectableNodes() {
    return V.nodes.filter(function (n) { return n.type === "gate" || n.type === "core" || n.type === "lounge"; });
  }

  function fillFromSelect() {
    var groups = [
      { label: "下段のゲート", test: function (n) { return n.type === "gate" && n.floor === "L"; } },
      { label: "上段のゲート", test: function (n) { return n.type === "gate" && n.floor === "U"; } },
      { label: "階段・エレベーター・ラウンジ（仮）", test: function (n) { return n.type !== "gate"; } }
    ];
    var nodes = selectableNodes();
    els.fromSelect.innerHTML = "";
    var ph = new Option("選んでください", "");
    els.fromSelect.add(ph);
    groups.forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = g.label;
      nodes.filter(g.test).forEach(function (n) { og.appendChild(new Option(n.name, n.id)); });
      els.fromSelect.appendChild(og);
    });
    els.fromSelect.value = currentFrom || "";
  }

  function renderHere() {
    els.hereText.innerHTML = "";
    if (currentFrom) {
      var n = graph.nodes[currentFrom];
      els.hereText.append("あなたは今 ");
      var s = document.createElement("strong");
      s.textContent = n.name.replace(/（.*）$/, "") + (n.type === "gate" ? "前" : "");
      els.hereText.append(s, " にいます");
    } else {
      els.hereText.textContent = "近くのQRコードを読むと、現在地が自動で入ります。読まずに使う場合は、下で今いる場所を選んでください。";
      els.herePicker.open = true;
    }
  }

  // ───────── 座席番号の入力

  function fillBlocks() {
    els.block.innerHTML = "";
    els.block.add(new Option("選んでください", ""));
    V.blockGroups.forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = g.name;
      V.blocks.filter(function (b) { return b.group === g.id; }).forEach(function (b) {
        og.appendChild(new Option(b.id, b.id));
      });
      els.block.appendChild(og);
    });
  }

  function fillRows() {
    var b = blocksById[els.block.value];
    var prev = els.row.value;
    els.row.innerHTML = "";
    if (!b || !b.rows) {
      els.rowField.hidden = !!b;
      els.row.add(new Option("-", ""));
      return;
    }
    els.rowField.hidden = false;
    els.row.add(new Option("選択", ""));
    for (var r = b.rows[0]; r <= b.rows[1]; r++) els.row.add(new Option(r + "列", String(r)));
    if (prev) els.row.value = prev;
  }

  function saveSeat(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* 保存できなくても案内は続ける */ }
  }

  function loadSeat() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { return null; }
  }

  function readForm() {
    var b = blocksById[els.block.value];
    if (!b) return { error: "ブロックを選んでください。" };
    var row = b.rows ? parseInt(els.row.value, 10) : null;
    if (b.rows && !row) return { error: "列を選んでください。" };
    var num = els.seat.value ? parseInt(els.seat.value, 10) : null;
    if (b.rows && !num) return { error: "番（席の番号）を入れてください。" };
    if (num !== null && (num < 1 || num > V.maxSeatNumber)) return { error: "番は 1〜" + V.maxSeatNumber + " の数字で入れてください。" };
    return { block: b, seat: { row: row, number: num } };
  }

  // ───────── 座席図（拡大・移動）

  var view = { x: 0, y: 0, w: V.mapWidth, h: V.mapHeight };
  var layer = { route: null, pins: null };

  function el(name, attrs, parent) {
    var e = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function applyView() {
    els.map.setAttribute("viewBox", [view.x, view.y, view.w, view.h].join(" "));
  }

  function clampView() {
    var minW = V.mapWidth / 8;
    var maxW = V.mapWidth;
    if (view.w < minW) { view.h *= minW / view.w; view.w = minW; }
    if (view.w > maxW) { view.h *= maxW / view.w; view.w = maxW; }
    view.x = Math.min(Math.max(view.x, -view.w * 0.3), V.mapWidth - view.w * 0.7);
    view.y = Math.min(Math.max(view.y, -view.h * 0.3), V.mapHeight - view.h * 0.7);
  }

  function zoomAt(factor, cx, cy) {
    var nw = view.w / factor;
    var nh = view.h / factor;
    view.x = cx - (cx - view.x) * (nw / view.w);
    view.y = cy - (cy - view.y) * (nh / view.h);
    view.w = nw;
    view.h = nh;
    clampView();
    applyView();
  }

  function fitTo(points, pad) {
    if (!points.length) { view = { x: 0, y: 0, w: V.mapWidth, h: V.mapHeight }; applyView(); return; }
    var xs = points.map(function (p) { return p[0]; });
    var ys = points.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    var y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    var ratio = V.mapWidth / V.mapHeight;
    var w = Math.max(x1 - x0, (y1 - y0) * ratio, V.mapWidth / 4);
    var h = w / ratio;
    view = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h };
    clampView();
    applyView();
  }

  function svgPoint(clientX, clientY) {
    var r = els.map.getBoundingClientRect();
    return [view.x + ((clientX - r.left) / r.width) * view.w, view.y + ((clientY - r.top) / r.height) * view.h];
  }

  function setupMap() {
    els.map.setAttribute("preserveAspectRatio", "xMidYMid meet");
    el("image", { href: V.mapImage, x: 0, y: 0, width: V.mapWidth, height: V.mapHeight }, els.map);
    layer.route = el("g", {}, els.map);
    layer.pins = el("g", {}, els.map);
    applyView();

    // ドラッグで移動、2本指で拡大縮小
    var pointers = {};
    var last = null;
    els.map.addEventListener("pointerdown", function (e) {
      els.map.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = [e.clientX, e.clientY];
      els.map.classList.add("dragging");
    });
    els.map.addEventListener("pointermove", function (e) {
      if (!pointers[e.pointerId]) return;
      var ids = Object.keys(pointers);
      var r = els.map.getBoundingClientRect();
      if (ids.length === 1) {
        var p = pointers[e.pointerId];
        view.x -= ((e.clientX - p[0]) / r.width) * view.w;
        view.y -= ((e.clientY - p[1]) / r.height) * view.h;
        clampView();
        applyView();
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
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) last = null;
      if (!Object.keys(pointers).length) els.map.classList.remove("dragging");
    }
    els.map.addEventListener("pointerup", end);
    els.map.addEventListener("pointercancel", end);
    els.map.addEventListener("wheel", function (e) {
      e.preventDefault();
      var c = svgPoint(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, c[0], c[1]);
    }, { passive: false });

    $("zoom-in").addEventListener("click", function () { zoomAt(1.4, view.x + view.w / 2, view.y + view.h / 2); });
    $("zoom-out").addEventListener("click", function () { zoomAt(1 / 1.4, view.x + view.w / 2, view.y + view.h / 2); });
    $("zoom-fit").addEventListener("click", function () { fitTo(lastFitPoints, 120); });
  }

  var lastFitPoints = [];

  function drawLabel(parent, pos, text, below) {
    var g = el("g", { "class": "pin-label" }, parent);
    var w = text.length * 30 + 24;
    var y = below ? pos[1] + 40 : pos[1] - 88;
    el("rect", { x: pos[0] - w / 2, y: y, width: w, height: 46, rx: 10 }, g);
    var t = el("text", { x: pos[0], y: y + 33, "text-anchor": "middle" }, g);
    t.textContent = text;
  }

  function drawHere(pos) {
    var g = el("g", { "class": "pin-here" }, layer.pins);
    el("circle", { "class": "pulse", cx: pos[0], cy: pos[1], r: 48 }, g);
    el("circle", { cx: pos[0], cy: pos[1], r: 20 }, g);
    drawLabel(layer.pins, pos, "現在地", false);
  }

  function drawSeat(pos, label) {
    var g = el("g", { "class": "pin-seat", transform: "translate(" + pos[0] + "," + pos[1] + ")" }, layer.pins);
    el("path", { d: "M0 0 C -10 -22 -30 -32 -30 -52 A 30 30 0 1 1 30 -52 C 30 -32 10 -22 0 0 Z" }, g);
    el("circle", { cx: 0, cy: -52, r: 10, fill: "#fff" }, g);
    drawLabel(layer.pins, pos, label, true);
  }

  function clearOverlay() {
    layer.route.innerHTML = "";
    layer.pins.innerHTML = "";
  }

  function drawRoute(result, block) {
    clearOverlay();
    var pts = result.path.map(function (id) { return graph.nodes[id].pos; });
    var gatePos = graph.nodes[block.gate].pos;
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" ");
    if (pts.length > 1) {
      el("path", { "class": "route-halo", d: d }, layer.route);
      el("path", { "class": "route-line", d: d }, layer.route);
    }
    var last = "M" + gatePos[0] + " " + gatePos[1] + " L" + block.pos[0] + " " + block.pos[1];
    el("path", { "class": "route-halo", d: last }, layer.route);
    el("path", { "class": "route-last", d: last }, layer.route);
    drawHere(pts[0]);
    drawSeat(block.pos, block.id);
    lastFitPoints = pts.concat([block.pos]);
    fitTo(lastFitPoints, 120);
  }

  function drawHereOnly() {
    clearOverlay();
    if (currentFrom) {
      var pos = graph.nodes[currentFrom].pos;
      drawHere(pos);
      lastFitPoints = [pos];
      fitTo([pos], 400);
    } else {
      lastFitPoints = [];
      fitTo([], 0);
    }
  }

  // ───────── 結果の表示

  function showResult(r) {
    els.summary.textContent = r.seatLabel + " まで、約" + r.totalMeters + "m（歩いて約" + r.minutes + "分）";
    els.steps.innerHTML = "";
    r.steps.forEach(function (s) {
      var li = document.createElement("li");
      if (s.kind === "seat") li.className = "seat-step";
      li.appendChild(document.createTextNode(s.text));
      if (s.sub) {
        var sub = document.createElement("span");
        sub.className = "sub";
        sub.textContent = s.sub;
        li.appendChild(sub);
      }
      els.steps.appendChild(li);
    });
    els.note.textContent = r.tentative
      ? "※ このルートには仮の通路・位置データが含まれています。現地の案内表示やスタッフの案内を優先してください。"
      : "";
    els.note.className = r.tentative ? "note warn" : "note";
    els.result.hidden = false;
  }

  function route(scroll) {
    els.error.textContent = "";
    if (!currentFrom) {
      els.error.textContent = "先に現在地を選んでください（QRを読むと自動で入ります）。";
      els.herePicker.open = true;
      return;
    }
    var f = readForm();
    if (f.error) { els.error.textContent = f.error; return; }
    saveSeat({ block: f.block.id, row: f.seat.row, number: f.seat.number, avoidStairs: els.avoid.checked });
    var r = R.describe(V, graph, currentFrom, f.block, f.seat, { avoidStairs: els.avoid.checked });
    if (!r) {
      els.error.textContent = "ルートが見つかりませんでした。スタッフにお尋ねください。";
      return;
    }
    drawRoute(r, f.block);
    showResult(r);
    if (scroll) els.map.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ───────── はじめに

  fillFromSelect();
  renderHere();
  fillBlocks();
  setupMap();

  var saved = loadSeat();
  if (saved && blocksById[saved.block]) {
    els.block.value = saved.block;
    fillRows();
    if (saved.row) els.row.value = String(saved.row);
    if (saved.number) els.seat.value = saved.number;
    els.avoid.checked = !!saved.avoidStairs;
  } else {
    fillRows();
  }

  els.block.addEventListener("change", fillRows);
  els.form.addEventListener("submit", function (e) { e.preventDefault(); route(true); });
  els.fromSelect.addEventListener("change", function () {
    currentFrom = els.fromSelect.value || null;
    // 選び直した現在地をURLにも反映（再読み込みしても保たれるように）
    var url = new URL(location.href);
    if (currentFrom) url.searchParams.set("from", currentFrom); else url.searchParams.delete("from");
    history.replaceState(null, "", url);
    renderHere();
    if (currentFrom && loadSeat()) route(false); else drawHereOnly();
  });

  // QRを読み直したとき、座席番号を覚えていればすぐにルートを出す
  if (currentFrom && saved && blocksById[saved.block]) route(false);
  else drawHereOnly();
})();
