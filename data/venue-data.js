/*
 * 沖縄サントリーアリーナ 座席案内 データ
 *
 * 座標は assets/seatmap.webp（横2000×縦1729）の上の位置です。左上が (0, 0)。
 * 「tentative: true」が付いているものは仮の値です。現地調査やフロアマップで
 * 確認できたら、値を直して tentative を消してください。
 * 一覧は docs/provisional.md にもまとめています。
 */
window.VENUE = {
  mapImage: "assets/seatmap.webp",
  mapWidth: 2000,
  mapHeight: 1729,
  // 座席図1ピクセルあたりの実際の距離（メートル）。仮の値。
  metersPerPixel: 0.06,
  courtCenter: [1000, 865],

  floors: {
    L: { name: "下段コンコース", floorLabel: "2階", tentative: true },
    U: { name: "上段コンコース", floorLabel: "4階", tentative: true }
  },

  /*
   * 地点（点）
   * id, 名前, 階(L/U), 座席図上の位置 [横, 縦], 種類
   * 種類: gate=ゲート, ring=コンコースの曲がり角など, core=階段・エレベーター, lounge=ラウンジ入口
   */
  nodes: [
    // ── 下段ゲート（座席図に書かれている位置）
    { id: "gate-A21", name: "A21ゲート", floor: "L", pos: [1560, 1225], type: "gate" },
    { id: "gate-B21", name: "B21ゲート", floor: "L", pos: [1273, 1375], type: "gate" },
    { id: "gate-B22", name: "B22ゲート", floor: "L", pos: [813, 1375], type: "gate" },
    { id: "gate-C21", name: "C21ゲート", floor: "L", pos: [575, 1270], type: "gate" },
    { id: "gate-D21", name: "D21ゲート", floor: "L", pos: [393, 1030], type: "gate" },
    { id: "gate-D22", name: "D22ゲート", floor: "L", pos: [393, 715], type: "gate" },
    { id: "gate-E21", name: "E21ゲート", floor: "L", pos: [560, 465], type: "gate" },
    { id: "gate-F21", name: "F21ゲート", floor: "L", pos: [813, 355], type: "gate" },
    { id: "gate-F22", name: "F22ゲート", floor: "L", pos: [1273, 355], type: "gate" },
    { id: "gate-G21", name: "G21ゲート", floor: "L", pos: [1570, 505], type: "gate" },

    // ── 上段ゲート（座席図に書かれている位置）
    { id: "gate-A41", name: "A41ゲート", floor: "U", pos: [1560, 1515], type: "gate" },
    { id: "gate-B41", name: "B41ゲート", floor: "U", pos: [1285, 1590], type: "gate" },
    { id: "gate-B42", name: "B42ゲート", floor: "U", pos: [815, 1590], type: "gate" },
    { id: "gate-C41", name: "C41ゲート", floor: "U", pos: [520, 1525], type: "gate" },
    { id: "gate-C42", name: "C42ゲート", floor: "U", pos: [255, 1260], type: "gate" },
    { id: "gate-D41", name: "D41ゲート", floor: "U", pos: [195, 870], type: "gate" },
    { id: "gate-E41", name: "E41ゲート", floor: "U", pos: [255, 480], type: "gate" },
    { id: "gate-E42", name: "E42ゲート", floor: "U", pos: [525, 215], type: "gate" },
    { id: "gate-F41", name: "F41ゲート", floor: "U", pos: [810, 140], type: "gate" },
    { id: "gate-F42", name: "F42ゲート", floor: "U", pos: [1285, 140], type: "gate" },
    { id: "gate-G41", name: "G41ゲート", floor: "U", pos: [1565, 200], type: "gate" },

    // ── 下段コンコース（仮）：座席図の紺色の八角形の線に沿わせた仮の通路
    { id: "L-NW", name: "下段コンコース 北西の角", floor: "L", pos: [303, 590], type: "ring", tentative: true },
    { id: "L-NN-W", name: "下段コンコース 北西", floor: "L", pos: [648, 247], type: "ring", tentative: true },
    { id: "L-NN-E", name: "下段コンコース 北東", floor: "L", pos: [1440, 247], type: "ring", tentative: true },
    { id: "L-NE", name: "下段コンコース 北東の角", floor: "L", pos: [1793, 590], type: "ring", tentative: true },
    { id: "L-SE", name: "下段コンコース 南東の角", floor: "L", pos: [1793, 1290], type: "ring", tentative: true },
    { id: "L-SS-E", name: "下段コンコース 南東", floor: "L", pos: [1440, 1490], type: "ring", tentative: true },
    { id: "L-SS-W", name: "下段コンコース 南西", floor: "L", pos: [648, 1490], type: "ring", tentative: true },
    { id: "L-SW", name: "下段コンコース 南西の角", floor: "L", pos: [303, 1150], type: "ring", tentative: true },
    // 各ゲートの前（コンコース上）
    { id: "L-at-A21", name: "A21ゲート前", floor: "L", pos: [1645, 1374], type: "ring", tentative: true },
    { id: "L-at-B21", name: "B21ゲート前", floor: "L", pos: [1273, 1490], type: "ring", tentative: true },
    { id: "L-at-B22", name: "B22ゲート前", floor: "L", pos: [813, 1490], type: "ring", tentative: true },
    { id: "L-at-C21", name: "C21ゲート前", floor: "L", pos: [501, 1345], type: "ring", tentative: true },
    { id: "L-at-D21", name: "D21ゲート前", floor: "L", pos: [303, 1030], type: "ring", tentative: true },
    { id: "L-at-D22", name: "D22ゲート前", floor: "L", pos: [303, 715], type: "ring", tentative: true },
    { id: "L-at-E21", name: "E21ゲート前", floor: "L", pos: [495, 399], type: "ring", tentative: true },
    { id: "L-at-F21", name: "F21ゲート前", floor: "L", pos: [813, 247], type: "ring", tentative: true },
    { id: "L-at-F22", name: "F22ゲート前", floor: "L", pos: [1273, 247], type: "ring", tentative: true },
    { id: "L-at-G21", name: "G21ゲート前", floor: "L", pos: [1636, 437], type: "ring", tentative: true },

    // ── 上段コンコース（仮）：上段スタンドの外側をまわる仮の通路
    { id: "U-NW", name: "上段コンコース 北西の角", floor: "U", pos: [85, 500], type: "ring", tentative: true },
    { id: "U-NN-W", name: "上段コンコース 北西", floor: "U", pos: [560, 22], type: "ring", tentative: true },
    { id: "U-NN-E", name: "上段コンコース 北東", floor: "U", pos: [1530, 22], type: "ring", tentative: true },
    { id: "U-NE", name: "上段コンコース 北東の角", floor: "U", pos: [1890, 430], type: "ring", tentative: true },
    { id: "U-SE", name: "上段コンコース 南東の角", floor: "U", pos: [1890, 1300], type: "ring", tentative: true },
    { id: "U-SS-E", name: "上段コンコース 南東", floor: "U", pos: [1530, 1722], type: "ring", tentative: true },
    { id: "U-SS-W", name: "上段コンコース 南西", floor: "U", pos: [560, 1722], type: "ring", tentative: true },
    { id: "U-SW", name: "上段コンコース 南西の角", floor: "U", pos: [85, 1230], type: "ring", tentative: true },
    { id: "U-at-A41", name: "A41ゲート前", floor: "U", pos: [1645, 1587], type: "ring", tentative: true },
    { id: "U-at-B41", name: "B41ゲート前", floor: "U", pos: [1285, 1722], type: "ring", tentative: true },
    { id: "U-at-B42", name: "B42ゲート前", floor: "U", pos: [815, 1722], type: "ring", tentative: true },
    { id: "U-at-C41", name: "C41ゲート前", floor: "U", pos: [442, 1600], type: "ring", tentative: true },
    { id: "U-at-C42", name: "C42ゲート前", floor: "U", pos: [182, 1330], type: "ring", tentative: true },
    { id: "U-at-D41", name: "D41ゲート前", floor: "U", pos: [85, 870], type: "ring", tentative: true },
    { id: "U-at-E41", name: "E41ゲート前", floor: "U", pos: [180, 405], type: "ring", tentative: true },
    { id: "U-at-E42", name: "E42ゲート前", floor: "U", pos: [446, 137], type: "ring", tentative: true },
    { id: "U-at-F41", name: "F41ゲート前", floor: "U", pos: [810, 22], type: "ring", tentative: true },
    { id: "U-at-F42", name: "F42ゲート前", floor: "U", pos: [1285, 22], type: "ring", tentative: true },
    { id: "U-at-G41", name: "G41ゲート前", floor: "U", pos: [1634, 139], type: "ring", tentative: true },
    { id: "U-lounge", name: "パノラマラウンジ入口", floor: "U", pos: [1890, 870], type: "lounge", tentative: true },

    // ── 階段・エレベーター（仮）：座席図の四隅にある紺色の四角を階段・EVと仮定
    { id: "core-NW-L", name: "北西の階段（下段側）", floor: "L", pos: [282, 400], type: "core", tentative: true },
    { id: "core-NW-U", name: "北西の階段（上段側）", floor: "U", pos: [282, 400], type: "core", tentative: true },
    { id: "core-NE-L", name: "北東の階段・エレベーター（下段側）", floor: "L", pos: [1645, 390], type: "core", tentative: true },
    { id: "core-NE-U", name: "北東の階段・エレベーター（上段側）", floor: "U", pos: [1645, 390], type: "core", tentative: true },
    { id: "core-SW-L", name: "南西の階段・エレベーター（下段側）", floor: "L", pos: [278, 1343], type: "core", tentative: true },
    { id: "core-SW-U", name: "南西の階段・エレベーター（上段側）", floor: "U", pos: [278, 1343], type: "core", tentative: true },
    { id: "core-SE-L", name: "南東の階段（下段側）", floor: "L", pos: [1645, 1340], type: "core", tentative: true },
    { id: "core-SE-U", name: "南東の階段（上段側）", floor: "U", pos: [1645, 1340], type: "core", tentative: true }
  ],

  /*
   * 通路（線）
   * [地点A, 地点B, 種類]  種類: walk=平坦な通路, stairs=階段, elevator=エレベーター
   * 距離は座標から自動で計算します。
   */
  edges: [
    // 下段コンコース一周（仮）
    ["L-NN-W", "L-at-F21", "walk"], ["L-at-F21", "L-at-F22", "walk"], ["L-at-F22", "L-NN-E", "walk"],
    ["L-NN-E", "L-at-G21", "walk"], ["L-at-G21", "L-NE", "walk"],
    ["L-NE", "L-SE", "walk"],
    ["L-SE", "L-at-A21", "walk"], ["L-at-A21", "L-SS-E", "walk"],
    ["L-SS-E", "L-at-B21", "walk"], ["L-at-B21", "L-at-B22", "walk"], ["L-at-B22", "L-SS-W", "walk"],
    ["L-SS-W", "L-at-C21", "walk"], ["L-at-C21", "L-SW", "walk"],
    ["L-SW", "L-at-D21", "walk"], ["L-at-D21", "L-at-D22", "walk"], ["L-at-D22", "L-NW", "walk"],
    ["L-NW", "L-at-E21", "walk"], ["L-at-E21", "L-NN-W", "walk"],
    // 下段ゲートとコンコースをつなぐ
    ["gate-A21", "L-at-A21", "walk"], ["gate-B21", "L-at-B21", "walk"], ["gate-B22", "L-at-B22", "walk"],
    ["gate-C21", "L-at-C21", "walk"], ["gate-D21", "L-at-D21", "walk"], ["gate-D22", "L-at-D22", "walk"],
    ["gate-E21", "L-at-E21", "walk"], ["gate-F21", "L-at-F21", "walk"], ["gate-F22", "L-at-F22", "walk"],
    ["gate-G21", "L-at-G21", "walk"],

    // 上段コンコース一周（仮）
    ["U-NN-W", "U-at-F41", "walk"], ["U-at-F41", "U-at-F42", "walk"], ["U-at-F42", "U-NN-E", "walk"],
    ["U-NN-E", "U-at-G41", "walk"], ["U-at-G41", "U-NE", "walk"],
    ["U-NE", "U-lounge", "walk"], ["U-lounge", "U-SE", "walk"],
    ["U-SE", "U-at-A41", "walk"], ["U-at-A41", "U-SS-E", "walk"],
    ["U-SS-E", "U-at-B41", "walk"], ["U-at-B41", "U-at-B42", "walk"], ["U-at-B42", "U-SS-W", "walk"],
    ["U-SS-W", "U-at-C41", "walk"], ["U-at-C41", "U-at-C42", "walk"], ["U-at-C42", "U-SW", "walk"],
    ["U-SW", "U-at-D41", "walk"], ["U-at-D41", "U-NW", "walk"],
    ["U-NW", "U-at-E41", "walk"], ["U-at-E41", "U-at-E42", "walk"], ["U-at-E42", "U-NN-W", "walk"],
    // 上段ゲートとコンコースをつなぐ
    ["gate-A41", "U-at-A41", "walk"], ["gate-B41", "U-at-B41", "walk"], ["gate-B42", "U-at-B42", "walk"],
    ["gate-C41", "U-at-C41", "walk"], ["gate-C42", "U-at-C42", "walk"], ["gate-D41", "U-at-D41", "walk"],
    ["gate-E41", "U-at-E41", "walk"], ["gate-E42", "U-at-E42", "walk"], ["gate-F41", "U-at-F41", "walk"],
    ["gate-F42", "U-at-F42", "walk"], ["gate-G41", "U-at-G41", "walk"],

    // 階段・エレベーター（仮）
    ["core-NW-L", "L-NW", "walk"], ["core-NW-U", "U-at-E41", "walk"], ["core-NW-L", "core-NW-U", "stairs"],
    ["core-NE-L", "L-at-G21", "walk"], ["core-NE-U", "U-at-G41", "walk"],
    ["core-NE-L", "core-NE-U", "stairs"], ["core-NE-L", "core-NE-U", "elevator"],
    ["core-SW-L", "L-at-C21", "walk"], ["core-SW-U", "U-at-C42", "walk"],
    ["core-SW-L", "core-SW-U", "stairs"], ["core-SW-L", "core-SW-U", "elevator"],
    ["core-SE-L", "L-at-A21", "walk"], ["core-SE-U", "U-at-A41", "walk"], ["core-SE-L", "core-SE-U", "stairs"]
  ],

  /*
   * ブロック
   * id=ブロック番号, gate=使うゲート, rows=[最初の列, 最後の列]（null は列なし）,
   * aisleAfterRow=ゲートを入った所の横通路が「何列と何列の間」にあるか（仮）,
   * pos=座席図上のおおよその位置
   * 座席番号の並び方向（左から／右から）は座席図から読み取れないため未設定です。
   */
  blockGroups: [
    { id: "lower", name: "下段スタンド（201〜234）" },
    { id: "box", name: "ボックス席など（301〜330）" },
    { id: "upper", name: "上段スタンド（401〜433）" },
    { id: "lounge", name: "パノラマラウンジ（500〜514）" }
  ],

  blocks: [
    // ── 下段スタンド
    { id: "201", group: "lower", gate: "gate-G21", rows: [1, 18], aisleAfterRow: 11, pos: [1460, 610], tentative: true },
    { id: "202", group: "lower", gate: "gate-G21", rows: [1, 18], aisleAfterRow: 11, pos: [1520, 680], tentative: true },
    { id: "203", group: "lower", gate: "gate-G21", rows: [4, 18], aisleAfterRow: 11, pos: [1530, 745], tentative: true },
    { id: "204", group: "lower", gate: "gate-G21", rows: [4, 18], aisleAfterRow: 11, pos: [1530, 830], tentative: true },
    { id: "205", group: "lower", gate: "gate-A21", rows: [4, 18], aisleAfterRow: 11, pos: [1530, 920], tentative: true },
    { id: "206", group: "lower", gate: "gate-A21", rows: [4, 18], aisleAfterRow: 11, pos: [1530, 1010], tentative: true },
    { id: "207", group: "lower", gate: "gate-A21", rows: [1, 18], aisleAfterRow: 11, pos: [1520, 1100], tentative: true },
    { id: "208", group: "lower", gate: "gate-A21", rows: [1, 18], aisleAfterRow: 11, pos: [1450, 1130], tentative: true },
    { id: "209", group: "lower", gate: "gate-A21", rows: [1, 18], aisleAfterRow: 11, pos: [1500, 1260], tentative: true },
    { id: "210", group: "lower", gate: "gate-A21", rows: [1, 18], aisleAfterRow: 11, pos: [1410, 1300], tentative: true },
    { id: "211", group: "lower", gate: "gate-B21", rows: [1, 18], aisleAfterRow: 11, pos: [1315, 1230] },
    { id: "212", group: "lower", gate: "gate-B21", rows: [1, 18], aisleAfterRow: 11, pos: [1215, 1230] },
    { id: "213", group: "lower", gate: "gate-B21", rows: [1, 18], aisleAfterRow: 11, pos: [1100, 1230] },
    { id: "214", group: "lower", gate: "gate-B22", rows: [1, 18], aisleAfterRow: 11, pos: [985, 1230] },
    { id: "215", group: "lower", gate: "gate-B22", rows: [1, 18], aisleAfterRow: 11, pos: [875, 1230] },
    { id: "216", group: "lower", gate: "gate-B22", rows: [1, 18], aisleAfterRow: 11, pos: [785, 1230] },
    { id: "217", group: "lower", gate: "gate-C21", rows: [1, 21], aisleAfterRow: 11, pos: [720, 1180], tentative: true },
    { id: "218", group: "lower", gate: "gate-C21", rows: [1, 21], aisleAfterRow: 11, pos: [650, 1120], tentative: true },
    { id: "219", group: "lower", gate: "gate-C21", rows: [1, 21], aisleAfterRow: 11, pos: [590, 1060], tentative: true },
    { id: "220", group: "lower", gate: "gate-D21", rows: [4, 21], aisleAfterRow: 11, pos: [550, 1020] },
    { id: "221", group: "lower", gate: "gate-D21", rows: [4, 21], aisleAfterRow: 11, pos: [550, 935] },
    { id: "222", group: "lower", gate: "gate-D22", rows: [4, 21], aisleAfterRow: 11, pos: [550, 800] },
    { id: "223", group: "lower", gate: "gate-D22", rows: [4, 21], aisleAfterRow: 11, pos: [550, 730] },
    { id: "224", group: "lower", gate: "gate-E21", rows: [1, 21], aisleAfterRow: 11, pos: [580, 660], tentative: true },
    { id: "225", group: "lower", gate: "gate-E21", rows: [1, 21], aisleAfterRow: 11, pos: [640, 600], tentative: true },
    { id: "226", group: "lower", gate: "gate-E21", rows: [1, 21], aisleAfterRow: 11, pos: [705, 535], tentative: true },
    { id: "227", group: "lower", gate: "gate-F21", rows: [4, 18], aisleAfterRow: 11, pos: [790, 490] },
    { id: "228", group: "lower", gate: "gate-F21", rows: [4, 18], aisleAfterRow: 11, pos: [880, 490] },
    { id: "229", group: "lower", gate: "gate-F21", rows: [4, 18], aisleAfterRow: 11, pos: [995, 490] },
    { id: "230", group: "lower", gate: "gate-F22", rows: [4, 18], aisleAfterRow: 11, pos: [1090, 490] },
    { id: "231", group: "lower", gate: "gate-F22", rows: [4, 18], aisleAfterRow: 11, pos: [1210, 490] },
    { id: "232", group: "lower", gate: "gate-F22", rows: [4, 18], aisleAfterRow: 11, pos: [1320, 490] },
    { id: "233", group: "lower", gate: "gate-G21", rows: [12, 18], aisleAfterRow: 11, pos: [1430, 410], tentative: true },
    { id: "234", group: "lower", gate: "gate-G21", rows: [12, 18], aisleAfterRow: 11, pos: [1500, 450], tentative: true },

    // ── ボックス席など（緑の区画）：正式名称・入り方は確認中
    { id: "301", group: "box", gate: "gate-A21", rows: null, pos: [1530, 1360], tentative: true },
    { id: "302", group: "box", gate: "gate-A21", rows: null, pos: [1465, 1430], tentative: true },
    { id: "303", group: "box", gate: "gate-B21", rows: null, pos: [1390, 1470], tentative: true },
    { id: "304", group: "box", gate: "gate-B21", rows: null, pos: [1325, 1470], tentative: true },
    { id: "305", group: "box", gate: "gate-B21", rows: null, pos: [1270, 1470], tentative: true },
    { id: "306", group: "box", gate: "gate-B21", rows: null, pos: [1207, 1450], tentative: true },
    { id: "307", group: "box", gate: "gate-B21", rows: null, pos: [1140, 1450], tentative: true },
    { id: "308", group: "box", gate: "gate-B21", rows: null, pos: [1075, 1450], tentative: true },
    { id: "309", group: "box", gate: "gate-B22", rows: null, pos: [1015, 1450], tentative: true },
    { id: "310", group: "box", gate: "gate-B22", rows: null, pos: [948, 1450], tentative: true },
    { id: "311", group: "box", gate: "gate-B22", rows: null, pos: [882, 1450], tentative: true },
    { id: "312", group: "box", gate: "gate-B22", rows: null, pos: [820, 1460], tentative: true },
    { id: "313", group: "box", gate: "gate-B22", rows: null, pos: [758, 1460], tentative: true },
    { id: "314", group: "box", gate: "gate-B22", rows: null, pos: [692, 1460], tentative: true },
    { id: "315", group: "box", gate: "gate-C21", rows: null, pos: [630, 1420], tentative: true },
    { id: "316", group: "box", gate: "gate-E21", rows: null, pos: [615, 315], tentative: true },
    { id: "317", group: "box", gate: "gate-F21", rows: null, pos: [697, 280], tentative: true },
    { id: "318", group: "box", gate: "gate-F21", rows: null, pos: [757, 280], tentative: true },
    { id: "319", group: "box", gate: "gate-F21", rows: null, pos: [822, 280], tentative: true },
    { id: "320", group: "box", gate: "gate-F21", rows: null, pos: [885, 280], tentative: true },
    { id: "321", group: "box", gate: "gate-F21", rows: null, pos: [947, 280], tentative: true },
    { id: "322", group: "box", gate: "gate-F21", rows: null, pos: [1013, 280], tentative: true },
    { id: "323", group: "box", gate: "gate-F22", rows: null, pos: [1075, 280], tentative: true },
    { id: "324", group: "box", gate: "gate-F22", rows: null, pos: [1140, 280], tentative: true },
    { id: "325", group: "box", gate: "gate-F22", rows: null, pos: [1205, 280], tentative: true },
    { id: "326", group: "box", gate: "gate-F22", rows: null, pos: [1268, 280], tentative: true },
    { id: "327", group: "box", gate: "gate-F22", rows: null, pos: [1328, 280], tentative: true },
    { id: "328", group: "box", gate: "gate-F22", rows: null, pos: [1390, 280], tentative: true },
    { id: "329", group: "box", gate: "gate-G21", rows: null, pos: [1470, 320], tentative: true },
    { id: "330", group: "box", gate: "gate-G21", rows: null, pos: [1540, 400], tentative: true },

    // ── 上段スタンド
    { id: "401", group: "upper", gate: "gate-G41", rows: [1, 11], aisleAfterRow: 4, pos: [1720, 450], tentative: true },
    { id: "402", group: "upper", gate: "gate-G41", rows: [1, 11], aisleAfterRow: 4, pos: [1770, 510], tentative: true },
    { id: "403", group: "upper", gate: "gate-G41", rows: [1, 11], aisleAfterRow: 4, pos: [1830, 680], tentative: true },
    { id: "404", group: "upper", gate: "gate-A41", rows: [1, 11], aisleAfterRow: 4, pos: [1830, 870], tentative: true },
    { id: "405", group: "upper", gate: "gate-A41", rows: [1, 11], aisleAfterRow: 4, pos: [1830, 1050], tentative: true },
    { id: "406", group: "upper", gate: "gate-A41", rows: [1, 11], aisleAfterRow: 4, pos: [1770, 1220], tentative: true },
    { id: "407", group: "upper", gate: "gate-A41", rows: [1, 11], aisleAfterRow: 4, pos: [1700, 1290], tentative: true },
    { id: "409", group: "upper", gate: "gate-A41", rows: [1, 11], aisleAfterRow: 4, pos: [1570, 1430], tentative: true },
    { id: "409ST", group: "upper", gate: "gate-A41", rows: [1, 11], aisleAfterRow: 4, pos: [1610, 1580], tentative: true },
    { id: "410", group: "upper", gate: "gate-A41", rows: [1, 11], aisleAfterRow: 4, pos: [1435, 1630], tentative: true },
    { id: "411", group: "upper", gate: "gate-B41", rows: [1, 11], aisleAfterRow: 4, pos: [1260, 1620] },
    { id: "412", group: "upper", gate: "gate-B41", rows: [1, 11], aisleAfterRow: 4, pos: [1105, 1620] },
    { id: "413", group: "upper", gate: "gate-B42", rows: [1, 11], aisleAfterRow: 4, pos: [995, 1620] },
    { id: "414", group: "upper", gate: "gate-B42", rows: [1, 11], aisleAfterRow: 4, pos: [835, 1620] },
    { id: "415", group: "upper", gate: "gate-C41", rows: [1, 11], aisleAfterRow: 4, pos: [660, 1630], tentative: true },
    { id: "416", group: "upper", gate: "gate-C41", rows: [1, 11], aisleAfterRow: 4, pos: [480, 1570] },
    { id: "417", group: "upper", gate: "gate-C41", rows: [1, 11], aisleAfterRow: 4, pos: [380, 1460] },
    { id: "418", group: "upper", gate: "gate-C42", rows: [1, 11], aisleAfterRow: 4, pos: [300, 1400], tentative: true },
    { id: "419", group: "upper", gate: "gate-C42", rows: [1, 11], aisleAfterRow: 4, pos: [190, 1300] },
    { id: "420", group: "upper", gate: "gate-D41", rows: [1, 11], aisleAfterRow: 4, pos: [160, 1080] },
    { id: "421", group: "upper", gate: "gate-D41", rows: [1, 11], aisleAfterRow: 4, pos: [160, 870] },
    { id: "422", group: "upper", gate: "gate-D41", rows: [1, 11], aisleAfterRow: 4, pos: [160, 660] },
    { id: "423", group: "upper", gate: "gate-E41", rows: [1, 11], aisleAfterRow: 4, pos: [190, 440] },
    { id: "424", group: "upper", gate: "gate-E41", rows: [1, 11], aisleAfterRow: 4, pos: [300, 330], tentative: true },
    { id: "425", group: "upper", gate: "gate-E42", rows: [1, 11], aisleAfterRow: 4, pos: [380, 270] },
    { id: "426", group: "upper", gate: "gate-E42", rows: [1, 11], aisleAfterRow: 4, pos: [480, 170] },
    { id: "427", group: "upper", gate: "gate-F41", rows: [1, 11], aisleAfterRow: 4, pos: [660, 130] },
    { id: "428", group: "upper", gate: "gate-F41", rows: [1, 11], aisleAfterRow: 4, pos: [838, 130] },
    { id: "429", group: "upper", gate: "gate-F41", rows: [1, 11], aisleAfterRow: 4, pos: [997, 130], tentative: true },
    { id: "430", group: "upper", gate: "gate-F42", rows: [1, 11], aisleAfterRow: 4, pos: [1096, 130], tentative: true },
    { id: "431", group: "upper", gate: "gate-F42", rows: [1, 11], aisleAfterRow: 4, pos: [1256, 130] },
    { id: "432", group: "upper", gate: "gate-F42", rows: [1, 11], aisleAfterRow: 4, pos: [1439, 130] },
    { id: "433", group: "upper", gate: "gate-G41", rows: [1, 11], aisleAfterRow: 4, pos: [1550, 280] },
    { id: "433ST", group: "upper", gate: "gate-G41", rows: [1, 11], aisleAfterRow: 4, pos: [1610, 150] },

    // ── パノラマラウンジ：入り方は確認中。ラウンジ入口（仮）まで案内します
    { id: "500", group: "lounge", gate: "U-lounge", rows: null, pos: [1680, 315], tentative: true },
    { id: "501", group: "lounge", gate: "U-lounge", rows: null, pos: [1790, 435], tentative: true },
    { id: "502", group: "lounge", gate: "U-lounge", rows: null, pos: [1840, 475], tentative: true },
    { id: "503", group: "lounge", gate: "U-lounge", rows: null, pos: [1890, 520], tentative: true },
    { id: "504", group: "lounge", gate: "U-lounge", rows: null, pos: [1910, 605], tentative: true },
    { id: "505", group: "lounge", gate: "U-lounge", rows: null, pos: [1910, 697], tentative: true },
    { id: "506", group: "lounge", gate: "U-lounge", rows: null, pos: [1910, 785], tentative: true },
    { id: "507", group: "lounge", gate: "U-lounge", rows: null, pos: [1910, 870], tentative: true },
    { id: "508", group: "lounge", gate: "U-lounge", rows: null, pos: [1910, 955], tentative: true },
    { id: "509", group: "lounge", gate: "U-lounge", rows: null, pos: [1910, 1043], tentative: true },
    { id: "510", group: "lounge", gate: "U-lounge", rows: null, pos: [1910, 1132], tentative: true },
    { id: "511", group: "lounge", gate: "U-lounge", rows: null, pos: [1885, 1212], tentative: true },
    { id: "512", group: "lounge", gate: "U-lounge", rows: null, pos: [1835, 1262], tentative: true },
    { id: "513", group: "lounge", gate: "U-lounge", rows: null, pos: [1785, 1305], tentative: true },
    { id: "514", group: "lounge", gate: "U-lounge", rows: null, pos: [1678, 1413], tentative: true }
  ],

  // 座席番号（番）の入力で受け付ける最大値（仮）。実際の番号の範囲は座席図から読み切れていません。
  maxSeatNumber: 600,

  /*
   * QRコード
   * id, 置かれた地点, 貼る場所の説明。設置場所はすべて仮（施設の許可がまだのため）。
   * QRのURLは「公開URL?from=地点ID」です。qr.html で一覧と印刷用QRを表示できます。
   */
  qrCodes: [
    { id: "qr-001", node: "gate-A21", place: "A21ゲート横", tentative: true },
    { id: "qr-002", node: "gate-B21", place: "B21ゲート横", tentative: true },
    { id: "qr-003", node: "gate-B22", place: "B22ゲート横", tentative: true },
    { id: "qr-004", node: "gate-C21", place: "C21ゲート横", tentative: true },
    { id: "qr-005", node: "gate-D21", place: "D21ゲート横", tentative: true },
    { id: "qr-006", node: "gate-D22", place: "D22ゲート横", tentative: true },
    { id: "qr-007", node: "gate-E21", place: "E21ゲート横", tentative: true },
    { id: "qr-008", node: "gate-F21", place: "F21ゲート横", tentative: true },
    { id: "qr-009", node: "gate-F22", place: "F22ゲート横", tentative: true },
    { id: "qr-010", node: "gate-G21", place: "G21ゲート横", tentative: true },
    { id: "qr-011", node: "gate-A41", place: "A41ゲート横", tentative: true },
    { id: "qr-012", node: "gate-B41", place: "B41ゲート横", tentative: true },
    { id: "qr-013", node: "gate-B42", place: "B42ゲート横", tentative: true },
    { id: "qr-014", node: "gate-C41", place: "C41ゲート横", tentative: true },
    { id: "qr-015", node: "gate-C42", place: "C42ゲート横", tentative: true },
    { id: "qr-016", node: "gate-D41", place: "D41ゲート横", tentative: true },
    { id: "qr-017", node: "gate-E41", place: "E41ゲート横", tentative: true },
    { id: "qr-018", node: "gate-E42", place: "E42ゲート横", tentative: true },
    { id: "qr-019", node: "gate-F41", place: "F41ゲート横", tentative: true },
    { id: "qr-020", node: "gate-F42", place: "F42ゲート横", tentative: true },
    { id: "qr-021", node: "gate-G41", place: "G41ゲート横", tentative: true },
    { id: "qr-022", node: "core-NW-L", place: "北西の階段 下段側の乗り口", tentative: true },
    { id: "qr-023", node: "core-NE-L", place: "北東の階段・EV 下段側の乗り口", tentative: true },
    { id: "qr-024", node: "core-SW-L", place: "南西の階段・EV 下段側の乗り口", tentative: true },
    { id: "qr-025", node: "core-SE-L", place: "南東の階段 下段側の乗り口", tentative: true },
    { id: "qr-026", node: "core-NW-U", place: "北西の階段 上段側の乗り口", tentative: true },
    { id: "qr-027", node: "core-NE-U", place: "北東の階段・EV 上段側の乗り口", tentative: true },
    { id: "qr-028", node: "core-SW-U", place: "南西の階段・EV 上段側の乗り口", tentative: true },
    { id: "qr-029", node: "core-SE-U", place: "南東の階段 上段側の乗り口", tentative: true },
    { id: "qr-030", node: "U-lounge", place: "パノラマラウンジ入口", tentative: true }
  ]
};
