import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/home')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-xl font-semibold">ホーム</h1>
      <p className="text-sm text-gray-500 mt-1">プロフィール設定はもうすぐ</p>
    </div>
  )
}
