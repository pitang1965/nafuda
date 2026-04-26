import { Sheet } from 'react-modal-sheet'
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect } from 'react'

interface QRBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  urlId: string
  shareToken: string
  displayName: string
}

export function QRBottomSheet({ isOpen, onClose, urlId, shareToken, displayName }: QRBottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setMounted(true)
    setOrigin(window.location.origin)
  }, [])

  const qrUrl = origin ? `${origin}/u/${urlId}/p/${shareToken}` : ''

  return (
    <Sheet isOpen={isOpen} onClose={onClose} detent="content">
      <Sheet.Container>
        <Sheet.Header />
        <Sheet.Content>
          <div className="flex flex-col items-center gap-4 p-6 pb-10">
            <p className="text-sm text-gray-500">{displayName} のQRコード</p>
            {!mounted || !qrUrl ? (
              <div className="w-[220px] h-[220px] bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <QRCodeSVG value={qrUrl} size={220} level="M" marginSize={4} bgColor="#FFFFFF" fgColor="#000000" />
            )}
            <p className="text-xs text-gray-400 break-all text-center max-w-[240px]">{qrUrl}</p>
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  )
}
