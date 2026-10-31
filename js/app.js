/*
 * 画面の動き：現在地の表示、座席番号の入力、平面図の上へのルート表示
 */
(function () {
  "use strict";

  var V = window.VENUE;
  var R = window.SeatRoute;
  var graph = R.buildGraph(V);
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
    error: $("form-error"),
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

  // QRを読まずに開いたときは、2階メインエントランスから入場する前提で案内する
  var currentFrom = readFromParam() || "gate-main";

  function selectableNodes() {
    return V.nodes.filter(function (n) { return n.type === "gate" || n.type === "core" || n.type === "lounge"; });
  }

  function fillFromSelect() {
    var groups = [
      { label: "1階の入口", test: function (n) { return n.type === "gate" && n.floor === "G"; } },
      { label: "2階の入口・ゲート", test: function (n) { return n.type === "gate" && n.floor === "L"; } },
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
    els.row.add(new Option("未選択", ""));
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
    var num = els.seat.value ? parseInt(els.seat.value, 10) : null;
    if (num !== null && (num < 1 || num > V.maxSeatNumber)) return { error: "番は 1〜" + V.maxSeatNumber + " の数字で入れてください。" };
    return { block: b, seat: { row: row, number: num } };
  }

  // ───────── 平面図での表示

  var Axo = window.AxoView;

  function showHere() {
    Axo.showHere(currentFrom);
  }

  // ルートを出す前に、選んだブロックを平面図の上で光らせる
  function previewBlock(block) {
    els.result.hidden = true;
    Axo.preview(block, currentFrom);
  }

  // 平面図でブロックをタップしたとき
  function onBlockTap(block) {
    els.block.value = block.id;
    fillRows();
    previewBlock(block);
    Axo.setHint(block.id + "ブロックを選びました。" + "「ルートを表示」を押してください（列・番は分かれば入れてください）。");
  }

  // ───────── 結果の表示

  function showResult(r) {
    els.summary.textContent = r.seatLabel + " まで、約" + r.totalMeters + "m（歩いて約" + r.minutes + "分）";
    els.steps.innerHTML = "";
    r.steps.forEach(function (s, i) {
      var li = document.createElement("li");
      li.addEventListener("click", function () {
        Axo.goTo(i);
        document.getElementById("axo-card").scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
    saveSeat({ block: f.block.id, row: f.seat.row, number: f.seat.number });
    var r = R.describe(V, graph, currentFrom, f.block, f.seat, {});
    if (!r) {
      els.error.textContent = "ルートが見つかりませんでした。スタッフにお尋ねください。";
      return;
    }
    showResult(r);
    Axo.render(r, f.block);
    if (scroll) document.getElementById("axo-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ───────── はじめに

  fillFromSelect();
  renderHere();
  fillBlocks();
  Axo.init({ onBlockTap: onBlockTap });

  var saved = loadSeat();
  if (saved && blocksById[saved.block]) {
    els.block.value = saved.block;
    fillRows();
    if (saved.row) els.row.value = String(saved.row);
    if (saved.number) els.seat.value = saved.number;
  } else {
    fillRows();
  }

  els.block.addEventListener("change", function () {
    fillRows();
    var b = blocksById[els.block.value];
    if (b) previewBlock(b);
  });
  els.form.addEventListener("submit", function (e) { e.preventDefault(); route(true); });
  els.fromSelect.addEventListener("change", function () {
    currentFrom = els.fromSelect.value || null;
    // 選び直した現在地をURLにも反映（再読み込みしても保たれるように）
    var url = new URL(location.href);
    if (currentFrom) url.searchParams.set("from", currentFrom); else url.searchParams.delete("from");
    history.replaceState(null, "", url);
    renderHere();
    if (currentFrom && loadSeat()) route(false); else showHere();
  });

  // QRを読み直したとき、座席番号を覚えていればすぐにルートを出す
  if (currentFrom && saved && blocksById[saved.block]) route(false);
  else showHere();
})();

// ホーム画面に追加したとき、電波が弱くても開けるようにする
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () { /* 使えなくても案内は動く */ });
  });
}
