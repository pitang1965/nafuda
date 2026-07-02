import { useEffect, useRef, useState } from "react";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);

  // 画面に入るまで動画をロード・再生しない（初期ロードから594KBを除外＝Lighthouse対策）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void video.play();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
    setEnded(false);
  };

  return (
    <div className="relative w-full max-w-xs aspect-video">
      <video
        ref={videoRef}
        src="/nafuda-hero.mp4"
        poster="/nafuda-hero-poster.jpg"
        muted
        playsInline
        preload="none"
        onEnded={() => setEnded(true)}
        className="h-full w-full rounded-2xl object-cover shadow-lg"
      />
      {ended && (
        <button
          type="button"
          onClick={replay}
          aria-label="動画をもう一度見る"
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 transition-colors hover:bg-black/40"
        >
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-gray-800 shadow-md">
            ▶ もう一度見る
          </span>
        </button>
      )}
    </div>
  );
}
