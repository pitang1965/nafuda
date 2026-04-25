---
status: diagnosed
phase: 01-auth-profile
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-04-25T00:00:00Z
updated: 2026-04-25T01:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login page UI
expected: Navigate to http://localhost:5173/login. You should see a Google login button, a Facebook login button, and a "ログインせずに見る →" link below them.
result: pass

### 2. Auth protection
expected: While NOT logged in, navigate to http://localhost:5173/home. You should be immediately redirected to /login.
result: pass

### 3. Public profile access without login
expected: While NOT logged in, navigate to http://localhost:5173/u/anyuser. The page should load without redirecting to /login. "ログインせずに見る →" link on login page leads to a viewable page.
result: issue
reported: "「ログインせずに見る →」が /u/demo に遷移するが「プロフィールが見つかりません」と表示される。demoペルソナが存在しないためリンク先が機能しない。"
severity: major

### 4. Google OAuth login
expected: On the login page, click the Google button. Google's OAuth consent screen appears. After authorizing, you land on http://localhost:5173/home (authenticated). No error, no redirect loop.
result: pass

### 5. First-run wizard — 5-step flow
expected: As a newly logged-in user (no persona yet), you are redirected to the wizard. It has 5 steps: Step 1: URL-ID入力, Step 2: 表示名, Step 3: 推し・趣味・ジャンル, Step 4: アバター, Step 5: 完了. You can navigate through all 5 steps and complete the wizard.
result: pass

### 6. URL-ID realtime availability check
expected: In wizard step 1, type a URL-ID. Within ~400ms of stopping typing, a check indicator appears showing whether the ID is available or already taken. Trying a taken ID should show an error before you can proceed.
result: pass

### 7. Oshi tag chip input + autocomplete
expected: In wizard step 3 (推し・趣味・ジャンル), a chip/tag input is present. You can type a tag and press Enter to add it as a chip. If other personas have added similar tags, autocomplete suggestions appear as you type. At least 1 tag is required before proceeding to step 4.
result: pass

### 8. Home page — PersonaSwitcher + profile
expected: After completing the wizard and arriving at /home, you see your persona's name in a PersonaSwitcher dropdown at the top. The dropdown can be opened to show your personas and a "新しいペルソナを作成" option.
result: issue
reported: "ログアウトボタンがない。「新しいペルソナを作成」をクリックしても何も起きず、メニューが閉じるだけ。"
severity: major

### 9. Profile edit page — fields + visibility toggles
expected: From /home, navigate to the profile edit page. You can see and edit fields (表示名, bio etc.). Each field has a visibility toggle icon — an eye (public) or lock (private). Toggling changes the icon. Clicking Save persists the changes.
result: issue
reported: "SNSリンクを鍵アイコンにして「保存する」→「編集する」で編集画面に戻るとSNSリンクが目アイコンに戻っている。ブラウザリロード後は正しく鍵アイコンになる。"
severity: major

### 10. Bio field
expected: On the profile edit page, there is a bio text area (max 200 characters). Save some bio text. Return to /home — bio text appears in your profile card. Navigate to /u/your-url-id — bio appears on the public profile too (assuming visibility is set to public).
result: pass

### 11. dojin_reject radio toggle
expected: On the profile edit page, there is a radio toggle about 同担. Switching between the two options ("同担の方にも表示される" / "同担の方の一覧に表示されたくない") saves instantly without pressing a Save button.
result: pass

### 12. SNS link manager — add and display
expected: On the profile edit page, you can add an SNS link (e.g. Twitter/X). Typing a bare username like "myhandle" (without https://) auto-prefixes the platform URL on save. The SNS link appears in your profile. You can also delete and reorder links.
result: pass

### 13. Public profile — filtered display + SNS handle
expected: Navigate to http://localhost:5173/u/your-url-id. Your public profile shows your name, bio (if set to public), oshi tags, and SNS links. SNS links show @handle format (e.g. "@myhandle"), not the full URL. Fields set to private (lock icon) do NOT appear.
result: pass

## Summary

total: 13
passed: 10
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "「ログインせずに見る →」リンクが機能するデモプロフィールページに遷移する"
  status: failed
  reason: "User reported: 「ログインせずに見る →」が /u/demo に遷移するが「プロフィールが見つかりません」と表示される。demoペルソナが存在しないためリンク先が機能しない。"
  severity: major
  test: 3
  root_cause: "login.tsx 42行目で /u/demo にハードコードされているが、demoペルソナがDBに存在しないためgetPublicProfileがnullを返す"
  artifacts:
    - path: "src/routes/login.tsx"
      issue: "href='/u/demo' にハードコード（42行目）"
  missing:
    - "リンク先を / に変更するか、demoペルソナのseedデータを作成する"
  debug_session: ""

- truth: "/home にログアウトボタンが存在する"
  status: failed
  reason: "User reported: ログアウトボタンがない。"
  severity: major
  test: 8
  root_cause: "home.tsx に signOut のインポートも呼び出しもなく、ログアウトUIが未実装。auth-client.ts の signOut は利用可能"
  artifacts:
    - path: "src/routes/_protected/home.tsx"
      issue: "signOut インポートなし、ログアウトボタンUI未実装"
  missing:
    - "signOut インポート追加 + Top bar にログアウトボタン追加"
  debug_session: ""

- truth: "プロフィール編集ページで保存後、再度編集画面を開いたときに保存済みの公開/非公開設定が正しく反映されている"
  status: failed
  reason: "User reported: SNSリンクを鍵アイコンにして「保存する」→「編集する」で編集画面に戻るとSNSリンクが目アイコンに戻っている。ブラウザリロード後は正しく鍵アイコンになる。"
  severity: major
  test: 9
  root_cause: "TanStack RouterがSPA遷移時に /profile/edit のloaderキャッシュを再利用しgetOwnProfile()を再実行しないため、古いfieldVisibilityがフォームdefaultValuesに渡される"
  artifacts:
    - path: "src/routes/_protected/profile/edit.tsx"
      issue: "loaderに staleTime: 0 がなく、SPA遷移時にキャッシュが再利用される"
  missing:
    - "edit.tsx のルート定義に staleTime: 0 を追加する"
  debug_session: ".planning/debug/sns-visibility-stale-on-edit.md"

- truth: "PersonaSwitcherの「新しいペルソナを作成」をクリックするとウィザードへ遷移する"
  status: failed
  reason: "User reported: 「新しいペルソナを作成」をクリックしても何も起きない。メニューが閉じるだけ。"
  severity: major
  test: 8
  root_cause: "home.tsx 33行目の onCreateNew ハンドラがコメントのみの空実装で、/profile/wizard へのナビゲーションが実装されていない"
  artifacts:
    - path: "src/routes/_protected/home.tsx"
      issue: "onCreateNew={() => {/* navigate to wizard for new persona */}} — 空実装（33行目）"
  missing:
    - "useNavigate を追加し onCreateNew={() => navigate({ to: '/profile/wizard' })} を実装"
  debug_session: ""
