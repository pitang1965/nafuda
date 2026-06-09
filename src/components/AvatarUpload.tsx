import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { InitialsAvatar } from "./InitialsAvatar";
import { uploadAvatar, deleteAvatar } from "../server/functions/avatar";

interface AvatarUploadProps {
  personaId: string;
  displayName: string;
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

export function AvatarUpload({
  personaId,
  displayName,
  currentAvatarUrl,
  onAvatarChange,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [srcImg, setSrcImg] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [uploading, setUploading] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrcImg(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(
      centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
        width,
        height,
      ),
    );
  }

  async function handleSave() {
    if (!imgRef.current || !crop) return;
    const dataUrl = getCroppedDataUrl(imgRef.current, crop);
    setSrcImg(null);
    setUploading(true);
    try {
      const result = await uploadAvatar({ data: { personaId, dataUrl } });
      onAvatarChange(result.avatarUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    setUploading(true);
    try {
      await deleteAvatar({ data: { personaId } });
      onAvatarChange(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors focus:outline-none"
          aria-label="アバター画像を変更"
        >
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <InitialsAvatar name={displayName || "?"} size={64} />
          )}
          {uploading ? (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}
        </button>

        {currentAvatarUrl && !uploading && (
          <button
            type="button"
            onClick={handleDelete}
            className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-red-500 transition-colors focus:outline-none"
            aria-label="アバターを削除"
          >
            ×
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {srcImg && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4">
            <p className="text-sm font-medium text-center">
              切り取り位置を調整
            </p>
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                aspect={1}
                circularCrop
                minWidth={50}
              >
                <img
                  ref={imgRef}
                  src={srcImg}
                  onLoad={onImageLoad}
                  className="max-h-64 max-w-full object-contain"
                  alt=""
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSrcImg(null)}
                className="flex-1 py-2.5 text-sm border rounded-xl hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getCroppedDataUrl(img: HTMLImageElement, crop: Crop): string {
  const canvas = document.createElement("canvas");
  const SIZE = 400;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const px =
    crop.unit === "%"
      ? {
          x: (crop.x / 100) * img.width,
          y: (crop.y / 100) * img.height,
          w: (crop.width / 100) * img.width,
          h: (crop.height / 100) * img.height,
        }
      : { x: crop.x, y: crop.y, w: crop.width, h: crop.height };

  ctx.drawImage(
    img,
    px.x * scaleX,
    px.y * scaleY,
    px.w * scaleX,
    px.h * scaleY,
    0,
    0,
    SIZE,
    SIZE,
  );

  return canvas.toDataURL("image/webp", 0.85);
}
