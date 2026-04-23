# Roadmap: なふだ

## Overview

なふだは推し活ユーザー向けの文脈型デジタル名刺アプリ。Phase 0でDB・認証なしのフロントエンドプロトタイプによりコアUX仮説を検証し、Phase 1でフルスタック基盤（認証・プロフィール・推し設定）を構築、Phase 2でイベントチェックイン機能を追加、Phase 3でQR・コネクション記録とPWAオフライン対応を完成させる。

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, 3): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 0: プロトタイプ** - DB・認証なしのフロントエンドのみでコアUXを検証する (completed 2026-04-22)
- [ ] **Phase 1: 認証・プロフィール基盤** - 実ユーザーデータを扱うフルスタック基盤と推し設定・同担拒否を構築する
- [ ] **Phase 2: イベント・チェックイン** - イベントチェックインと同じ現場にいた人一覧を実装する
- [ ] **Phase 3: QR・コネクション・PWA** - QRコード表示・コネクション記録・PWAオフライン対応を完成させる

## Phase Details

### Phase 0: プロトタイプ
**Goal**: DB・認証なし・モックデータのみで、QR交換・イベントルーム・推しタグ表示のコアUX仮説を検証できる
**Depends on**: Nothing (first phase)
**Requirements**: なし（プロトタイプはモックデータによるUX検証のみ。v1要件は Phase 1以降で実装）
**Success Criteria** (what must be TRUE):
  1. ユーザーはモックプロフィールカードを閲覧でき、ハンドル名・アバター・推しタグ・SNSリンクが表示される
  2. ユーザーはモックのイベントルーム画面で参加者カードがアニメーション付きで出現するのを確認できる
  3. ユーザーはモックQRコードを画面上で表示でき、モバイルのネイティブカメラで読み取ってURLに遷移できる
  4. ユーザーはモックログインボタンをタップするとログイン状態をシミュレートできる（DB・OAuth不使用）
  5. ユーザーはアプリをホーム画面に追加できる（Cloudflare Pages上でのPWAマニフェスト）
**Plans**: 3 plans

Plans:
- [ ] 00-01-PLAN.md — Vite+React+Tailwind v4+vite-plugin-pwa プロジェクト初期設定・mockData 型定義・ルーター骨格
- [ ] 00-02-PLAN.md — ProfileCard・ParticipantCard（motion アニメーション）・モックログイン画面の実装
- [ ] 00-03-PLAN.md — QRBottomSheet（react-modal-sheet）実装・PWA アイコン配置・Cloudflare Pages デプロイ

### Phase 1: 認証・プロフィール基盤
**Goal**: 実ユーザーがGoogleまたはFacebookでログインし、ハンドルネームベースのプロフィールを作成・管理でき、推し設定と同担拒否フラグを設定できる
**Depends on**: Phase 0
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, OSHI-01, OSHI-02
**Success Criteria** (what must be TRUE):
  1. ユーザーはGoogleまたはFacebookアカウントでログインでき、ハンドル名と本名が分離されたプロフィールを作成できる
  2. ログインしていないユーザーがQRコードのURLにアクセスすると、ログイン不要でプロフィールを閲覧できる（SNSリンク・推しタグ含む）
  3. ユーザーは複数のプロフィール（ペルソナ）を作成し、推し活用・本業用など切り替えながら使える
  4. ユーザーはプロフィールの各フィールドを項目単位で公開/非公開に設定でき、設定が即座に反映される
  5. ユーザーは推し・ジャンルタグを自由記述とサジェストで登録でき、同担拒否フラグを設定すると一覧から自分が非表示になる
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — TanStack Start移行 + Neon Postgres + Drizzle ORM + Better Auth スキーマセットアップ
- [ ] 01-02-PLAN.md — Google / Facebook OAuth実装・セッション管理・ルート保護（iOS 7日間ストレージ失効対策含む）
- [ ] 01-03-PLAN.md — プロフィールCRUD・初回ウィザード・複数ペルソナ・フィールド単位公開/非公開制御
- [ ] 01-04-PLAN.md — 推し・ジャンルタグ登録（Emblor）・同担拒否フラグ実装

### Phase 2: イベント・チェックイン
**Goal**: ログインユーザーがイベントにチェックインでき、同じ現場にいた参加者一覧（同担フィルタ適用済み）を閲覧できる。未ログインユーザーはハンドル名・アバターのみ閲覧できる
**Depends on**: Phase 1
**Requirements**: OSHI-03, OSHI-04, OSHI-05
**Success Criteria** (what must be TRUE):
  1. ログインユーザーはイベント名・会場名・日付・GPS座標を記録してチェックインでき、チェックイン中ステータスが表示される
  2. ログインユーザーは同じイベントにチェックインしている参加者の一覧を閲覧でき、同担拒否フラグを設定したユーザーは一覧に表示されない
  3. 未ログインユーザーがイベントページにアクセスすると参加者のハンドル名とアバターのみが表示され、個別プロフィールのリンクはクリックできない
**Plans**: TBD

Plans:
- [ ] 02-01: イベントチェックイン機能（日付・会場名・イベント名・GPS座標記録）
- [ ] 02-02: 参加者一覧表示（同担フィルタサーバーサイド適用・未ログイン制限）

### Phase 3: QR・コネクション・PWA
**Goal**: ユーザーがQRコードを自分のプロフィールとして表示・共有でき、相手が明示的に「つながる」を選択したときのみコネクションがイベント文脈付きで記録され、QRはオフラインでも表示できる
**Depends on**: Phase 2
**Requirements**: CONN-01, CONN-02, CONN-03, PWA-01, PWA-02
**Success Criteria** (what must be TRUE):
  1. ユーザーは自分のプロフィールQRコードを画面に表示でき、他者がそのQRを読むとプロフィールページに遷移する
  2. QRからプロフィールを閲覧した相手が「つながる」ボタンを押したときのみコネクションが記録され、QRスキャン自体では記録されない
  3. チェックイン中に「つながる」が実行されると、コネクション記録にイベント名・日付・会場のコンテキストが付与される
  4. アプリをインストールして機内モードにしても、自分のQRコードが表示できる（Service Workerキャッシュ）
  5. ユーザーはアプリをホーム画面に追加（PWAインストール）でき、ネイティブアプリのように起動できる
**Plans**: TBD

Plans:
- [ ] 03-01: QRコード表示実装（クライアントサイド生成・URLスキーム確定）
- [ ] 03-02: コネクション記録（「つながる」明示ボタン・イベントコンテキスト付与）
- [ ] 03-03: PWA Service Workerキャッシュ（QRオフライン表示・ホーム画面インストール）

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. プロトタイプ | 3/3 | Complete   | 2026-04-22 |
| 1. 認証・プロフィール基盤 | 0/4 | Not started | - |
| 2. イベント・チェックイン | 0/2 | Not started | - |
| 3. QR・コネクション・PWA | 0/3 | Not started | - |
