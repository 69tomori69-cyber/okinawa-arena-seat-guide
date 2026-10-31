/*
 * ルート計算と案内文づくり（画面には触らない部分）
 * 館内を「地点」と「通路」の網の目として扱い、ダイクストラ法で一番短い道を探します。
 */
(function (global) {
  "use strict";

  // 階段・エレベーターは座席図の上では長さが0なので、上り下りの手間を距離に足しておく（仮の値）
  var STAIRS_COST_PX = 300;
  var ELEVATOR_COST_PX = 500;
  var WALK_METERS_PER_MIN = 70;

  function dist(a, b) {
    var dx = a[0] - b[0];
    var dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildGraph(venue) {
    var nodes = {};
    venue.nodes.forEach(function (n) { nodes[n.id] = n; });
    var adj = {};
    Object.keys(nodes).forEach(function (id) { adj[id] = []; });
    venue.edges.forEach(function (e) {
      var a = nodes[e[0]];
      var b = nodes[e[1]];
      if (!a || !b) throw new Error("通路データに存在しない地点があります: " + e[0] + " - " + e[1]);
      var kind = e[2] || "walk";
      var len = dist(a.pos, b.pos);
      var cost = len + (kind === "stairs" ? STAIRS_COST_PX : kind === "elevator" ? ELEVATOR_COST_PX : 0);
      adj[a.id].push({ to: b.id, kind: kind, len: len, cost: cost });
      adj[b.id].push({ to: a.id, kind: kind, len: len, cost: cost });
    });
    return { nodes: nodes, adj: adj };
  }

  // ダイクストラ法。返り値は [{from, to, kind, len}, ...]（通る順）。たどり着けなければ null。
  function shortestPath(graph, fromId, toId, options) {
    var avoidStairs = options && options.avoidStairs;
    if (!graph.nodes[fromId] || !graph.nodes[toId]) return null;
    var best = {};
    var prev = {};
    var done = {};
    best[fromId] = 0;
    var queue = [fromId];
    while (queue.length) {
      // 地点は100個程度なので、単純に一番近いものを探す方法で十分速い
      var bi = 0;
      for (var i = 1; i < queue.length; i++) {
        if (best[queue[i]] < best[queue[bi]]) bi = i;
      }
      var cur = queue.splice(bi, 1)[0];
      if (done[cur]) continue;
      done[cur] = true;
      if (cur === toId) break;
      graph.adj[cur].forEach(function (e) {
        if (avoidStairs && e.kind === "stairs") return;
        var c = best[cur] + e.cost;
        if (best[e.to] === undefined || c < best[e.to]) {
          best[e.to] = c;
          prev[e.to] = { from: cur, edge: e };
          queue.push(e.to);
        }
      });
    }
    if (best[toId] === undefined) return null;
    var legs = [];
    var at = toId;
    while (at !== fromId) {
      var p = prev[at];
      legs.unshift({ from: p.from, to: at, kind: p.edge.kind, len: p.edge.len });
      at = p.from;
    }
    return legs;
  }

  // コートの中心のまわりを時計回りに進んでいるか（画面の座標は下向きが＋）
  function isClockwise(center, a, b) {
    var ax = a[0] - center[0], ay = a[1] - center[1];
    var bx = b[0] - center[0], by = b[1] - center[1];
    return ax * by - ay * bx > 0;
  }

  function meters(venue, px) {
    return Math.max(5, Math.round((px * venue.metersPerPixel) / 5) * 5);
  }

  function floorText(venue, floorId) {
    var f = venue.floors[floorId];
    return f.name + "（" + f.floorLabel + (f.tentative ? "・仮" : "") + "）";
  }

  function isRing(n) { return n.type === "ring" || n.type === "lounge"; }

  /*
   * 道順を、人が読める手順の文章にする。
   * 返り値: { steps: [{text, sub, kind}], totalMeters, minutes, tentative, path:[地点ID...] }
   */
  function describe(venue, graph, fromId, block, seat, options) {
    var nodes = graph.nodes;
    var legs = shortestPath(graph, fromId, block.gate, options);
    if (!legs) return null;

    var steps = [];
    var totalPx = 0;
    var tentative = !!block.tentative;
    var path = [fromId];

    var i = 0;
    while (i < legs.length) {
      var leg = legs[i];
      var a = nodes[leg.from];
      var b = nodes[leg.to];
      if (a.tentative || b.tentative) tentative = true;

      if (leg.kind === "stairs" || leg.kind === "elevator") {
        var order = Object.keys(venue.floors);  // 階は下から順に書いてある
        var up = order.indexOf(b.floor) > order.indexOf(a.floor);
        var how = leg.kind === "stairs" ? "階段" : "エレベーター";
        steps.push({
          kind: leg.kind,
          text: how + "で" + floorText(venue, b.floor) + "へ" + (up ? "上がります" : "下ります") + "。",
          floor: a.floor,
          toFloor: b.floor,
          points: [a.pos]
        });
        path.push(leg.to);
        i++;
        continue;
      }

      if (isRing(a) && isRing(b)) {
        // コンコースを続けて歩く部分はひとまとめにする
        var runPx = 0;
        var first = leg;
        var runPoints = [a.pos];
        var j = i;
        while (j < legs.length && legs[j].kind === "walk" && isRing(nodes[legs[j].from]) && isRing(nodes[legs[j].to])) {
          runPx += legs[j].len;
          if (nodes[legs[j].to].tentative) tentative = true;
          path.push(legs[j].to);
          runPoints.push(nodes[legs[j].to].pos);
          j++;
        }
        var end = nodes[legs[j - 1].to];
        var cw = isClockwise(venue.courtCenter, nodes[first.from].pos, nodes[first.to].pos);
        totalPx += runPx;
        steps.push({
          kind: "walk",
          text: a.floor === "T"
            ? "5階ロビーを進み、「" + end.name + "」まで行きます。"
            : a.floor === "G"
            ? "1階の通路を進み、「" + end.name + "」まで行きます。"
            : "コンコースを、客席側を" + (cw ? "右手" : "左手") + "に見ながら進み、「" + end.name + "」まで行きます。",
          sub: "約" + meters(venue, runPx) + "m",
          floor: a.floor,
          points: runPoints
        });
        i = j;
        continue;
      }

      // ゲートや階段とコンコースの間の短い移動
      totalPx += leg.len;
      path.push(leg.to);
      if (a.type === "gate" && b.type === "core") {
        // ゲートを入ってすぐ横の階段へ（パノラマラウンジへ行くとき）
        steps.push({ kind: "walk", text: "「" + a.name + "」から入り、すぐ横の「" + b.name.replace(/（.*）$/, "") + "」へ向かいます。", floor: a.floor, points: [a.pos, b.pos] });
      } else if (a.type === "gate") {
        steps.push({ kind: "walk", text: a.name + "を背にして、" + floorText(venue, a.floor) + "に出ます。", floor: a.floor, points: [a.pos, b.pos] });
      } else if (a.type === "core" && i === 0) {
        steps.push({ kind: "walk", text: "「" + a.name.replace(/（.*）$/, "") + "」のそばから、" + floorText(venue, a.floor) + "に出ます。", floor: a.floor, points: [a.pos, b.pos] });
      } else if (b.type === "core") {
        steps.push({ kind: "walk", text: "「" + b.name.replace(/（.*）$/, "") + "」へ向かいます。", floor: b.floor, points: [a.pos, b.pos] });
      } else if (b.type === "gate") {
        // 最後のゲートへの一歩は下の「ゲートから座席へ」でまとめて案内する
      }
      i++;
    }

    var gate = nodes[block.gate];
    if (legs.length === 0) {
      steps.push({ kind: "info", text: "いま「" + gate.name + "」のそばにいます。ここから入ります。", floor: gate.floor, points: [gate.pos] });
    }
    var firstSeatStep = steps.length;

    // ゲートから座席まで
    var seatLabel = block.id + "ブロック" + (seat.row ? " " + seat.row + "列" : "") + (seat.number ? " " + seat.number + "番" : "");
    if (block.group === "lounge") {
      steps.push({
        kind: "seat",
        text: "パノラマラウンジの入口から入り、" + block.id + "の席へ。",
        sub: "ラウンジ内の入り方は確認中です。入口のスタッフにチケットをお見せください。"
      });
    } else if (block.group === "court") {
      steps.push({
        kind: "seat",
        text: gate.name + "からアリーナフロアに入り、コートサイドの「" + block.id + "」の席へ。",
        sub: "コートサイド席はサウスエントランスからの入場です。フロアでの入り方は確認中なので、スタッフにチケットをお見せください。"
      });
    } else if (block.group === "box") {
      steps.push({
        kind: "seat",
        text: gate.name + "付近から、" + block.id + "の区画へ向かいます。",
        sub: "ボックス席の正式な入り方は確認中です。区画の番号表示を目印にしてください。"
      });
    } else {
      steps.push({ kind: "seat", text: gate.name + "から客席に入ります。" });
      if (seat.row) {
        var aisle = block.aisleAfterRow;
        var dir = seat.row > aisle ? "上って" : "下りて";
        steps.push({
          kind: "seat",
          text: block.id + "ブロックの階段を" + dir + "、" + seat.row + "列まで行きます。",
          sub: "ゲートを入った所の通路は " + aisle + "列と" + (aisle + 1) + "列の間と仮定しています。"
        });
      }
      if (seat.number) {
        steps.push({
          kind: "seat",
          text: (seat.row ? seat.row + "列の" : "") + "席番号の表示を見ながら、" + seat.number + "番の席へ。",
          sub: "番号が左右どちらから始まるかは調査中です。"
        });
      }
    }
    totalPx += dist(gate.pos, block.pos);

    // ゲートから座席までの手順には、地図に描くための位置を付ける
    var before = legs.length ? nodes[legs[legs.length - 1].from].pos : gate.pos;
    for (var k = firstSeatStep; k < steps.length; k++) {
      steps[k].floor = gate.floor;
      steps[k].points = k === firstSeatStep ? [before, gate.pos, block.pos] : [gate.pos, block.pos];
    }

    var totalMeters = meters(venue, totalPx);
    return {
      steps: steps,
      seatLabel: seatLabel,
      totalMeters: totalMeters,
      minutes: Math.max(1, Math.round(totalMeters / WALK_METERS_PER_MIN)),
      tentative: tentative,
      path: path
    };
  }

  var api = { buildGraph: buildGraph, shortestPath: shortestPath, describe: describe, dist: dist };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.SeatRoute = api;
})(this);
