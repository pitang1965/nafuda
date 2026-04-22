export interface SnsLink {
  platform: 'x' | 'instagram' | 'discord' | 'line_openchat' | 'tiktok' | 'youtube'
  url: string
  handle: string
}

export interface MockProfile {
  id: string
  handle: string
  avatarUrl: string
  oshiTags: string[]
  snsLinks: SnsLink[]
  profileUrl: string
}

export interface MockEvent {
  id: string
  name: string
  venue: string
  date: string
  participants: MockProfile[]
}

export const MOCK_PROFILE: MockProfile = {
  id: 'mock-user-001',
  handle: 'すみれ🌸',
  avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=mock001',
  oshiTags: ['#田中推し', '#星降る夜のライブ', '#Aグループ'],
  snsLinks: [
    { platform: 'x', url: 'https://x.com/sumire_example', handle: '@sumire_example' },
    { platform: 'instagram', url: 'https://instagram.com/sumire_example', handle: 'sumire_example' },
  ],
  profileUrl: 'https://nafuda.pages.dev/p/mock-user-001',
}

export const MOCK_PARTICIPANTS: MockProfile[] = [
  MOCK_PROFILE,
  {
    id: 'mock-user-002',
    handle: 'あおい⭐',
    avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=mock002',
    oshiTags: ['#田中推し', '#推し活'],
    snsLinks: [
      { platform: 'instagram', url: 'https://instagram.com/aoi_example', handle: 'aoi_example' },
    ],
    profileUrl: 'https://nafuda.pages.dev/p/mock-user-002',
  },
  {
    id: 'mock-user-003',
    handle: 'こはる🎵',
    avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=mock003',
    oshiTags: ['#鈴木推し', '#現場勢'],
    snsLinks: [
      { platform: 'x', url: 'https://x.com/koharu_example', handle: '@koharu_example' },
    ],
    profileUrl: 'https://nafuda.pages.dev/p/mock-user-003',
  },
]

export const MOCK_EVENT: MockEvent = {
  id: 'event-001',
  name: '星降る夜のライブ2026',
  venue: '東京ドーム',
  date: '2026-04-22',
  participants: MOCK_PARTICIPANTS,
}
