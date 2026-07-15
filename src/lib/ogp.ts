import { stripBioMarkers } from './bio'

const DESCRIPTION_SUFFIX =
  'さんのなふだ（デジタル名刺）です。なふだは推し活・趣味・イベントなど様々なシーンで使えるQRコード型のデジタル名刺サービスです。QRコードをスキャンするだけで簡単につながれます。ぜひプロフィールをご覧ください。'

export function buildOgpDescription(displayName: string, bioRaw: string | null): string {
  // OGP description はプレーンテキストなので、箇条書きマーカー（- ・）を剥がしてから使う
  const bio = bioRaw ? stripBioMarkers(bioRaw) : bioRaw
  if (bio && bio.length >= 100) return bio
  const prefix = bio ? `${bio}。` : ''
  return `${prefix}${displayName}${DESCRIPTION_SUFFIX}`
}
