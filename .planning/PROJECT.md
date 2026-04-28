# なふだ

## What This Is

イベント・ライブ・聖地巡礼などの現場で出会った人と、QRコードのワンタッチで即つながれる文脈型デジタル名刺Webアプリ。匿名・ハンドルネーム前提で、推し・ジャンルタグや現場チェックインを軸に「いつ・どこで・誰の現場で出会ったか」という文脈ごと記録できる。

## Core Value

QRを読んだらその場でSNSリンクが見えてつながれる——口頭でID交換する手間・気まずさをゼロにする。

## Current State

**Shipped:** v1.0 MVP (2026-04-28)
**Stack:** TanStack Start + Neon Postgres + Drizzle ORM + Better Auth + Cloudflare Pages
**LOC:** ~4,900 TypeScript
**URL:** https://nafuda-dxn.pages.dev/

## Requirements

### Validated

- ✓ プロフィール作成・複数ペルソナ・フィールド単位公開/非公開 — v1.0
- ✓ 推し・ジャンルタグ登録（自由記述＋Emblor サジェスト） — v1.0
- ✓ SNSリンク一括共有（X / Instagram / Discord / LINE 等） — v1.0
- ✓ イベントチェックイン（日付・会場名・GPS座標） — v1.0
- ✓ 同じ現場にいた人一覧（同担フィルタ適用済み） — v1.0
- ✓ 同担拒否フラグ — v1.0
- ✓ Google / Facebook OAuth — v1.0
- ✓ QRコードでプロフィール表示・コネクション記録 — v1.0
- ✓ PWAインストール・オフラインQR表示 — v1.0

### Active (v2候補)

- [ ] プロフィール画像アップロード（有料機能候補）
- [ ] アプリ内QRスキャン（現在はネイティブカメラで代替）
- [ ] イベント参加者リアルタイム更新（Cloudflare Durable Objects）
- [ ] ユーザー間メッセージ
- [ ] 名札ケース風フレーム装飾（推しカラー連動）

### Out of Scope

- NFC交換 — 対応デバイス依存・QRで代替可能
- X OAuth — 有料APIのため除外
- 実名・所属フィールド — 匿名・ハンドル前提設計に反する
- アルゴリズムフィード — コンテキスト型出会いが軸
- モバイルネイティブアプリ — PWA優先

## Constraints

- **Tech Stack**: TanStack Start、Cloudflare Pages/Workers
- **Auth**: Google / Facebook OAuth のみ
- **DB**: Neon Postgres（neon-http）+ Drizzle ORM
- **Privacy**: ハンドルネーム・アバター運用前提。フィールド単位で公開/非公開を制御

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TanStack Start | Viteベース・型安全ルーティング・Cloudflare Workers公式サポート | ✓ Good |
| Neon Postgres + Drizzle ORM | 型安全・Edge対応・無料枠あり | ✓ Good |
| Better Auth | Next.js 非依存・Cloudflare Workers 対応 | ✓ Good（APIクセあり） |
| バニラ JS Service Worker | Workbox の npm インポートがバンドルされず動作しない問題を回避 | ✓ Good |
| QR URL: /u/{urlId}/p/{shareToken} | urlId が公開識別子、shareToken は参照検証用 | ✓ Good |
| コネクション one-way 設計 | 双方向は 2 行・イベントコンテキスト非正規化 | ✓ Good |
| NFC非対応 | 対応デバイス依存・QRで代替可能 | ✓ Good |
| Phase 0をフロントエンドのみに限定 | DB・認証なしでUX仮説を最速検証 | ✓ Good |

---
*Last updated: 2026-04-28 after v1.0 milestone*
