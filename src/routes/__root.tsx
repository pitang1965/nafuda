import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import '../index.css'

function RootDocument({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then((reg) => console.log('[SW] Registered:', reg.scope))
          .catch((err) => console.warn('[SW] Registration failed:', err))
      })
    }
  }, [])

  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-semibold text-gray-700">404</p>
        <p className="mt-2 text-sm text-gray-500">ページが見つかりません</p>
        <a href="/" className="mt-4 inline-block text-sm text-blue-500 underline">トップへ戻る</a>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
  notFoundComponent: NotFound,
})
