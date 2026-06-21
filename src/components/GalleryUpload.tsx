import { useRef, useState } from "react";
import {
  uploadGalleryPhoto,
  deleteGalleryPhoto,
  updateGalleryCaption,
  reorderGalleryPhotos,
  MAX_GALLERY_PHOTOS,
} from "../server/functions/gallery";

interface GalleryPhoto {
  id: string;
  imageUrl: string;
  caption: string | null;
  displayOrder: number;
}

interface GalleryUploadProps {
  personaId: string;
  initialPhotos: GalleryPhoto[];
  // 親へ現在の写真一覧を通知する（編集プレビューでライブ反映するため）。
  onChange?: (photos: GalleryPhoto[]) => void;
}

const CAPTION_MAX = 30;

export function GalleryUpload({
  personaId,
  initialPhotos,
  onChange,
}: GalleryUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>(() =>
    [...initialPhotos].sort((a, b) => a.displayOrder - b.displayOrder),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 写真一覧を更新しつつ親へ通知する。busy ゲートで同時操作が無いため
  // 現在の photos クロージャから次の配列を組んで渡す（関数型更新は使わない）。
  const apply = (next: GalleryPhoto[]) => {
    setPhotos(next);
    onChange?.(next);
  };

  const full = photos.length >= MAX_GALLERY_PHOTOS;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToResizedJpeg(file);
      const row = await uploadGalleryPhoto({ data: { personaId, dataUrl } });
      apply([...photos, row]);
    } catch (err) {
      console.error("gallery upload failed", err);
      setError("写真の保存に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(photoId: string) {
    setError(null);
    setBusy(true);
    try {
      await deleteGalleryPhoto({ data: { photoId } });
      apply(photos.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("gallery delete failed", err);
      setError("写真の削除に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  function handleCaptionChange(photoId: string, caption: string) {
    apply(photos.map((p) => (p.id === photoId ? { ...p, caption } : p)));
  }

  async function persistCaption(photoId: string, caption: string | null) {
    try {
      await updateGalleryCaption({
        data: { photoId, caption: caption ?? "" },
      });
    } catch (err) {
      console.error("gallery caption update failed", err);
      setError("キャプションの保存に失敗しました。");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= photos.length) return;
    const reordered = [...photos];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    apply(reordered);
    try {
      await reorderGalleryPhotos({
        data: { personaId, orderedIds: reordered.map((p) => p.id) },
      });
    } catch (err) {
      console.error("gallery reorder failed", err);
      setError("並び替えの保存に失敗しました。");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className="flex flex-col gap-1">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={photo.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={busy}
                className="absolute top-1 right-1 w-5 h-5 bg-black/55 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-red-500 transition-colors disabled:opacity-50"
                aria-label="写真を削除"
              >
                ×
              </button>
              <div className="absolute bottom-1 left-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={busy || index === 0}
                  className="w-5 h-5 bg-black/55 text-white rounded flex items-center justify-center text-xs leading-none disabled:opacity-30"
                  aria-label="左へ移動"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={busy || index === photos.length - 1}
                  className="w-5 h-5 bg-black/55 text-white rounded flex items-center justify-center text-xs leading-none disabled:opacity-30"
                  aria-label="右へ移動"
                >
                  ›
                </button>
              </div>
            </div>
            <input
              type="text"
              value={photo.caption ?? ""}
              maxLength={CAPTION_MAX}
              placeholder="キャプション"
              onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
              onBlur={(e) =>
                persistCaption(photo.id, e.target.value.trim() || null)
              }
              className="w-full px-1.5 py-1 border rounded text-xs outline-none"
            />
          </div>
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-400 transition-colors disabled:opacity-50"
            aria-label="写真を追加"
          >
            {busy ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-2xl leading-none">＋</span>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        最大{MAX_GALLERY_PHOTOS}
        枚。推し・作品・愛車など見せたいものを。タップで全体表示されます。
      </p>

      {error && <p className="text-xs text-red-700 break-all">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

// 元の比率を保ったまま長辺を1080pxに縮小し JPEG 化する。
// Safari(iOS) は canvas からの WebP エンコードに非対応なので JPEG を使う（AvatarUpload と同方針）。
// img 要素経由で描画することでブラウザが EXIF の向きを反映する。
function fileToResizedJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image load failed"));
      img.onload = () => {
        const MAX = 1080;
        const scale = Math.min(
          1,
          MAX / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unsupported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
