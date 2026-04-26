import { usePwaInstall } from '../hooks/usePwaInstall'

export function PwaInstallBanner() {
  const { canInstall, isIos, isInstalled, promptInstall } = usePwaInstall()

  if (isInstalled) return null

  if (isIos) {
    return (
      <div className="mx-4 mb-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 text-center">
        Safari のシェアボタン（↑）→「ホーム画面に追加」でオフライン表示できます
      </div>
    )
  }

  if (canInstall) {
    return (
      <div className="mx-4 mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-600">ホーム画面に追加するとオフラインでも QR を表示できます</p>
        <button
          onClick={promptInstall}
          className="ml-3 flex-shrink-0 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium"
        >
          追加する
        </button>
      </div>
    )
  }

  return null
}
