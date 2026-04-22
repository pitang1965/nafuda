# 技術選定

## 方針

- プロトタイプ → 初期リリース → 拡張 の段階に合わせて選定
- プロトタイプの資産を本番へ可能な限りそのまま持ち込める構成を優先
- オーバーエンジニアリングを避け、シンプルな構成から始める

---

## プロトタイプ（Phase 0）

| 項目 | 選定 | 理由 |
|------|------|------|
| フレームワーク | React + Vite | 軽量・高速な開発サイクル。本番候補（TanStack Start）もViteベースで資産を移行しやすい |
| パッケージマネージャー | pnpm | ディスク効率、高速インストール |
| PWA | vite-plugin-pwa | Viteとの統合がシンプル。manifest・Service Workerを自動生成 |
| スタイリング | なし（最小限のCSS） | プロトはUX確認が目的。スタイリングは Phase 1 で Tailwind CSS を導入 |
| 状態管理 | React Context（useContext） | プロトはこれで十分。ログイン状態などのモック管理に使用 |
| QRコード | ネイティブカメラアプリで読み取り | プロトにQRスキャン機能は実装しない。QRコードはURLエンコードし静的画像として生成 |
| データ | モックデータ（TS定数） | DB不使用。`src/mock/data.ts` にハードコード |
| ルーティング | React Router v7 | シンプルなSPAルーティング |
| デプロイ | Cloudflare Pages | 静的サイトのホスティング。プロトはSSR不要なので Pages で十分 |

---

## 本番（Phase 1〜）候補

| 項目 | 選定候補 | 備考 |
|------|----------|------|
| フレームワーク | **TanStack Start** | Viteベース・型安全なルーティング（TanStack Router）・Server Functions対応。Next.jsより軽い。ただし2024〜のため成熟度は要注視 |
| 代替案 | Next.js | 成熟しているが重め。本番で採用した場合はプロトからの移行コストあり |
| スタイリング | **Tailwind CSS** | Phase 1 で確定。コンポーネントライブラリ（shadcn/ui 等）との組み合わせも検討 |
| 認証 | 未定（Better Auth / Clerk / Auth.js 等） | X OAuth を優先対応。ハンドルネーム前提のため本名をUIに露出しない設計が必要 |
| DB | 未定 | ユーザー・イベント・コネクション管理が必要。Postgres（Supabase / Neon）が有力 |
| QRスキャン | 未定（`qr-scanner` 等） | Phase 1で要検討。デバイスのネイティブカメラで十分な場合は不要 |
| デプロイ | **Cloudflare Workers** | TanStack Start は Cloudflare Vite プラグイン経由で Workers へのデプロイを公式サポート（2025年10月〜）。Pages は統合方向につき Workers を推奨 |

---

## 保留・未決事項

- 本番フレームワークの最終決定（TanStack Start の安定性を見て判断）
- 認証ライブラリの選定
- DBの選定（Supabase / Neon / その他）
- QRスキャン機能を Phase 1 でアプリ内実装するか、ネイティブカメラ継続とするか
