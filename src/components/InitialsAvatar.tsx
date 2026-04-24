// Deterministic colors — same name always gets same color (prevents hydration mismatch)
const PALETTE = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF9F43', '#48CAE4', '#F72585',
]

export function getColorForName(name: string): string {
  let hash = 0
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface InitialsAvatarProps {
  name: string
  size?: number
  className?: string
}

export function InitialsAvatar({ name, size = 40, className }: InitialsAvatarProps) {
  // Spread to handle emoji and multi-byte characters (e.g., Japanese names)
  const initial = [...name][0]?.toUpperCase() ?? '?'
  const bg = getColorForName(name)
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}
      className={`flex items-center justify-center rounded-full text-white font-bold select-none ${className ?? ''}`}
    >
      {initial}
    </div>
  )
}
