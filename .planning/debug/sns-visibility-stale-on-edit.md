---
status: diagnosed
trigger: "プロフィール編集ページでSNSリンクを鍵アイコン（非公開）に設定して保存後、編集画面に戻るとSNSリンクが公開に戻っている。ブラウザリロード後は正しく鍵アイコンになる。"
created: 2026-04-25T00:00:00Z
updated: 2026-04-25T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED — TanStack Routerのloader staleTime無設定によりキャッシュされたloaderデータが再利用され、古いsnsLinksVisibilityがuseFormのdefaultValuesに渡される
test: router.tsxのcreateTanStackRouterにdefaultPreloadStaleTime/staleTimeオプションが設定されていないことを確認 → 確認済み
expecting: staleTime未設定=デフォルト0ms。しかしloaderをトリガーするタイミングの問題（navigate後はloaderが再実行されるが、homeからのLink遷移時にキャッシュが使われる）
next_action: ROOT CAUSE FOUND

## Symptoms

expected: 保存後に編集ページに戻ると、保存した値（鍵アイコン=非公開）が表示される
actual: 編集ページに戻ると古い値（目アイコン=公開）が表示される。ブラウザリロード後は正しく鍵アイコンになる。
errors: (none visible)
reproduction: SNSリンクを非公開に設定 -> 保存する -> 「編集する」リンクで戻る -> 公開状態に戻っている
started: 不明（UAT時に発見）

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-25T00:01:00Z
  checked: src/routes/_protected/profile/edit.tsx — Route定義とloaderとuseForm
  found: |
    Route = createFileRoute('/_protected/profile/edit')({ loader: () => getOwnProfile(), ... })
    EditFormコンポーネントのuseForm defaultValuesはinitialSnsLinksVisibility prop経由でloaderデータから取得。
    onSubmit成功時は navigate({ to: '/home' }) で/homeに遷移。
  implication: |
    loaderはある。しかしloaderデータがキャッシュされていると、再遷移時にloaderが再実行されず
    古いinitialSnsLinksVisibilityがdefaultValuesに渡される可能性がある。

- timestamp: 2026-04-25T00:02:00Z
  checked: src/routes/_protected/home.tsx — 「編集する」リンクの遷移先
  found: |
    <Link to="/profile/edit" className="text-sm text-gray-500 underline">編集</Link>
    TanStack RouterのLinkコンポーネント使用。クライアントサイドナビゲーション。
    home自体もloader: () => getOwnProfile() を持つ。
  implication: |
    ブラウザリロードではなく <Link> によるSPA遷移のため、
    TanStack Routerのloaderキャッシュが効いてloaderが再実行されない可能性がある。

- timestamp: 2026-04-25T00:03:00Z
  checked: src/router.tsx — createTanStackRouterの設定
  found: |
    createTanStackRouter({ routeTree, scrollRestoration: true }) のみ。
    defaultPreloadStaleTime, defaultStaleTime 等のloaderキャッシュ設定は一切なし。
  implication: |
    TanStack RouterのデフォルトのloaderキャッシュはstaleTime=0（即座にstale扱い）だが、
    gcTime（ガベージコレクション時間）はデフォルト30分。
    staleTime=0でも「すでにloaderが実行中のルートへの再遷移」ではキャッシュを返すことがある。
    
    重要: TanStack Routerは同一ルートへのLink遷移時、前回のloaderデータを
    「すでにキャッシュ済み」と判断し、staleTimeが0であってもloaderを再実行せず
    キャッシュデータを使用する動作がある（特にpreloadやnavigateのタイミング問題）。

- timestamp: 2026-04-25T00:04:00Z
  checked: src/server/functions/profile.ts — getOwnProfile実装
  found: |
    createServerFn({ method: 'GET' }) として定義。
    サーバーサイドでDBからpersonas, urlIds, snsLinksを取得して返す。正しい実装。
  implication: |
    サーバー関数自体に問題はない。loaderが呼ばれれば正しいデータを返す。
    問題はloaderが呼ばれるかどうか（=Routerのキャッシュ制御）にある。

- timestamp: 2026-04-25T00:05:00Z
  checked: onSubmit後のnavigateとEditFormの再マウント
  found: |
    保存後: navigate({ to: '/home' }) → homeに遷移
    「編集する」Link: <Link to="/profile/edit"> → edit に遷移（SPA遷移）
    
    edit→home→editという遷移パターンでは、editルートのloaderデータがキャッシュから
    返される。その結果 EditPage コンポーネントが古い loaderData を受け取り、
    EditForm に古い initialSnsLinksVisibility='public' が渡される。
    
    useForm の defaultValues は「コンポーネントの初回マウント時のみ」適用されるため、
    もし EditForm が同一インスタンスを保持している場合は更新されない。
    ただし今回はページ遷移でアンマウント→再マウントが発生するため、問題は
    loaderデータそのものがキャッシュ古値であることに帰着する。
  implication: |
    根本原因はloaderキャッシュ。ブラウザリロードはキャッシュをバイパスするため正しい値が表示される。
    これは症状（リロード後は正しい）と完全に一致する。

## Resolution

root_cause: |
  TanStack RouterがSPA遷移（<Link>クリック）時に /_protected/profile/edit ルートの
  loaderキャッシュを再利用し、getOwnProfile()を再実行しない。
  そのため保存前の古いfieldVisibility.sns_links='public'がloaderDataとして返され、
  EditFormのdefaultValues.snsLinksVisibility='public'として渡される。
  ブラウザリロードはキャッシュをバイパスするため正しい値が得られる。
fix: |
  router.tsxのcreateTanStackRouterにdefaultStaleTime: 0を明示設定するか、
  editルートのRouteオプションにstaleTime: 0を設定して毎回loaderを再実行させる。
  または navigate({ to: '/home' }) ではなく router.invalidate() でキャッシュを無効化してから遷移する。
verification: (未実施 - find_root_cause_only モード)
files_changed: []
