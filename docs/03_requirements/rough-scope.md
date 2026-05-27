# 機能要件・スコープ

> v1.0 実装済み内容と今後の拡張候補を整理したもの。

---

## v1.0 実装済み機能

### 認証・アカウント
- Google / Facebook OAuth（Better Auth）
- セッション: DB保存、30日有効、1日ごと更新
- 初回ログイン後のプロフィール作成ウィザード（`/profile/wizard`）

### なふだ（ペルソナ）管理
- なふだ作成・編集（`/profile/edit`）
- フィールド: 表示名・アバターURL・bio・推しタグ・SNSリンク・同担拒否フラグ
- フィールド単位の公開/非公開設定（`fieldVisibility`）
- 複数ペルソナの作成（切り替えUIは `PersonaSwitcher` コンポーネント）

### QR・プロフィール共有
- QRコード生成（`/me` 画面のボタンから表示）
- QR URL形式: `/u/{urlId}/p/{shareToken}`（urlIdはシステム生成ランダム文字列）
- スキャンはデバイスのネイティブカメラで行いURLに遷移
- なふだの識別名（「自動車趣味用」等）は displayName で管理。URLには反映しない

### イベント・チェックイン
- イベント作成（`/events/new`）: スラッグ・名前・会場名・日付
- チェックイン: 1ペルソナ・同時に1イベントのみアクティブ
- 参加者一覧（`/e/$slug`）: アクティブ・過去のチェックイン両方を表示。同担拒否ユーザーは非表示

### コネクション
- 「つながる」ボタンで一方向コネクションを記録
- チェックイン中に「つながる」するとイベントコンテキスト（名前・会場・日付）が付与される
- コネクション一覧（`/connections`）: つながった日時・現場名・ハンドルネーム表示
- 同一ペルソナペアの重複防止（UNIQUE制約、`alreadyConnected: true` で返す）

### PWA
- `/me` ルートを Service Worker でキャッシュ（NetworkFirst）
- 静的アセットは CacheFirst
- Android Chrome: `beforeinstallprompt` でインストールバナー表示
- iOS Safari: `standalone` 検出でテキスト案内表示

---

## データモデル（実装済み）

```
user                    ← Better Auth管理
  id                    text (PK)
  email                 text UNIQUE
  name                  text

url_ids                 ← ユーザーの公開識別子（変更不可、1ユーザー1件、システム生成ランダム英数字）
  url_id                text (PK)
  user_id               → user.id UNIQUE

personas                ← "なふだ"
  id                    uuid (PK)
  user_id               → user.id
  display_name          text
  share_token           text UNIQUE     ← QR URL に埋め込む
  is_default            boolean
  avatar_url            text
  bio                   text
  oshi_tags             text[]
  dojin_reject          boolean
  field_visibility      jsonb           ← { sns_links: 'public'|'private', ... }
  is_public             boolean

sns_links               ← ペルソナごとの SNS リンク
  id                    uuid (PK)
  persona_id            → personas.id
  platform              text            ← 'x'|'instagram'|'tiktok'|'youtube'|'discord'|'line_openchat'|'github'|'spotify'|'other'
  url                   text
  display_order         smallint

events
  id                    uuid (PK)
  slug                  text UNIQUE     ← URL識別子（例: "animejapan-20260405"）
  name                  text
  venue_name            text
  event_date            timestamp
  host_user_id          → user.id

event_checkins
  id                    uuid (PK)
  event_id              → events.id
  persona_id            → personas.id
  user_id               → user.id
  gps_coordinates       point           ← nullable。x=経度, y=緯度
  checked_in_at         timestamp
  checked_out_at        timestamp       ← NULL = チェックイン中

connections             ← 一方向。双方向 = 2行
  id                    uuid (PK)
  from_persona_id       → personas.id  ← 「つながる」を押した側
  to_persona_id         → personas.id  ← QRを見せた側
  from_user_id          → user.id
  event_id              → events.id    ← nullable
  event_name            text            ← 非正規化（JOIN不要で表示）
  venue_name            text            ← 非正規化
  event_date            timestamp       ← 非正規化
  connected_at          timestamp
  UNIQUE(from_persona_id, to_persona_id)
```

---

## 画面一覧（実装済み）

| 画面 | URL | 認証 |
|------|-----|------|
| ホーム | `/` | 不要 |
| ログイン | `/login` | 不要 |
| マイなふだ | `/me` | 必要 |
| プロフィール編集 | `/profile/edit` | 必要 |
| プロフィール作成ウィザード | `/profile/wizard` | 必要 |
| コネクション一覧 | `/connections` | 必要 |
| イベント一覧 | `/events` | 必要 |
| イベント作成 | `/events/new` | 必要 |
| イベントルーム | `/e/$slug` | 不要 |
| 他者のなふだ（urlIdのみ） | `/u/$urlId` | 不要 |
| 他者のなふだ（QR経由） | `/u/$urlId/p/$token` | 不要 |

---

## 今後の拡張候補

- アプリ内 QR スキャン（`/scan`）— 現在はネイティブカメラ任せ
- コネクション先のなふだ変更追従（現在は記録時のスナップショットなし）
- **GPS暫定文脈**: チェックインなしで「つながる」を実行した際に位置情報と日時を自動記録（`connections.gps_coordinates` 追加）
- **コネクション文脈の編集**: 接続後にユーザーが場所名・イベント名をフリーテキストで後付け編集できる機能（正式なイベントエンティティへの紐付けはしない）
- メッセージ交換
- 一般イベント（勉強会・交流会）向け導線強化
- 通知（新しいつながり・同じ現場への参加者増加）
- アカウント削除（GDPR対応）
- 推しタグのサジェスト候補管理
