import { stripBioMarkers } from './bio'
import type { Locale } from './i18n/types'

const DESCRIPTION_SUFFIX_JA =
  'さんのなふだ（デジタル名刺）です。なふだは推し活・趣味・イベントなど様々なシーンで使えるQRコード型のデジタル名刺サービスです。QRコードをスキャンするだけで簡単につながれます。ぜひプロフィールをご覧ください。'

export function buildOgpDescription(
  displayName: string,
  bioRaw: string | null,
  locale: Locale = 'ja',
): string {
  // OGP description はプレーンテキストなので、箇条書きマーカー（- ・）を剥がしてから使う
  const bio = bioRaw ? stripBioMarkers(bioRaw) : bioRaw
  if (bio && bio.length >= 100) return bio

  if (locale === 'en') {
    const prefix = bio ? `${bio}. ` : ''
    return `${prefix}This is ${displayName}'s Nafuda (digital business card). Nafuda is a QR-code digital business card for oshi activities, hobbies, events and more — just scan to connect. Check out the profile!`
  }

  const prefix = bio ? `${bio}。` : ''
  return `${prefix}${displayName}${DESCRIPTION_SUFFIX_JA}`
}
