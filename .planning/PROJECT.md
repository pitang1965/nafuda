# なふだ

## What This Is

イベント・ライブ・聖地巡礼などの現場で出会った人と、QRコードのワンタッチで即つながれる文脈型デジタル名刺Webアプリ。匿名・ハンドルネーム前提で、推し・ジャンルタグや現場チェックインを軸に「いつ・どこで・誰の現場で出会ったか」という文脈ごと記録できる。推し活ユーザーを主軸に、勉強会・交流会など一般イベントにも横展開できる汎用性を持つ。

## Core Value

QRを読んだらその場でSNSリンクが見えてつながれる——口頭でID交換する手間・気まずさをゼロにする。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] プロフィール作成・QRコード生成・共有
- [ ] 推し・ジャンルタグ登録（自由記述＋サジェスト）
- [ ] SNSリンク一括共有（X / Instagram / Discord / LINE オープンチャット等）
- [ ] イベント・聖地チェックイン（日付＋場所＋イベント名）
- [ ] 「同じ現場にいた人」一覧表示（イベント一括つながり）
- [ ] 同担設定・公開範囲設定（同担拒否フラグ含む）
- [ ] 複数プロフィール切り替え（推し活用・本業用など）
- [ ] 匿名・ハンドルネーム前提のアカウント設計
- [ ] ソーシャルログイン（X OAuth優先、匿名継続利用にも配慮）
- [ ] PWA対応（1タップインストール）

### Out of Scope

- NFC交換 — 対応デバイス依存・複雑性が高いため除外
- 名札ケース装飾（フレーム・リボン・デコ） — Phase 2以降
- ユーザー間メッセージ — Phase 2以降
- アプリ内QRスキャン — Phase 2以降（Phase 0〜1はネイティブカメラ利用）
- モバイルネイティブアプリ — WebアプリPWA優先

## Context

- コンセプト詳細: `docs/01_concept/concept_overview.md`
- 旧名称 Badgein から「なふだ」へ刷新済み。推し活ユーザーにフォーカスし、文脈型名刺として再定義。
- Phase 0（プロトタイプ）はDB不使用・フロントエンドのみ。モックデータ・モックログインで UX 検証が目的。
- Phase 1からバックエンド・認証・DBを導入し本番稼働へ。
- 「同担拒否」ユーザーへの配慮が文化的に重要。同担拒否フラグで一覧表示から非表示にできる設計が必須。

## Constraints

- **Tech Stack**: React + Vite（Phase 0）→ TanStack Start（Phase 1〜）、Cloudflare Workers デプロイ
- **Auth**: X OAuth優先。本名をUIに露出しない設計必須
- **DB**: Postgres（Supabase / Neon 有力）— Phase 1から導入
- **Privacy**: ハンドルネーム・アバター運用を前提。フィールド単位で公開/非公開を制御

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NFC非対応 | 対応デバイス依存・実装コスト高・QRで代替可能 | — Pending |
| TanStack Start（本番）| Viteベース・型安全ルーティング・Cloudflare Workers公式サポート。Vite+はプレビュー段階で未成熟 | — Pending |
| 匿名・ハンドル前提設計 | 推し活文化では本名公開NG。オプトインでのみ実名利用可 | — Pending |
| Phase 0をフロントエンドのみに限定 | DB・認証なしでUX仮説を最速検証するため | — Pending |

---
*Last updated: 2026-04-21 after initialization*
