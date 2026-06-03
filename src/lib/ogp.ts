const DESCRIPTION_SUFFIX =
  'さんのなふだ（デジタル名刺）です。なふだは推し活・趣味・仕事など様々なシーンで使えるQRコード型のデジタル名刺サービスです。QRコードをスキャンするだけで簡単につながれます。ぜひプロフィールをご覧ください。'

export function buildOgpDescription(displayName: string, bio: string | null): string {
  if (bio && bio.length >= 100) return bio
  const prefix = bio ? `${bio}。` : ''
  return `${prefix}${displayName}${DESCRIPTION_SUFFIX}`
}
