# okinawa-arena-seat-guide

沖縄サントリーアリーナの座席案内マップ（試作版）。

来場者が館内のQRコードをスマホで読むと現在地が表示され、座席番号（ブロック・列・番）を入れると、
各階の平面図の上に座席までのルートが出ます。道順は地図の下のカードを指で横にスライドして1手順ずつ見られます。アプリのインストールは不要で、スマホのブラウザで動きます。

> **試作版です。** 通路・階段・ゲートの階などは仮のデータです。仮の値の一覧は [docs/provisional.md](docs/provisional.md) を見てください。

## ファイルの役割

| ファイル | 中身 |
| --- | --- |
| `index.html` | 来場者が開く案内ページ |
| `qr.html` | 運営者用。設置するQRコードの一覧と印刷 |
| `data/venue-data.js` | 座席・ゲート・通路・QRのデータ（ここを直せば案内が変わる） |
| `js/route.js` | 一番短い道を探して、道順の文章を作る部分 |
| `js/app.js` | 画面の動き（入力、地図の拡大・移動、表示） |
| `js/floor-map.js` | 平面図。2F・4Fを真上から見た地図をデータから描き、手順ごとに道順を描く。手順はスライドするカードで、階段では階が入れ替わるアニメーションを出す |
| `manifest.webmanifest`・`sw.js` | ホーム画面に追加できるようにする設定と、電波が弱いときのための保存の仕組み |
| `tests/route.test.js` | すべてのQRからすべてのブロックへルートが出るかの確認 |

## QRコードのURL

QRコードには、場所ごとに違うURLを入れます。`?from=` の後ろが現在地です。

```
https://69tomori69-cyber.github.io/okinawa-arena-seat-guide/?from=gate-B21
```

`?from=` を付けずに開くと、現在地を自分で選ぶ画面になります（チケット購入メールやSNSに載せる用）。

## 公開のしかた（GitHub Pages）

1. このプルリクエストを main に取り込む（Merge）
2. リポジトリの **Settings → Pages** を開く
3. 「Build and deployment」の Source を **Deploy from a branch**、Branch を **main** と **/(root)** にして Save
4. 数分後に `https://69tomori69-cyber.github.io/okinawa-arena-seat-guide/` で開けるようになります

無料プランの場合、GitHub Pages はリポジトリが公開（Public）になっている必要があります。

## 手元のパソコンで試す

`index.html` をダブルクリックするだけで開けます。スマホの大きさで見たいときは、ブラウザの開発者ツールでスマホ表示に切り替えてください。

ルート計算の確認（Node.js が入っている場合）:

```
node tests/route.test.js
```

## データの直し方

`data/venue-data.js` をテキストエディタで開いて直します。座標は座席図PDFを横2000×縦1729の画像にしたときの位置で、左上が (0, 0) です（画面には座席図は出ません）。

- ゲートの位置や名前を直す → `nodes`
- 通路をつなぐ・切る → `edges`（`walk`=平坦、`stairs`=階段、`elevator`=エレベーター）
- ブロックが使うゲート・列の範囲を直す → `blocks`
- QRの設置場所を増やす → `qrCodes`

直したら `node tests/route.test.js` で、ルートが出なくなった場所がないか確かめてください。

## 使っているもの

- QRコードの作成: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)（MIT License, Kazuhiko Arase）を `js/vendor/` に同梱
