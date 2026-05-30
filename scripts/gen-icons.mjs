import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import path from 'path'

const pink = '#ec4899'

// ネコ耳なふだホルダー形シルエット (100x100 viewBox)
function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <!-- 左ネコ耳 -->
  <path d="M 14 35 C 17 15 27 3 32 2 C 37 3 47 15 50 35 Z" fill="${pink}"/>
  <!-- 右ネコ耳 -->
  <path d="M 50 35 C 53 15 63 3 68 2 C 73 3 83 15 86 35 Z" fill="${pink}"/>
  <!-- 胴体 -->
  <rect x="7" y="31" width="86" height="64" rx="18" fill="${pink}"/>
  <!-- 名刺スロット（白い枠） -->
  <rect x="22" y="46" width="56" height="38" rx="5" fill="white" opacity="0.92"/>
</svg>`
}

await mkdir('public/icons', { recursive: true })

// 512x512
await sharp(Buffer.from(makeSvg(512)))
  .png()
  .toFile('public/icons/icon-512.png')

// 192x192
await sharp(Buffer.from(makeSvg(192)))
  .png()
  .toFile('public/icons/icon-192.png')

// 32x32 favicon.ico (PNG形式)
await sharp(Buffer.from(makeSvg(32)))
  .png()
  .toFile('public/favicon.ico')

console.log('Icons generated.')
