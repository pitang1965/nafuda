# Phase 0: プロトタイプ - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

DB・認証なし・モックデータのみで、QR交換・イベントルーム・推しタグ表示のコアUX仮説を検証する。React + Vite + Cloudflare Pages 構成。バックエンド・OAuth・永続化は一切使わない。

</domain>

<decisions>
## Implementation Decisions

### QR表示UI
- プロフィールページ・イベントページにQRアイコン/ボタンを配置
- タップすると**ボトムシート（下から出現するハーフモーダル）**が開く
- ボトムシートの高さはモバイル画面の約半分
- QRコード内側へのロゴ埋め込みなし（読み取り精度を優先）
- Phase 0ではQR画面からの共有ボタンは不要（QR表示のみ）

### Claude's Discretion
- ボトムシートのアニメーション（スライドイン速度・イージング）
- QRコードのサイズ・余白・背景色
- ボトムシートを閉じる操作（スワイプダウン・バツボタン・背景タップ）
- プロフィールカードのレイアウト・モックデータの構成
- イベントルームの参加者カードアニメーション

</decisions>

<specifics>
## Specific Ideas

- QR表示はスタンドアロン画面ではなくボトムシートで実装する（iOS/Androidのネイティブアプリ的な体験）
- ボトムシートのサイズ感：画面の約50%（スマホで片手操作できる範囲）

</specifics>

<deferred>
## Deferred Ideas

- QR画面からのURL共有・画像保存ボタン → Phase 3（CONN-01で対応）
- QRコードへのロゴ埋め込み → Phase 3以降で検討

</deferred>

---

*Phase: 00-prototype*
*Context gathered: 2026-04-22*
