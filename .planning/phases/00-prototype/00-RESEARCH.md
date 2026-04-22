# Phase 0: プロトタイプ - Research

**Researched:** 2026-04-22
**Domain:** React SPA + Vite + Tailwind CSS v4 + PWA + Cloudflare Pages / QRコード + ボトムシート
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### QR表示UI
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

### Deferred Ideas (OUT OF SCOPE)
- QR画面からのURL共有・画像保存ボタン → Phase 3（CONN-01で対応）
- QRコードへのロゴ埋め込み → Phase 3以降で検討
</user_constraints>

---

## Summary

Phase 0はDB・認証なしのフロントエンド専用プロトタイプである。スタックは React + Vite + Tailwind CSS v4 + vite-plugin-pwa + Cloudflare Pages に確定しており、研究の焦点は各ライブラリの正確なバージョン・セットアップ手順・落とし穴の把握に絞られる。

ボトムシートには `react-modal-sheet`（v5.6.0、2026-03-27 更新）を使用する。同ライブラリは Motion（旧 Framer Motion）をピア依存として要求し、スナップポイント・ドラッグジェスチャー・モバイル KB 回避を内蔵する。QRコードは `qrcode.react` の `QRCodeSVG` コンポーネント（v4.x）でレンダリングし、SVGとして拡大しても品質が落ちない。

Tailwind CSS は v4 で大幅にセットアップが変わっており（`@tailwindcss/vite` プラグイン方式、`tailwind.config.js` 不要）、Cloudflare Pages へのデプロイは `dist/` を出力先にしつつ `_headers` ファイルで PWA マニフェストの MIME タイプを正しく宣言する必要がある。Cloudflare Pages はデフォルトで SPA モード（404.html 未配置時に全パスを `/index.html` にフォールバック）をサポートするため、`_redirects` は不要。

**Primary recommendation:** `react-modal-sheet + motion + qrcode.react + react-router + vite-plugin-pwa` を核にした React+Vite SPA を構築し、Cloudflare Pages の SPA 自動フォールバックに乗る。

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.x | UI コンポーネント | デファクトスタンダード |
| react-dom | 19.x | DOM レンダリング | react に対応 |
| vite | 6.x | ビルドツール | Phase 0〜以降の共通基盤 |
| @vitejs/plugin-react | 4.x | React 用 Vite プラグイン | HMR・JSX 変換 |
| tailwindcss | 4.x | ユーティリティ CSS | v4 で Vite ネイティブプラグイン化 |
| @tailwindcss/vite | 4.x | Tailwind v4 Vite プラグイン | v4 の推奨インストール方式 |
| react-router | 7.x | クライアントサイドルーティング | Phase 0 は SPA モード（Library モード） |
| qrcode.react | 4.x | QRコード生成（SVG/Canvas） | 最多利用・1230+ 依存プロジェクト |
| react-modal-sheet | 5.6.0 | ボトムシート UI | Motion ベース・最新 2026-03 更新済 |
| motion | 12.x | アニメーション基盤（旧 Framer Motion） | react-modal-sheet のピア依存 |
| vite-plugin-pwa | 1.x | Service Worker + マニフェスト生成 | Zero-config PWA |
| workbox-window | 7.x | SW 更新通知（dev dep） | vite-plugin-pwa が要求 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/react | 19.x | TypeScript 型定義 | TypeScript 使用時 |
| @types/react-dom | 19.x | TypeScript 型定義 | TypeScript 使用時 |
| typescript | 5.x | 型チェック | プロジェクト全体 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-modal-sheet | react-spring-bottom-sheet | react-spring-bottom-sheet はメンテ停滞気味・Motion ベースが現在のスタンダード |
| react-modal-sheet | Tailwind CSS のみで自作 | アクセシビリティ・ドラッグジェスチャーを自前実装する複雑性がある |
| qrcode.react | react-qr-code | どちらも有効。qrcode.react の方が利用実績多・v4 で配列エンコード対応済み |
| react-router | TanStack Router | Phase 1 で TanStack Start に移行予定のため、Phase 0 はシンプルな react-router を選択 |

**Installation:**

```bash
# プロジェクト作成
npm create vite@latest nafuda -- --template react-ts
cd nafuda

# Tailwind CSS v4 (Vite プラグイン方式)
npm install tailwindcss @tailwindcss/vite

# ルーティング
npm install react-router

# QRコード
npm install qrcode.react
npm install -D @types/qrcode.react  # 不要な場合あり（v4 で型同梱）

# ボトムシート + アニメーション
npm install react-modal-sheet motion

# PWA
npm install -D vite-plugin-pwa workbox-window
```

---

## Architecture Patterns

### Recommended Project Structure

```
nafuda/
├── public/
│   ├── icons/               # PWA アイコン（192x192, 512x512 PNG）
│   ├── favicon.ico
│   └── _headers             # Cloudflare Pages ヘッダー設定（MIME等）
├── src/
│   ├── components/
│   │   ├── ui/              # 汎用 UI コンポーネント（BottomSheet, QRCode等）
│   │   ├── profile/         # プロフィールカード関連
│   │   └── event/           # イベントルーム関連
│   ├── data/
│   │   └── mockData.ts      # モックデータ（プロフィール・イベント・参加者）
│   ├── pages/
│   │   ├── ProfilePage.tsx  # プロフィール表示ページ
│   │   ├── EventRoomPage.tsx# イベントルームページ
│   │   └── LoginMockPage.tsx# モックログインページ
│   ├── hooks/
│   │   └── useBottomSheet.ts# ボトムシート開閉ロジック
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css            # @import "tailwindcss";
├── vite.config.ts
└── tsconfig.json
```

### Pattern 1: Tailwind CSS v4 セットアップ（Vite プラグイン方式）

**What:** v4 は `tailwind.config.js` なし。Vite プラグインとして追加し CSS に `@import "tailwindcss"` を書くだけ。
**When to use:** Vite ベースの全プロジェクト（v3 の PostCSS 方式は不要）

```typescript
// vite.config.ts
// Source: https://tailwindcss.com/docs (Vite plugin guide)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'なふだ',
        short_name: 'なふだ',
        description: 'QRでその場でつながれる推し活デジタル名刺',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: true },
    }),
  ],
})
```

```css
/* src/index.css */
@import "tailwindcss";
```

### Pattern 2: ボトムシート（react-modal-sheet）

**What:** `react-modal-sheet` のコンパウンドコンポーネントパターン。高さは `snapPoints` で制御。
**When to use:** QRコード表示・その他ハーフモーダルが必要な箇所すべて

```tsx
// src/components/ui/QRBottomSheet.tsx
// Source: https://github.com/Temzasse/react-modal-sheet
import { Sheet } from 'react-modal-sheet'
import { QRCodeSVG } from 'qrcode.react'

interface QRBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  url: string  // Phase 0 ではモック URL
}

export function QRBottomSheet({ isOpen, onClose, url }: QRBottomSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.5]}  // 画面高さの 50%
      initialSnap={0}
    >
      <Sheet.Container>
        <Sheet.Header />
        <Sheet.Content className="flex items-center justify-center p-8">
          <QRCodeSVG
            value={url}
            size={240}
            marginSize={4}
            level="M"
          />
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  )
}
```

### Pattern 3: QRコード（qrcode.react SVG）

**What:** `QRCodeSVG` コンポーネントでベクター形式のQRコードをレンダリング。拡大縮小で品質劣化なし。

```tsx
// Source: https://github.com/zpao/qrcode.react
import { QRCodeSVG } from 'qrcode.react'

// Phase 0 モック URL（将来は動的に生成）
const MOCK_PROFILE_URL = 'https://nafuda.pages.dev/p/mock-user-001'

<QRCodeSVG
  value={MOCK_PROFILE_URL}
  size={240}
  marginSize={4}   // QR仕様推奨は4モジュール
  level="M"        // エラー訂正レベル M（~15%）。ロゴなしなので M で十分
  bgColor="#FFFFFF"
  fgColor="#000000"
/>
```

### Pattern 4: Cloudflare Pages 用 `_headers` ファイル

**What:** PWA マニフェストと Service Worker のキャッシュ制御を正しく設定する。
**When to use:** デプロイ時に必須。`public/` フォルダに配置する。

```
# public/_headers
/manifest.webmanifest
  Content-Type: application/manifest+json

/sw.js
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/workbox-*.js
  Cache-Control: public, max-age=31536000, immutable

/*
  Cache-Control: no-cache
```

### Pattern 5: モックデータ構造

**What:** DB なしプロトタイプ用のモックデータ型定義。Phase 1 のスキーマと互換性を意識した構造にする。

```typescript
// src/data/mockData.ts
export interface MockProfile {
  id: string
  handle: string       // ハンドル名（表示名）
  avatarUrl: string
  oshiTags: string[]   // 推し・ジャンルタグ
  snsLinks: SnsLink[]
  profileUrl: string   // QR に埋め込む URL（モック）
}

export interface SnsLink {
  platform: 'x' | 'instagram' | 'discord' | 'line_openchat' | 'tiktok' | 'youtube'
  url: string
  handle: string
}

export interface MockEvent {
  id: string
  name: string
  venue: string
  date: string
  participants: MockProfile[]
}

export const MOCK_PROFILE: MockProfile = {
  id: 'mock-user-001',
  handle: 'すみれ🌸',
  avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=mock001',
  oshiTags: ['#田中推し', '#星降る夜のライブ', '#Aグループ'],
  snsLinks: [
    { platform: 'x', url: 'https://x.com/sumire_example', handle: '@sumire_example' },
    { platform: 'instagram', url: 'https://instagram.com/sumire_example', handle: 'sumire_example' },
  ],
  profileUrl: 'https://nafuda.pages.dev/p/mock-user-001',
}
```

### Pattern 6: モックログイン状態管理

**What:** `useState` のみでログイン状態をシミュレート。localStorage 永続化はしない（Phase 0 のスコープ外）。

```tsx
// src/App.tsx のパターン
const [isLoggedIn, setIsLoggedIn] = useState(false)

// モックログインボタン
<button onClick={() => setIsLoggedIn(true)}>
  Googleでログイン（デモ）
</button>
```

### Anti-Patterns to Avoid

- **`tailwind.config.js` を v4 で作成する:** v4 はプラグイン方式に変わった。設定ファイルは不要。
- **`framer-motion` をインストールする:** 現在は `motion` パッケージに統合済み。`react-modal-sheet` も `motion` を peer dep として要求する。
- **QRCodeSVG に `imageSettings` でロゴを埋め込む:** ユーザー決定でロゴなし確定。精度優先。
- **`/404.html` を配置する:** Cloudflare Pages で SPA 自動フォールバックが無効化される。
- **`_redirects` に `/* /index.html 200` を書く:** 無限ループ検知でCFが無視する。SPA フォールバックはデフォルト動作に任せる。
- **`react-router-dom` をインストールする（v7 以降）:** v7 から `react-router` に統合された。`react-router-dom` は後方互換のリエクスポートだが、新規では `react-router` を使う。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QRコード生成 | Canvas/SVG 手書き | `qrcode.react` | QR の誤り訂正・バージョン計算は複雑な仕様がある |
| ボトムシートモーダル | 自作 position:fixed + transform | `react-modal-sheet` | iOS Safari のゴム引きスクロール・ドラッグジェスチャー処理が難しい |
| スライドアニメーション | CSS transition 手書き | `motion`（react-modal-sheet が内蔵） | spring 物理ベースアニメーションが自然な感触を出す |
| PWA マニフェスト生成 | manifest.json 手書き | `vite-plugin-pwa` | Service Worker との結合・precache リスト生成の複雑性 |
| アバター自動生成 | 独自ルール | DiceBear API (`api.dicebear.com`) | 無料・多スタイル・URL パラメータでシード指定可能 |

**Key insight:** ボトムシートの iOS 互換性（overscroll-behavior, touch-action, `-webkit-overflow-scrolling`）は手書きでは確実に漏れが出る。ライブラリに任せる。

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 のセットアップ方法の混乱

**What goes wrong:** v3 の方法（`npx tailwindcss init`, PostCSS config, `@tailwind base/components/utilities`）を試みてエラーになる。
**Why it happens:** 2025年以降のほとんどの検索結果がまだ v3 の情報を返す。
**How to avoid:** `npm install tailwindcss @tailwindcss/vite` → vite.config.ts に `tailwindcss()` プラグイン追加 → `index.css` に `@import "tailwindcss"` の3ステップのみ。
**Warning signs:** `tailwind.config.js not found` エラーや `@tailwind directive` の警告が出たら v3 の手順を踏んでいる。

### Pitfall 2: Cloudflare Pages での PWA マニフェスト MIME タイプ

**What goes wrong:** `manifest.webmanifest` が `text/plain` で配信され、ブラウザが PWA として認識しない。
**Why it happens:** Cloudflare Pages が `.webmanifest` 拡張子を自動認識しない場合がある。
**How to avoid:** `public/_headers` ファイルで `Content-Type: application/manifest+json` を明示的に設定する。
**Warning signs:** Lighthouse の PWA 診断で「Manifest not installable」が出る。

### Pitfall 3: `framer-motion` vs `motion` パッケージ混在

**What goes wrong:** `npm install framer-motion` でインストールし、`react-modal-sheet` の `motion` ピア依存と別パッケージとして扱われる。
**Why it happens:** 2024年に framer-motion が motion パッケージに統合されたが、古いドキュメントが framer-motion を案内している。
**How to avoid:** `npm install motion` のみ使う。インポートは `import { motion } from 'motion/react'`。
**Warning signs:** `peer dep conflict` の npm 警告、または `Cannot find module 'framer-motion'` エラー。

### Pitfall 4: Cloudflare Pages での `/404.html` 配置による SPA ルーティング破壊

**What goes wrong:** カスタム 404 ページ用に `404.html` を置いたら、SPA の全ルートが 404 になる。
**Why it happens:** Cloudflare Pages は `/404.html` の存在で SPA モードを無効化する仕様。
**How to avoid:** Phase 0 では `404.html` を配置しない。SPA フォールバックはデフォルト動作に任せる。
**Warning signs:** デプロイ後に `/profile` などのサブルートで 404 が返る。

### Pitfall 5: iOS Safari でのボトムシートとアドレスバーの競合

**What goes wrong:** ボトムシートが iOS のアドレスバー縮退後の高さを誤認識し、画面外にはみ出る。
**Why it happens:** `100vh` が iOS では visual viewport を返さない。
**How to avoid:** `react-modal-sheet` は内部で CSS custom property `--vh` を使った iOS 対応を実装済み。自作実装で同じ問題に踏み込まない。
**Warning signs:** iPhone Safari 実機でボトムシートが半分しか表示されない。

### Pitfall 6: モックQRのURLがスキャン後に動作しない

**What goes wrong:** Phase 0 でモック URL（例: `https://nafuda.pages.dev/p/mock-user-001`）をQRに埋め込んでも、そのページが実際には存在しない。
**Why it happens:** プロトタイプの段階ではルーティングを全部実装しきれない。
**How to avoid:** Phase 0 では `/p/:userId` ルートを実装し、モックデータで ID を参照して表示するまで実装する。または QR スキャン後のランディングをモックプロフィールページに向ける。
**Warning signs:** QRをスキャンして 404 になる（成功基準 3 を満たせない）。

---

## Code Examples

Verified patterns from official sources:

### react-router v7 SPA セットアップ（Library モード）

```tsx
// src/main.tsx
// Source: https://reactrouter.com/start/library/installation
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

```tsx
// src/App.tsx
import { Routes, Route } from 'react-router'
import { ProfilePage } from './pages/ProfilePage'
import { EventRoomPage } from './pages/EventRoomPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProfilePage />} />
      <Route path="/p/:userId" element={<ProfilePage />} />
      <Route path="/event/:eventId" element={<EventRoomPage />} />
    </Routes>
  )
}
```

### vite-plugin-pwa の React 向け useRegisterSW

```tsx
// src/components/PWABadge.tsx
// Source: https://vite-pwa-org.netlify.app/frameworks/react
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWABadge() {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (offlineReady) return <div>オフライン使用可能</div>
  if (needRefresh) return (
    <div>
      <span>新しいバージョンが利用可能</span>
      <button onClick={() => updateServiceWorker(true)}>更新</button>
    </div>
  )
  return null
}
```

### 参加者カードのアニメーション（Motion）

```tsx
// src/components/event/ParticipantCard.tsx
// Source: https://motion.dev/docs/react
import { motion } from 'motion/react'

interface ParticipantCardProps {
  profile: MockProfile
  index: number
}

export function ParticipantCard({ profile, index }: ParticipantCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm"
    >
      <img
        src={profile.avatarUrl}
        alt={profile.handle}
        className="w-10 h-10 rounded-full"
      />
      <div>
        <p className="font-medium text-sm">{profile.handle}</p>
        <div className="flex flex-wrap gap-1">
          {profile.oshiTags.map(tag => (
            <span key={tag} className="text-xs text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + PostCSS | `@tailwindcss/vite` プラグイン + `@import "tailwindcss"` | 2025年初頭（v4 リリース） | 設定ファイル不要・ビルド高速化 |
| `framer-motion` パッケージ | `motion` パッケージ（`motion/react` からインポート） | 2024年後半 | パッケージ名変更。API は互換 |
| `react-router-dom` | `react-router`（v7 から統合） | React Router v7（2024年末） | 新規は `react-router` のみで OK |
| `@tailwind base` ディレクティブ | `@import "tailwindcss"` | v4 | 古いディレクティブは v4 で非推奨 |

**Deprecated/outdated:**
- `framer-motion`: `motion` に統合。新規インストールは `npm install motion`
- `react-router-dom` の新規インストール: `react-router` パッケージに統合済み
- Tailwind v3 の設定方式（`tailwind.config.js` + PostCSS）: v4 では不要

---

## Open Questions

1. **PWA アイコン生成方法**
   - What we know: `vite-plugin-pwa` は `icons` の `src` に実ファイルが必要
   - What's unclear: Phase 0 向けの暫定アイコンをどう素早く準備するか
   - Recommendation: DiceBear または favicon.io で 192x192 / 512x512 PNG を仮生成し `public/icons/` に配置する

2. **モックログインの状態永続化**
   - What we know: ユーザーはモックログインボタンでログイン状態をシミュレートできる必要がある
   - What's unclear: ページリロード後も状態を保つべきか
   - Recommendation: Phase 0 は `useState` のみ（リロードでリセット）。要件 4 は「タップするとシミュレート」なので永続化は不要

3. **QR スキャン後のランディング実装範囲**
   - What we know: 成功基準 3 は「モックQRコードを画面上で表示でき、モバイルのネイティブカメラで読み取ってURLに遷移できる」
   - What's unclear: QR に埋め込む URL のランディングページが Phase 0 で実装されるか
   - Recommendation: `/p/:userId` ルートを実装しモックデータで表示する。スキャン → ランディング → プロフィール表示までをデモできる状態にする（Plan 00-02 でカバー）

---

## Sources

### Primary (HIGH confidence)
- https://github.com/zpao/qrcode.react/blob/trunk/README.md — qrcode.react v4 API（QRCodeSVG props）
- https://github.com/Temzasse/react-modal-sheet — react-modal-sheet v5.6.0 API・インストール
- https://motion.dev/docs/react-installation — Motion v12 インストール・import パス
- https://tailwindcss.com/docs — Tailwind CSS v4 Vite プラグインセットアップ
- https://vite-pwa-org.netlify.app/guide/ — vite-plugin-pwa v1.x 設定・React 向け useRegisterSW
- https://developers.cloudflare.com/pages/configuration/serving-pages/ — Cloudflare Pages SPA フォールバック動作

### Secondary (MEDIUM confidence)
- https://reactrouter.com/start/library/installation — React Router v7 Library モード（SPA）インストール
- https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/ — Vite→ CF Pages デプロイ設定
- https://github.com/vite-pwa/vite-plugin-pwa/pull/353/files — CF Pages 用 `_headers` 設定パターン

### Tertiary (LOW confidence)
- DEV Community, Medium 各記事 — Tailwind v4 セットアップ手順（複数記事で一致）

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 各ライブラリは公式ドキュメントで最新バージョン・API を確認済み
- Architecture: HIGH — パターンは公式サンプルコードに基づく
- Pitfalls: MEDIUM — CF Pages + PWA の _headers 設定は GitHub PR コメントレベルの情報が混在

**Research date:** 2026-04-22
**Valid until:** 2026-05-22（Tailwind v4・Motion は活発更新中のため30日以内に確認推奨）
