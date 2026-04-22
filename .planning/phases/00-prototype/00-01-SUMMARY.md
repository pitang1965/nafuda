---
phase: 00-prototype
plan: "01"
subsystem: ui
tags: [vite, react, typescript, tailwindcss, react-router, pwa, vite-plugin-pwa]

# Dependency graph
requires: []
provides:
  - Vite 8 + React 19 + TypeScript プロジェクト骨格
  - Tailwind CSS v4 (@tailwindcss/vite プラグイン経由)
  - vite-plugin-pwa 設定（PWA manifest・workbox）
  - react-router BrowserRouter + Routes 設定
  - MockProfile・MockEvent 型定義とモック定数（src/data/mockData.ts）
  - ProfilePage・EventRoomPage・LoginMockPage スタブページ
  - public/_headers（Cloudflare Pages 用 MIME・キャッシュ設定）
affects: [00-02, 00-03, 01-prototype]

# Tech tracking
tech-stack:
  added:
    - vite@8.0.9
    - react@19
    - typescript
    - tailwindcss@4 + @tailwindcss/vite
    - react-router@7
    - qrcode.react
    - react-modal-sheet
    - motion
    - vite-plugin-pwa@1.2.0 (--legacy-peer-deps)
    - workbox-window
  patterns:
    - Tailwind v4 は @import "tailwindcss" のみ（v3 ディレクティブ不要）
    - react-router v7 は react-router パッケージから import（react-router-dom 不使用）
    - BrowserRouter は main.tsx でラップ、App.tsx は Routes のみ

key-files:
  created:
    - vite.config.ts
    - src/index.css
    - src/main.tsx
    - src/App.tsx
    - src/data/mockData.ts
    - src/pages/ProfilePage.tsx
    - src/pages/EventRoomPage.tsx
    - src/pages/LoginMockPage.tsx
    - public/_headers
    - public/icons/.gitkeep
    - .gitignore
  modified: []

key-decisions:
  - "vite-plugin-pwa 1.2.0 は Vite 8 をまだ peerDependencies に含めていないため --legacy-peer-deps でインストール。動作は正常。"
  - "motion パッケージを使用（framer-motion は統合済みのため不使用）"
  - "react-router v7 から react-router-dom は不要。react-router のみ使用。"

patterns-established:
  - "Tailwind v4: src/index.css は @import \"tailwindcss\" のみ"
  - "ルーター: BrowserRouter は main.tsx、Routes/Route は App.tsx"
  - "モックデータ: src/data/mockData.ts に型定義とモック定数を集約"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-04-22
---

# Phase 00 Plan 01: プロジェクト初期設定 Summary

**Vite 8 + React 19 + Tailwind v4 + vite-plugin-pwa の起動・ビルド可能な骨格、react-router ルーティング、MockProfile/MockEvent 型定義を確立**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-22T01:13:12Z
- **Completed:** 2026-04-22T01:28:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Vite 8 + React 19 + TypeScript プロジェクト骨格を構築し npm run build・npx tsc --noEmit がエラーゼロで通過
- Tailwind CSS v4 を @tailwindcss/vite プラグイン経由でセットアップ（v4 スタイルの @import "tailwindcss" のみ）
- react-router v7 の BrowserRouter + Routes で /p/:userId・/event/:eventId・/login ルート設定完了
- MockProfile・MockEvent 型定義とモックデータ定数を src/data/mockData.ts に集約
- vite-plugin-pwa で PWA manifest・workbox 設定、public/_headers で Cloudflare Pages 用 MIME ヘッダー設定

## Task Commits

Each task was committed atomically:

1. **Task 1: Vite + React + TypeScript プロジェクト生成と依存パッケージインストール** - `155f8c8` (feat)
2. **Task 2: App.tsx ルーター設定・mockData.ts 型定義・public/_headers 作成** - `486f940` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `vite.config.ts` - react + tailwindcss + VitePWA プラグイン設定
- `src/index.css` - Tailwind v4 の @import "tailwindcss" のみ
- `src/main.tsx` - BrowserRouter ラッパー追加
- `src/App.tsx` - Routes/Route で 4 ルート定義
- `src/data/mockData.ts` - MockProfile・SnsLink・MockEvent 型定義、MOCK_PROFILE・MOCK_EVENT・MOCK_PARTICIPANTS 定数
- `src/pages/ProfilePage.tsx` - スタブ（後続プランで実装）
- `src/pages/EventRoomPage.tsx` - スタブ
- `src/pages/LoginMockPage.tsx` - スタブ
- `public/_headers` - Cloudflare Pages 用キャッシュ・MIME 設定
- `public/icons/.gitkeep` - アイコンディレクトリ（実アイコンは 00-03 プランで追加）
- `.gitignore` - node_modules・dist 除外設定

## Decisions Made
- vite-plugin-pwa 1.2.0 は Vite 8 を peerDependencies に含めていないため --legacy-peer-deps でインストール。ビルドおよび PWA 生成は正常動作を確認。
- motion パッケージを使用（framer-motion は motion に統合済みのため不使用）
- react-router v7 から react-router-dom は廃止済み。react-router パッケージのみ使用。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm create vite のインタラクティブプロンプトを回避してテンプレート生成**
- **Found during:** Task 1 (プロジェクト生成)
- **Issue:** 既存ファイル（.git, .planning 等）があるため npm create vite が「Operation cancelled」で終了
- **Fix:** /tmp にテンプレート生成後、必要ファイルを nafuda/ ディレクトリへコピー
- **Files modified:** package.json, index.html, tsconfig.json, tsconfig.app.json, tsconfig.node.json, eslint.config.js, src/, public/
- **Verification:** npm run build 成功
- **Committed in:** 155f8c8 (Task 1 commit)

**2. [Rule 3 - Blocking] vite-plugin-pwa の peerDependency 競合を --legacy-peer-deps で解決**
- **Found during:** Task 1 (依存パッケージインストール)
- **Issue:** vite-plugin-pwa 1.2.0 の peerDependencies が vite ^3-7 で Vite 8 未対応
- **Fix:** --legacy-peer-deps フラグでインストール（機能的な互換性は確認済み）
- **Files modified:** package.json, package-lock.json
- **Verification:** npm run build で dist/sw.js と dist/workbox-*.js が生成されること確認
- **Committed in:** 155f8c8 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** 両方とも環境起因のブロッカーで自動解決。スコープへの影響なし。

## Issues Encountered
- Vite 8 が最新リリースのため vite-plugin-pwa の正式サポートが追いついていない。vite-plugin-pwa 側でのアップデートを待つ、または将来的に --save-exact でバージョン固定を検討。

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- npm run build・npx tsc --noEmit がエラーゼロ（後続プランがページ実装に集中できる土台確立）
- src/data/mockData.ts の MockProfile・MockEvent 型は後続プランでそのまま利用可能
- public/icons/ にアイコン画像の追加が必要（00-03 プランで対応予定）
- vite-plugin-pwa の Vite 8 正式サポートは将来のアップデートで解消される見込み

---
*Phase: 00-prototype*
*Completed: 2026-04-22*
