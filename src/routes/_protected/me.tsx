import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getOwnProfile } from '../../server/functions/profile'
import { authClient } from '../../lib/auth-client'
import { PersonaSwitcher } from '../../components/PersonaSwitcher'
import { InitialsAvatar } from '../../components/InitialsAvatar'
import { SnsLinkButton } from '../../components/SnsLinkButton'
import { QRBottomSheet } from '../../components/QRBottomSheet'
import { PwaInstallBanner } from '../../components/PwaInstallBanner'

export const Route = createFileRoute('/_protected/me')({
  loader: () => getOwnProfile(),
  component: MePage,
})

function PrivateBadge() {
  return <span className="text-xs text-gray-400 ml-1">🔒</span>
}

function MePage() {
  const { urlId, personas } = Route.useLoaderData()
  const navigate = useNavigate()
  const [currentPersonaId, setCurrentPersonaId] = useState(
    personas.find(p => p.isDefault)?.id ?? personas[0]?.id ?? ''
  )
  const currentPersona = personas.find(p => p.id === currentPersonaId)
  const [qrOpen, setQrOpen] = useState(false)

  const handleLogout = async () => {
    await authClient.signOut()
    await navigate({ to: '/login' })
  }

  // No persona yet → redirect to wizard
  if (!personas.length || !urlId) {
    return <RedirectToWizard />
  }

  const vis = (currentPersona?.fieldVisibility ?? {}) as Record<string, string>
  const isPrivate = (field: string) => vis[field] === 'private'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar with persona switcher */}
      <div className="flex items-center justify-between p-4 border-b">
        <PersonaSwitcher
          personas={personas}
          currentPersonaId={currentPersonaId}
          onSwitch={setCurrentPersonaId}
          onCreateNew={() => navigate({ to: '/profile/wizard' })}
        />
        <div className="flex items-center gap-3">
          <Link to="/profile/edit" className="text-sm text-gray-500 underline">編集</Link>
          <Link to="/events" className="text-sm text-gray-500 underline">イベント</Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* Profile display */}
      <div className="flex-1 p-6 flex flex-col items-center gap-4">
        <div className={`relative ${isPrivate('avatar_url') ? 'opacity-50' : ''}`}>
          {currentPersona?.avatarUrl ? (
            <img src={currentPersona.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <InitialsAvatar name={currentPersona?.displayName ?? '?'} size={80} />
          )}
          {isPrivate('avatar_url') && (
            <span className="absolute -bottom-1 -right-1 bg-white rounded-full text-sm leading-none px-0.5">🔒</span>
          )}
        </div>

        <div className={`flex items-center gap-1 ${isPrivate('display_name') ? 'opacity-50' : ''}`}>
          <h1 className="text-xl font-bold">{currentPersona?.displayName}</h1>
          {isPrivate('display_name') && <PrivateBadge />}
        </div>

        {urlId && <p className="text-xs text-gray-400">/u/{urlId}</p>}

        {currentPersona?.bio && (
          <div className={`w-full max-w-xs text-center ${isPrivate('bio') ? 'opacity-50' : ''}`}>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentPersona.bio}</p>
            {isPrivate('bio') && <p className="text-xs text-gray-400 mt-1">🔒 非公開</p>}
          </div>
        )}

        {currentPersona?.oshiTags && currentPersona.oshiTags.length > 0 && (
          <div className={`w-full max-w-xs ${isPrivate('oshi_tags') ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap gap-1 justify-center">
              {currentPersona.oshiTags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs">{tag}</span>
              ))}
            </div>
            {isPrivate('oshi_tags') && <p className="text-xs text-gray-400 text-center mt-1">🔒 非公開</p>}
          </div>
        )}

        {currentPersona?.snsLinks && currentPersona.snsLinks.length > 0 && (
          <div className={`flex flex-col gap-2 w-full max-w-xs ${isPrivate('sns_links') ? 'opacity-50' : ''}`}>
            {currentPersona.snsLinks.map(link => (
              <SnsLinkButton key={link.id} platform={link.platform} url={link.url} />
            ))}
            {isPrivate('sns_links') && <p className="text-xs text-gray-400 text-center">🔒 非公開</p>}
          </div>
        )}

        <div className="w-full max-w-xs pt-2 flex flex-col gap-2">
          <button
            onClick={() => setQrOpen(true)}
            className="block w-full text-center px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            QRコードを表示
          </button>
          <Link
            to="/connections"
            className="block w-full text-center px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            つながりを見る
          </Link>
        </div>
      </div>

      <PwaInstallBanner />

      {currentPersona && urlId && (
        <QRBottomSheet
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          urlId={urlId}
          shareToken={currentPersona.shareToken}
          displayName={currentPersona.displayName}
        />
      )}
    </div>
  )
}

function RedirectToWizard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-gray-500">プロフィールを設定しましょう</p>
      <Link to="/profile/wizard" className="px-6 py-3 bg-black text-white rounded-lg text-sm">
        プロフィールを作成する
      </Link>
    </div>
  )
}
