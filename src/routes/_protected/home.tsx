import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getOwnProfile } from '../../server/functions/profile'
import { PersonaSwitcher } from '../../components/PersonaSwitcher'
import { InitialsAvatar } from '../../components/InitialsAvatar'

export const Route = createFileRoute('/_protected/home')({
  loader: () => getOwnProfile(),
  component: HomePage,
})

function HomePage() {
  const { urlId, personas } = Route.useLoaderData()
  const [currentPersonaId, setCurrentPersonaId] = useState(
    personas.find(p => p.isDefault)?.id ?? personas[0]?.id ?? ''
  )
  const currentPersona = personas.find(p => p.id === currentPersonaId)

  // No persona yet → redirect to wizard
  if (!personas.length || !urlId) {
    return <RedirectToWizard />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar with persona switcher */}
      <div className="flex items-center justify-between p-4 border-b">
        <PersonaSwitcher
          personas={personas}
          currentPersonaId={currentPersonaId}
          onSwitch={setCurrentPersonaId}
          onCreateNew={() => {/* navigate to wizard for new persona */}}
        />
        <Link to="/profile/edit" className="text-sm text-gray-500 underline">編集</Link>
      </div>

      {/* Profile display */}
      <div className="flex-1 p-6 flex flex-col items-center gap-4">
        {currentPersona?.avatarUrl ? (
          <img src={currentPersona.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <InitialsAvatar name={currentPersona?.displayName ?? '?'} size={80} />
        )}
        <h1 className="text-xl font-bold">{currentPersona?.displayName}</h1>
        {urlId && <p className="text-xs text-gray-400">/u/{urlId}</p>}
        {currentPersona?.oshiTags && currentPersona.oshiTags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {currentPersona.oshiTags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs">{tag}</span>
            ))}
          </div>
        )}
      </div>
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
