# Phase 3: QR・コネクション・PWA - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

ユーザーが自分のプロフィールQRコードを `/me` 画面から表示・共有し、相手が公開プロフィールで「つながる」を明示的に押したときのみコネクションをイベントコンテキスト付きで記録。コネクション一覧は `/connections` に表示。QRはオフライン表示可能（Service Worker）、PWAインストール対応。

</domain>

<decisions>
## Implementation Decisions

### /me 画面（ホーム画面リネーム）
- `/home` ルートを `/me` にリネーム（プロトタイプ https://nafuda-dxn.pages.dev/me と同一スキーム）
- `/me` はシンプルな名刺画面（プロフィール表示 ＋ αにとどめる）
- 「QRコードを表示」ボタンを配置 → タップで下からスライドアップするダイアログ（react-modal-sheet 使用、Phase 0 と同パターン）
- 「イベントにチェックイン」ボタンは廃止
- トップバーに「イベント」リンクを追加（「編集」「ログアウト」と同列）

### 「つながる」フロー
- 「つながる」ボタンは相手の公開プロフィールページ（`/u/$urlId`）に配置
- ログイン必須：未ログインユーザーはログイン画面に誘導
- 一方通行：ボタンを押した側のみが記録され、QRを見せた側の承認は不要
- チェックイン中の場合はイベントコンテキスト（イベント名・会場・日付）を自動付与

### コネクション一覧（/connections）
- 専用ページ `/connections` に独立
- `/me` には表示しない（シンプルな名刺画面を維持）
- コネクションカード表示項目: アバター・表示名・つながった日時
  - イベントコンテキストがあれば: イベント名・会場名・日付も表示
- カードをクリック → 相手の公開プロフィールページに遷移

### PWA・オフライン
- QRオフライン表示: `/me` 画面（プロフィールQR含む）を Service Worker でキャッシュ
- PWAインストールプロンプトのタイミング・UI: Claude の裁量
  - 推奨候補: QR表示時に「ホーム画面に追加するとオフラインでも表示できます」バナー

### Claude's Discretion
- PWAインストールプロンプトの具体的なタイミングと UI デザイン
- Service Worker のキャッシュ戦略詳細（キャッシュする範囲）
- 「つながる」後のフィードバック表示（トースト等）
- `/connections` ページのソート順・空状態デザイン

</decisions>

<specifics>
## Specific Ideas

- プロトタイプ（https://nafuda-dxn.pages.dev/me）の `/me` 画面レイアウトを踏襲
- QRダイアログは react-modal-sheet（Phase 0 で使用済みのライブラリ）でボトムシート形式
- トップバーは「編集」「イベント」「ログアウト」の3リンク構成

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-qr-pwa*
*Context gathered: 2026-04-26*
