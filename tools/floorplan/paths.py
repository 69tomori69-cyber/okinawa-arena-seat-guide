"""
通路の線を、平面図の上で壁や客席をよけて引く（一度だけ実行するスクリプト）。

各階の平面図（assets/floors/*.webp）を読み、線・客席・建物の外を「通りにくい所」として、
地点と地点のあいだを、壁から離れた廊下の真ん中を通るように探します。
結果は data/venue-paths.js に書き出し、道順の線と地図の「通路」の帯に使います。

  python3 tools/floorplan/paths.py   （リポジトリの一番上で実行）
"""
import cv2, numpy as np, heapq, json, subprocess, math

K = 2  # 計算は平面図の 1/2 の細かさで行う
FLOORS = {"G": "1f", "L": "2f", "U": "4f", "T": "5f"}
COURT = (478, 452, 643, 758)  # コートの位置（1階はコートの上も歩ける）

V = json.loads(subprocess.check_output(["node", "-e", 'global.window={};require("./data/venue-data.js");console.log(JSON.stringify(window.VENUE))']))
N = {n["id"]: n for n in V["nodes"]}

def cost_map(floor):
    im = cv2.imread("assets/floors/%s.webp" % FLOORS[floor], cv2.IMREAD_UNCHANGED)
    im = cv2.resize(im, (1360 // K, 1210 // K), interpolation=cv2.INTER_AREA)
    lum = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2GRAY).astype(np.float32)
    block = (im[..., 3] < 128) | (lum < 205)          # 建物の外・線・客席
    if floor == "G":
        x0, y0, x1, y1 = [v // K for v in COURT]
        block[y0:y1, x0:x1] = False
    free = (~block).astype(np.uint8)
    d = cv2.distanceTransform(free, cv2.DIST_L2, 3)
    c = 1 + 8.0 / (1 + d)                              # 壁に近いほど少し通りにくい
    c[block] = 40                                      # 線をまたぐ（扉など）のはかなり通りにくい
    c[im[..., 3] < 128] = 400                          # 建物の外はほぼ通れない
    return c

def search(c, src, targets):
    H, W = c.shape
    sx, sy = src
    dist = np.full(c.shape, np.inf, np.float32); prev = -np.ones(c.shape, np.int64)
    dist[sy, sx] = 0; h = [(0.0, sy, sx)]; left = set(targets)
    steps = [(-1, 0, 1), (1, 0, 1), (0, -1, 1), (0, 1, 1), (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]
    while h and left:
        dd, y, x = heapq.heappop(h)
        if dd > dist[y, x]: continue
        left.discard((x, y))
        for dy, dx, w in steps:
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W:
                nd = dd + w * (c[y, x] + c[ny, nx]) / 2
                if nd < dist[ny, nx]:
                    dist[ny, nx] = nd; prev[ny, nx] = y * W + x; heapq.heappush(h, (nd, ny, nx))
    out = {}
    for t in targets:
        p = []; x, y = t
        while (x, y) != (sx, sy):
            p.append((x, y)); i = prev[y, x]
            if i < 0: p = None; break
            y, x = divmod(int(i), W)
        if p is not None: out[t] = [(sx, sy)] + p[::-1]
    return out

paths = {}
for floor in FLOORS:
    c = cost_map(floor)
    edges = [e for e in V["edges"] if (e[2] if len(e) > 2 else "walk") == "walk" and N[e[0]]["floor"] == floor and N[e[1]]["floor"] == floor]
    by = {}
    for a, b, *_ in edges: by.setdefault(a, []).append(b)
    for a, bs in by.items():
        P = lambda n: (min(max(N[n]["pos"][0] // K, 0), c.shape[1] - 1), min(max(N[n]["pos"][1] // K, 0), c.shape[0] - 1))
        res = search(c, P(a), [P(b) for b in bs])
        for b in bs:
            pts = res.get(P(b))
            if not pts: continue
            arr = np.array(pts, np.int32).reshape(-1, 1, 2)
            s = cv2.approxPolyDP(arr, 1.2, False).reshape(-1, 2) * K
            s = [list(map(int, p)) for p in s]
            s[0] = N[a]["pos"]; s[-1] = N[b]["pos"]
            paths[a + "|" + b] = s
    print(floor, len(edges), "本")

with open("data/venue-paths.js", "w") as f:
    f.write("// 通路の線（tools/floorplan/paths.py で平面図から自動で作ったもの。手で直さない）\n")
    f.write("// キーは「地点A|地点B」、値は A から B までの折れ線 [x, y] の並び\n")
    f.write("window.VENUE.edgePaths = {\n")
    f.write(",\n".join('  "%s": %s' % (k, json.dumps(v, separators=(",", ":"))) for k, v in sorted(paths.items())))
    f.write("\n};\n")
