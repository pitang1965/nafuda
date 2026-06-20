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
  // 指定時は公開ページ遷移ではなくコールバックで動く（/me の in-place 切り替え用・ADR-0019）。
  onSelect?: () => void;
}

// 自分の別のなふだへの内部リンク（ADR-0015）。
// アバター丸＋displayName のコンパクトなチップ。アバター無しは 📛 にフォールバックする。
export function NafudaLinkChip({
  urlId,
  shareToken,
  displayName,
  avatarUrl,
  colorOverride,
  onSelect,
}: NafudaLinkChipProps) {
  const className =
    "flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs transition-colors max-w-full";
  const style = colorOverride
    ? { border: `1px solid ${colorOverride.border}`, color: colorOverride.text }
    : { border: "1px solid #e5e7eb", color: "#1f2937" };
  const onMouseEnter = colorOverride
    ? (e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.backgroundColor = colorOverride.hoverBg;
      }
    : undefined;
  const onMouseLeave = colorOverride
    ? (e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.backgroundColor = "";
      }
    : undefined;

  const inner = (
    <>
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
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={className}
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      to="/u/$urlId/p/$token"
      params={{ urlId, token: shareToken }}
      className={className}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {inner}
    </Link>
  );
}
