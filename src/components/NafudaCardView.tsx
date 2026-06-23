import { Link } from "@tanstack/react-router";
import { UserAvatar } from "./UserAvatar";
import { SnsLinkButton } from "./SnsLinkButton";
import { NafudaLinkChip } from "./NafudaLinkChip";
import { NafudaIcon } from "./NafudaIcon";
import { NafudaFrame } from "./NafudaFrame";
import { HolographicOverlay } from "./HolographicOverlay";
import { GalleryLightbox } from "./GalleryLightbox";
import { CherryBlossomOverlay } from "./CherryBlossomOverlay";
import { getNafudaStyle } from "../lib/nafuda-styles";
import { purposeTagHeading } from "../lib/purpose";
import { useNafudaFont } from "../lib/use-nafuda-font";
import { cn } from "../lib/utils";

// 「人から見た画面」の表示専用カード。公開プロフィール (/u/.../p/) と編集プレビューの
// 両方で使い、見た目のドリフトを防ぐ。公開範囲フィルタ済みのデータを受け取る前提で、
// ここでは可視性判定はしない（呼び出し側が非公開項目を除いて渡す）。
export interface NafudaCardProfile {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  oshiTags: string[];
  purpose: string | null;
  galleryPhotos: { imageUrl: string; caption: string | null }[];
  snsLinks: { platform: string; url: string; title?: string | null }[];
  nafudaLinks: {
    urlId?: string;
    shareToken?: string;
    displayName: string;
    avatarUrl: string | null;
  }[];
  styleId: string | null;
}

export function NafudaCardView({
  profile,
  className,
  aboutLink = "link",
  nafudaLinksInteractive = true,
}: {
  profile: NafudaCardProfile;
  className?: string;
  // 公開ページは実リンク、プレビューは遷移させたくないので静的表示にする
  aboutLink?: "link" | "static" | "none";
  nafudaLinksInteractive?: boolean;
}) {
  const style = getNafudaStyle(profile.styleId);
  const textColor = style?.textColor;
  const subtextColor = style?.subtextColor;
  useNafudaFont(style);

  const linkColorOverride = style
    ? {
        border: `${style.textColor}50`,
        text: style.textColor,
        hoverBg: `${style.textColor}15`,
      }
    : undefined;

  return (
    <div
      className={cn("relative", className)}
      style={{
        background: style?.background ?? undefined,
        fontFamily: style?.fontFamily ?? undefined,
        color: textColor ?? undefined,
      }}
    >
      {style?.frameId && <NafudaFrame frameId={style.frameId} />}
      {style?.holographic && <HolographicOverlay />}
      {style?.petalsFall && <CherryBlossomOverlay />}
      <div className="p-6 flex flex-col items-center gap-4 relative z-20">
        <UserAvatar
          avatarUrl={profile.avatarUrl}
          name={profile.displayName}
          size={80}
          style={
            style ? { boxShadow: `0 0 0 3px ${style.textColor}40` } : undefined
          }
        />
        <h1
          className="text-2xl font-bold"
          style={{ color: textColor ?? undefined }}
        >
          {profile.displayName}
        </h1>
        {profile.bio && (
          <p
            className="text-sm text-center whitespace-pre-wrap max-w-sm"
            style={{ color: subtextColor ?? "#4b5563" }}
          >
            {profile.bio}
          </p>
        )}
        {profile.oshiTags.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            {purposeTagHeading(profile.purpose) && (
              <span
                className="text-xs font-medium"
                style={{ color: subtextColor ?? "#6b7280" }}
              >
                {purposeTagHeading(profile.purpose)}
              </span>
            )}
            <div className="flex flex-wrap gap-1 justify-center">
              {profile.oshiTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={
                    style
                      ? { background: style.tagBg, color: style.tagText }
                      : { background: "#fce7f3", color: "#be185d" }
                  }
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {profile.galleryPhotos.length > 0 && (
          <div className="w-full max-w-sm">
            <GalleryLightbox
              photos={profile.galleryPhotos}
              accentColor={style?.textColor}
            />
          </div>
        )}
        {profile.snsLinks.length > 0 && (
          <div className="w-full max-w-sm flex flex-col gap-2">
            {profile.snsLinks.map((link, i) => (
              <SnsLinkButton
                key={`${link.platform}-${i}-${link.url}`}
                platform={link.platform}
                url={link.url}
                title={link.title}
                colorOverride={linkColorOverride}
              />
            ))}
          </div>
        )}
        {profile.nafudaLinks.length > 0 && (
          <div className="w-full max-w-sm flex flex-col items-center gap-1">
            <span
              className="text-xs font-medium inline-flex items-center gap-1"
              style={{ color: subtextColor ?? "#6b7280" }}
            >
              <NafudaIcon /> 他のなふだ
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {profile.nafudaLinks.map((link, i) => (
                <NafudaLinkChip
                  key={link.shareToken ?? `${link.displayName}-${i}`}
                  urlId={link.urlId}
                  shareToken={link.shareToken}
                  displayName={link.displayName}
                  avatarUrl={link.avatarUrl}
                  interactive={nafudaLinksInteractive}
                  colorOverride={linkColorOverride}
                />
              ))}
            </div>
          </div>
        )}

        {aboutLink === "link" ? (
          <Link
            to="/"
            className="mt-4 text-xs underline underline-offset-2 transition-colors"
            style={{ color: subtextColor ?? "#9ca3af" }}
          >
            なふだとは？
          </Link>
        ) : aboutLink === "static" ? (
          <span
            className="mt-4 text-xs underline underline-offset-2"
            style={{ color: subtextColor ?? "#9ca3af" }}
          >
            なふだとは？
          </span>
        ) : null}
      </div>
    </div>
  );
}
