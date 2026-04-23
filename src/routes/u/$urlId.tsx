import { createFileRoute } from '@tanstack/react-router'

// No beforeLoad auth check — public route per AUTH-03 and AUTH-04
export const Route = createFileRoute('/u/$urlId')({
  component: PublicProfilePage,
})

function PublicProfilePage() {
  const { urlId } = Route.useParams()
  return (
    <div className="min-h-screen p-6">
      <p className="text-sm text-gray-400">@{urlId} のプロフィール（準備中）</p>
    </div>
  )
}
