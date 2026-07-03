// アップロード画像の検証。クライアントは canvas.toDataURL("image/jpeg") で常に JPEG を
// 送る（AvatarUpload.tsx / GalleryUpload.tsx）ため、サーバーは JPEG のみ受け付ける。
// data URL の申告 content type は信用せず、デコード後のマジックバイトで判定する。
// SVG 等のスクリプトを含み得る形式が R2 公開 URL 経由で配信されるのを防ぐ（保存型 XSS 対策）。

const JPEG_MAGIC = [0xff, 0xd8, 0xff];

// data URL を検証して JPEG バイト列を返す。JPEG でない・base64 が壊れている場合は throw。
export function decodeJpegDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("画像データが不正です");

  let bytes: Uint8Array;
  try {
    const bin = atob(dataUrl.slice(comma + 1));
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    throw new Error("画像データが不正です");
  }

  if (
    bytes.length < JPEG_MAGIC.length ||
    JPEG_MAGIC.some((b, i) => bytes[i] !== b)
  ) {
    throw new Error("JPEG画像のみアップロードできます");
  }

  return bytes;
}
