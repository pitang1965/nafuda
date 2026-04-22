import type { SnsLink } from '../../data/mockData'

const PLATFORM_LABELS: Record<SnsLink['platform'], string> = {
  x: 'X',
  instagram: 'Instagram',
  discord: 'Discord',
  line_openchat: 'LINE オープンチャット',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

const PLATFORM_COLORS: Record<SnsLink['platform'], string> = {
  x: 'bg-black text-white',
  instagram: 'bg-pink-500 text-white',
  discord: 'bg-indigo-500 text-white',
  line_openchat: 'bg-green-500 text-white',
  tiktok: 'bg-gray-900 text-white',
  youtube: 'bg-red-600 text-white',
}

interface SnsLinkListProps {
  links: SnsLink[]
}

export function SnsLinkList({ links }: SnsLinkListProps) {
  if (links.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium w-full ${PLATFORM_COLORS[link.platform]}`}
        >
          <span className="font-semibold">{PLATFORM_LABELS[link.platform]}</span>
          <span className="opacity-80">{link.handle}</span>
        </a>
      ))}
    </div>
  )
}
