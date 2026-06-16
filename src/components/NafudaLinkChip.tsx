import { Link } from "@tanstack/react-router";

interface NafudaLinkChipProps {
  urlId: string;
  shareToken: string;
  displayName: string;
  avatarUrl?: string | null;
  colorOverride?: {
    border: string;
    text: string;
    hoverBg: string;
  };
}

// 自分の別のなふだへの内部リンク（ADR-0015）。
// アバター丸＋displayName のコンパクトなチップ。アバター無しは 📛 にフォールバックする。
export function NafudaLinkChip({
  urlId,
  shareToken,
  displayName,
  avatarUrl,
  colorOverride,
}: NafudaLinkChipProps) {
  return (
    <Link
      to="/u/$urlId/p/$token"
      params={{ urlId, token: shareToken }}
      className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs transition-colors max-w-full"
      style={
        colorOverride
          ? { border: `1px solid ${colorOverride.border}`, color: colorOverride.text }
          : { border: "1px solid #e5e7eb", color: "#1f2937" }
      }
      onMouseEnter={
        colorOverride
          ? (e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                colorOverride.hoverBg;
            }
          : undefined
      }
      onMouseLeave={
        colorOverride
          ? (e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "";
            }
          : undefined
      }
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-5 h-5 rounded-full object-cover shrink-0"
        />
      ) : (
        <span className="text-sm leading-none shrink-0" aria-hidden>
          📛
        </span>
      )}
      <span className="truncate">{displayName}</span>
    </Link>
  );
}
