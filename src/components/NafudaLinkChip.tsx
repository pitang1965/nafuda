import { Link } from "@tanstack/react-router";
import { NafudaIcon } from "./NafudaIcon";

interface NafudaLinkChipProps {
  urlId?: string;
  shareToken?: string;
  displayName: string;
  avatarUrl?: string | null;
  colorOverride?: {
    border: string;
    text: string;
    hoverBg: string;
  };
  // 指定時は公開ページ遷移ではなくコールバックで動く（/me の in-place 切り替え用・ADR-0019）。
  onSelect?: () => void;
  // false かつ onSelect 無しのときは遷移しない静的チップにする（編集プレビュー用）。
  interactive?: boolean;
}

// 自分の別のなふだへの内部リンク（ADR-0015）。
// アバター丸＋displayName のコンパクトなチップ。アバター無しはなふだアイコンにフォールバックする。
export function NafudaLinkChip({
  urlId,
  shareToken,
  displayName,
  avatarUrl,
  colorOverride,
  onSelect,
  interactive = true,
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
        <NafudaIcon className="size-5 shrink-0" />
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

  // 遷移先トークンが無い／非インタラクティブ指定（プレビュー）のときは静的チップ。
  if (!interactive || !urlId || !shareToken) {
    return (
      <span className={className} style={style}>
        {inner}
      </span>
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
