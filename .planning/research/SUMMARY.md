# Project Research Summary

**Project:** なふだ — 推し活デジタル名刺アプリ
**Domain:** QRベースのイベント文脈型ソーシャル名刺 / ファンコミュニティ向け
**Researched:** 2026-04-21
**Confidence:** HIGH

---

## Executive Summary

なふだは「出会いの文脈ごと電子名刺を交換できる」という明確なニッチを持つ。競合の一般的なデジタル名刺アプリは実名・肩書き前提で設計されており、推し活ユーザーには根本的に合わない。本調査を通じて、このアプリには「匿名ハンドル前提」「同担拒否の一級機能化」「コンテキスト付き出会い記録」の3点が他にない差別化ポイントであることが確認された。

技術選定の核心は **Cloudflare Workers エッジデプロイ** という制約から逆算することにある。Node.js ネイティブパッケージ（Prisma等）は使えず、Neon Postgres + Drizzle ORM + TanStack Start の組み合わせが2025年時点で最も検証された構成。Phase 0はReact + Vite静的サイトで仮説検証し、Phase 1でフルスタック移行するという段階的アプローチが正しい。

最大のリスクは文化的落とし穴：同担拒否をPhase 2以降に先送りすると日本の推し活ユーザーから強い反発を受ける。また、プロフィールビューが認証なしで閲覧できないと、QRを読んだ相手がそもそもアプリを使ってくれない（受け取り側の離脱がコア価値を壊す）。

---

## Key Findings

### Recommended Stack

**Phase 0（プロトタイプ）:** React 19 + Vite 6 + React Router v7 + vite-plugin-pwa + qrcode.react + Tailwind CSS v4。Cloudflare Pages にデプロイ。TanStack Start もViteベースのため、コンポーネント資産は全量移行可能。

**Phase 1+（本番）:** TanStack Start v1 + TanStack Router + TanStack Query v5 + Better Auth + Neon Postgres + Drizzle ORM + Cloudflare Hyperdrive。Cloudflare Workers にデプロイ。

**Core technologies:**

| 技術 | 用途 | 選定理由 |
|------|------|---------|
| TanStack Start v1 | SSRフレームワーク | Cloudflare公式サポート、Viteベースでの移行コストゼロ |
| Better Auth | 認証 | Workers対応、Anonymous authプラグイン内蔵、X OAuth組み込み |
| Neon Postgres | DB | D1は社会グラフのJOINで不適。Neon + Hyperdrive がエッジ最適 |
| Drizzle ORM | ORM | Prismaは Workers非対応。Drizzleは軽量でWorkers対応 |
| qrcode.react | QR生成 | クライアントサイド生成（Workers CPU制限を回避）、SVG/Canvas対応 |

**⚠ 注意点:**
- Better Auth は v1.3.0-beta9 以下に固定（X OAuthリグレッションあり）
- vite-plugin-pwa は TanStack Start + SSR 環境で非互換あり → Phase 1ではカスタムWorkboxスクリプトで対応
- Zod は v3 固定（RHFリゾルバーがv4未対応）

---

### Expected Features

**Must have（テーブルステーク）:**
- プロフィール作成（ハンドル名・アバター）— 本名不要の設計が必須
- QRコード生成・表示 — オフライン動作が必須（PWAキャッシュ）
- SNSリンク一括表示（X / Instagram / Discord / LINE等）
- **認証なしでのプロフィール閲覧** — 受け取り側の離脱防止に直結
- モバイルファーストUI — ライブ会場はスマホのみ環境

**Should have（差別化）:**
- 推し・ジャンルタグ — コンテキストの核。これがなければ「ただのリンクまとめ」
- 同担設定（同担拒否フラグ）— Phase 1必須。Phase 2送りは文化的にNG
- イベントチェックイン + 同じ現場にいた人一覧 — 最大の差別化機能
- 複数プロフィール（ペルソナ分離）

**Defer（v2+）:**
- アプリ内QRスキャン
- ユーザー間メッセージ
- 名札ケース装飾フレーム
- リアルタイム更新（Phase 1はポーリングで十分）

---

### Architecture Approach

**"コンテキスト付き出会い"を一級データとして扱う**設計が核心。ユーザー（ペルソナ）・イベント・コネクションの3層を明確に分離し、接続時に「いつ・どこで」を必ず付与する。QR URLは `/u/<handle>?event=<slug>` 形式で文脈を自動付加。

**Major components:**

| コンポーネント | 責務 |
|------------|------|
| ProfileCardView | 認証不要の公開プロフィール表示（QRスキャン先） |
| EventRoomView | チェックイン済み参加者一覧（同担フィルタ適用済み） |
| QRDisplay | クライアントサイドQR生成・表示 |
| Auth Layer | Better Auth（X OAuth + 匿名セッション） |
| DAL (Drizzle) | フィールド単位の公開/非公開制御を含むデータアクセス |

**QR URLスキーム:**
- `/u/<handle>` — QRターゲット（ハンドル名でルックアップ）
- `/u/<handle>?event=<slug>` — コンテキスト付き
- `/e/<slug>` — イベントルーム
- `/join/<token>` — 招待リンク（Phase 2）

---

### Critical Pitfalls

1. **同担拒否をPhase 2以降に送る** — 一覧クエリをサーバーサイドでフィルタしないと推し活ユーザーから即座に反発を受ける。Phase 1必須。
2. **認証なしでプロフィールが見られない** — QRスキャンした側がサインアップを求められると即離脱。プロフィールビューは完全公開が必須。
3. **「名前」フォームラベル** — "名前" と書くと本名要求に見える。"ハンドル名 / 表示名" に統一し「本名は不要です」コピーを添える。
4. **QRをWorkerで生成** — CPU制限に引っかかる。クライアントサイド生成が正解。
5. **iOS 7日間ストレージ失効** — 月1回しか行かないコンサートユーザーがログアウト状態になる。認証はこれを考慮した設計が必要。
6. **KVをチェックイン状態に使う** — Eventual consistencyで参加者一覧が不整合になる。DBを使うこと。

---

## Implications for Roadmap

### Phase 0: プロトタイプ（UX検証）
**Rationale:** DB・認証なしでコアUX仮説（QR交換、イベントルーム）を最速検証  
**Delivers:** QR表示、モックプロフィール、モックイベントルーム（参加者カードアニメ）、PWA  
**Key pitfall to avoid:** プロフィールビューは認証なしで閲覧できる設計を Phase 0 から維持

### Phase 1: 認証・プロフィール基盤
**Rationale:** 実際のユーザーデータを扱うには認証・DBが必要。同担拒否もここで組み込む  
**Delivers:** Better Auth（X OAuth + 匿名）、プロフィールCRUD、複数ペルソナ、公開範囲制御  
**Stack:** TanStack Start移行、Neon + Drizzle、Better Auth  
**Critical:** フォームラベルをすべて「ハンドル名/表示名」に統一

### Phase 2: イベント・チェックイン
**Rationale:** プロフィール基盤が固まったらイベント文脈レイヤーを追加  
**Delivers:** チェックイン機能、「同じ現場にいた人」一覧（同担フィルタ付き）  
**Critical:** 同担拒否フィルタはサーバーサイドで全クエリに適用

### Phase 3: SNS連携・QR交換
**Rationale:** 実際のつながりを記録・活用する仕組み  
**Delivers:** コネクション記録（コンテキスト付き）、SNSリンク一括共有、QR URL revoke機能  
**Pitfall:** QRトークンは失効可能な設計にする（ユーザーIDを直接露出しない）

### Phase 4: 拡張・改善
**Delivers:** アプリ内QRスキャン、メッセージ、名札ケース装飾フレーム、Durable Objectsによるリアルタイム更新

### Phase Ordering Rationale

- 同担拒否はPhase 1に含める（Phase 2のイベント一覧より先に設計を確定させる必要があるため）
- Phase 0でプロフィール公開ビューを確立することで、Phase 1以降もUX変更コストを最小化
- QR URLスキームはPhase 0で確定させる（後から変えると過去の共有リンクが全滅する）

### Research Flags

- **Phase 1:** Better Auth + TanStack Start の統合は実装例が少なく、planningフェーズで詳細リサーチ推奨
- **Phase 2:** 「同じ現場にいた人」一覧のリアルタイム性要件（ポーリング間隔・Durable Objects移行タイミング）は実装時に再判断
- **Phase 0〜1:** PWA + TanStack Start のService Worker統合（既知の非互換あり）は早期に動作確認を

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 公式ドキュメント・GitHubリリースノートで検証済み |
| Features | HIGH | 競合製品調査 + 推し活文化の一次知識 |
| Architecture | HIGH | Cloudflare公式ガイド + 業界標準パターン |
| Pitfalls | HIGH | 同担拒否は文化的一次知識。技術的落とし穴はCloudflare公式ドキュメント準拠 |

**Overall confidence:** HIGH

### Gaps to Address

- Better Auth + TanStack Start の実際の統合コード例が少ない → Phase 1計画時に詳細リサーチ
- 「15〜30分の可視化遅延」（ストーキング防止）のUX実装詳細は未定義 → Phase 2計画時に設計

---

## Sources

### Primary (HIGH confidence)
- TanStack Start v1 公式ドキュメント
- Cloudflare Workers Framework Guides（TanStack Start）
- Better Auth 公式ドキュメント
- Neon Postgres + Hyperdrive 公式ガイド
- Drizzle ORM Cloudflare Workers ガイド

### Secondary (MEDIUM confidence)
- vite-plugin-pwa GitHub Issue #4988（TanStack Start互換性）
- Better Auth GitHub Issues（X OAuth regression in beta9+）

---
*Research completed: 2026-04-22*
*Ready for roadmap: yes*
