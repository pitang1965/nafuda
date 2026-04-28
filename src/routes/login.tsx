import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const handleGoogle = async () => {
    await authClient.signIn.social({ provider: 'google', callbackURL: '/me' })
  }
  const handleFacebook = async () => {
    await authClient.signIn.social({ provider: 'facebook', callbackURL: '/me' })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">なふだ</h1>
        <p className="mt-2 text-sm text-gray-500">QRを見せるだけで、つながれる</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={handleGoogle}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <span>G</span>
          Googleでログイン
        </button>
        <button
          onClick={handleFacebook}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <span>f</span>
          Facebookでログイン
        </button>
      </div>

      <Link
        to="/"
        className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
      >
        ← トップに戻る
      </Link>

      <OAuthErrorMessage />
    </div>
  )
}

function OAuthErrorMessage() {
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const error = search?.get('error')
  if (!error) return null
  return (
    <div className="w-full max-w-xs p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      ログインに失敗しました。もう一度お試しください。
      <button onClick={() => { window.location.href = '/login' }} className="ml-2 underline">
        再試行
      </button>
    </div>
  )
}
