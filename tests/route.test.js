// ルート計算の簡単な確認： node tests/route.test.js
const assert = require("assert");
global.window = {};
require("../data/venue-data.js");
const V = window.VENUE;
const R = require("../js/route.js");
const g = R.buildGraph(V);

// すべてのブロックのゲートが地点にあること
for (const b of V.blocks) assert.ok(g.nodes[b.gate], `${b.id} のゲート ${b.gate} がありません`);
// すべてのQRの地点があること
for (const q of V.qrCodes) assert.ok(g.nodes[q.node], `${q.id} の地点 ${q.node} がありません`);

// どのQRからでも、どのブロックへでもルートが出ること（階段あり・なし両方）
let count = 0;
for (const q of V.qrCodes) {
  for (const b of V.blocks) {
    // 5階（パノラマラウンジ）との行き来は階段しかないので、階段なしの確認はしない
    const fifth = b.group === "lounge" || g.nodes[q.node].floor === "T";
    for (const avoidStairs of fifth ? [false] : [false, true]) {
      const seat = { row: b.rows ? b.rows[0] : null, number: 1 };
      const r = R.describe(V, g, q.node, b, seat, { avoidStairs });
      assert.ok(r, `${q.node} → ${b.id} のルートがありません`);
      assert.ok(r.steps.length > 0);
      for (const s of r.steps) {
        assert.ok(V.floors[s.floor], `${q.node} → ${b.id} の手順に階がありません: ${s.text}`);
        assert.ok(Array.isArray(s.points) && s.points.length > 0, `${q.node} → ${b.id} の手順に位置がありません: ${s.text}`);
      }
      if (avoidStairs) assert.ok(!r.steps.some(s => s.kind === "stairs"), `${q.node} → ${b.id} で階段を使っています`);
      count++;
    }
  }
}

// 例：B22ゲートから213ブロック5列12番
const r = R.describe(V, g, "gate-B22", V.blocks.find(b => b.id === "213"), { row: 5, number: 12 }, {});
console.log(r.seatLabel, r.totalMeters + "m", r.minutes + "分");
r.steps.forEach((s, i) => console.log(`${i + 1}. ${s.text}${s.sub ? "（" + s.sub + "）" : ""}`));
const r2 = R.describe(V, g, "gate-B21", V.blocks.find(b => b.id === "428"), { row: 8, number: 3 }, { avoidStairs: true });
console.log("\n" + r2.seatLabel, r2.totalMeters + "m");
r2.steps.forEach((s, i) => console.log(`${i + 1}. ${s.text}${s.sub ? "（" + s.sub + "）" : ""}`));
// 例：A21ゲートから505（パノラマラウンジ）。A41ゲートを入って横の階段で5階へ
const r3 = R.describe(V, g, "gate-A21", V.blocks.find(b => b.id === "505"), {}, {});
console.log("\n" + r3.seatLabel, r3.totalMeters + "m");
r3.steps.forEach((s, i) => console.log(`${i + 1}. ${s.text}${s.sub ? "（" + s.sub + "）" : ""}`));
assert.ok(r3.path.includes("gate-A41") || r3.path.includes("gate-G41"), "ラウンジへはA41かG41ゲートを通ること");
console.log(`\nOK: ${count} 通りのルートを確認しました`);
