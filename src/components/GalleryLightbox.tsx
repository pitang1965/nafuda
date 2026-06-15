import { useEffect, useRef, useState } from "react";

interface GalleryItem {
  imageUrl: string;
  caption: string | null;
}

interface GalleryLightboxProps {
  photos: GalleryItem[];
  // なふだスタイル適用時にサムネイル枠の色味を合わせる（未指定はデフォルト）
  accentColor?: string;
}

export function GalleryLightbox({ photos, accentColor }: GalleryLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // ライトボックス表示中は背景スクロールを止める（setState なし＝lint安全）
  useEffect(() => {
    if (openIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openIndex]);

  if (photos.length === 0) return null;

  const open = openIndex !== null ? photos[openIndex] : null;

  function show(delta: number) {
    setOpenIndex((cur) => {
      if (cur === null) return cur;
      const next = cur + delta;
      if (next < 0 || next >= photos.length) return cur;
      return next;
    });
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) < 40) return;
    show(dx < 0 ? 1 : -1);
  }

  return (
    <>
      <div className="w-full grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <button
            key={`${photo.imageUrl}-${index}`}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative aspect-square rounded-lg overflow-hidden bg-black/10 focus:outline-none"
            style={
              accentColor
                ? { boxShadow: `0 0 0 1px ${accentColor}30` }
                : undefined
            }
            aria-label={photo.caption ?? "写真を拡大表示"}
          >
            <img
              src={photo.imageUrl}
              alt={photo.caption ?? ""}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            {photo.caption && (
              <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] leading-tight text-white text-left bg-gradient-to-t from-black/65 to-transparent truncate">
                {photo.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setOpenIndex(null)}
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>

          {openIndex !== null && openIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                show(-1);
              }}
              className="absolute left-2 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center text-2xl leading-none"
              aria-label="前の写真"
            >
              ‹
            </button>
          )}
          {openIndex !== null && openIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                show(1);
              }}
              className="absolute right-2 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center text-2xl leading-none"
              aria-label="次の写真"
            >
              ›
            </button>
          )}

          <figure
            className="max-w-[92vw] max-h-[88vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={open.imageUrl}
              alt={open.caption ?? ""}
              className="max-w-[92vw] max-h-[78vh] object-contain rounded-lg"
            />
            {open.caption && (
              <figcaption className="text-sm text-white/90 text-center px-4 break-words">
                {open.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
