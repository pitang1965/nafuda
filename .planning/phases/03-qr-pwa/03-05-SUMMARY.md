---
plan: 03-05
phase: 03-qr-pwa
status: complete
completed_at: 2026-04-27
---

# Summary: PWA Service Worker + インストールバナー

## What was built

- `src/sw.ts` — Workbox injectManifest 用 Service Worker ソース（NetworkFirst for /me, CacheFirst for assets）
- `vite.config.ts` — nafudaPwaPlugin（workbox-build injectManifest、vite-plugin-pwa 不使用）
- `src/hooks/usePwaInstall.ts` — Chrome beforeinstallprompt + iOS Safari 検出フック
- `src/components/PwaInstallBanner.tsx` — Chrome/Android インストールボタン + iOS 手動案内バナー
- `src/routes/__root.tsx` — SW 登録 useEffect 追加（load イベント後に /sw.js 登録）
- `src/routes/_protected/me.tsx` — PwaInstallBanner 組み込み（QRBottomSheet 直前）
- `tsconfig.app.json` — sw.ts を exclude（Service Worker は別コンテキスト）
- edit.tsx / wizard.tsx — /home → /me 参照修正（home.tsx 削除の後処理）

## Key files

### created
- `src/sw.ts`
- `src/hooks/usePwaInstall.ts`
- `src/components/PwaInstallBanner.tsx`

### modified
- `vite.config.ts` — nafudaPwaPlugin 追加
- `src/routes/__root.tsx` — SW 登録
- `src/routes/_protected/me.tsx` — PwaInstallBanner 組み込み
- `tsconfig.app.json` — sw.ts exclude
- `src/routes/_protected/profile/edit.tsx` — /home → /me
- `src/routes/_protected/profile/wizard.tsx` — /home → /me

## Commits

| Hash | Message |
|------|---------|
| ff0b11c | feat(03-05): add Service Worker source and custom Workbox Vite plugin |
| 44c2069 | feat(03-05): add PWA install hook, banner, SW registration, and me.tsx integration |
| 69e4ded | fix: update /home → /me references in profile routes; exclude sw.ts from tsconfig |

## Self-Check: PASSED

- vite-plugin-pwa 不使用（Pitfall 1 回避）✓
- workbox-build injectManifest 使用 ✓
- usePwaInstall: Chrome + iOS 両対応 ✓
- PwaInstallBanner: me.tsx の QRBottomSheet 付近に配置 ✓
- SW 登録: __root.tsx の useEffect で load イベント後 ✓
- TypeScript エラーなし ✓
