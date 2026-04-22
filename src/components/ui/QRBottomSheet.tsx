import { Sheet } from 'react-modal-sheet'
import { QRCodeSVG } from 'qrcode.react'

interface QRBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title?: string
}

export function QRBottomSheet({ isOpen, onClose, url, title }: QRBottomSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.5]}
      initialSnap={0}
    >
      <Sheet.Container>
        <Sheet.Header />
        <Sheet.Content>
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-2">
            {title && (
              <p className="text-sm text-gray-500">{title}</p>
            )}
            <div className="bg-white p-4 rounded-2xl shadow-inner">
              <QRCodeSVG
                value={url}
                size={220}
                marginSize={4}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            <p className="text-xs text-gray-400 text-center break-all max-w-xs">
              {url}
            </p>
            <button
              onClick={onClose}
              className="mt-2 text-sm text-gray-400 underline"
            >
              閉じる
            </button>
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  )
}
