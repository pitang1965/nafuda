import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { NafudaCardView, type NafudaCardProfile } from "./NafudaCardView";
import { NAFUDA_STYLES, getNafudaStyle } from "../lib/nafuda-styles";

// 編集中（未保存）のなふだを「人から見た画面」として全画面プレビューする。
// 下部にスタイル切替を載せ、カード全体を見ながら色/フォント/縁取りを試せる。
export function NafudaPreviewDialog({
  isOpen,
  onClose,
  profile,
  selectedStyleId,
  onSelectStyle,
}: {
  isOpen: boolean;
  onClose: () => void;
  profile: NafudaCardProfile;
  selectedStyleId: string | null;
  onSelectStyle: (id: string | null) => void;
}) {
  // PC では Esc で閉じられるようにする（閲覧系QRと同方針）。
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasStyle = !!getNafudaStyle(selectedStyleId);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex flex-col">
      <div className="mx-auto w-full sm:max-w-sm flex-1 flex flex-col bg-white min-h-0">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
          <div>
            <p className="text-sm font-bold">プレビュー</p>
            <p className="text-xs text-gray-500">
              人から見た画面（非公開項目は除外）
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="プレビューを閉じる"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div
          className={`flex-1 overflow-y-auto min-h-0 ${
            hasStyle ? "bg-gray-900" : "bg-white"
          }`}
        >
          <NafudaCardView
            profile={profile}
            className="min-h-full"
            aboutLink="static"
            nafudaLinksInteractive={false}
          />
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <p className="text-xs text-gray-500 mb-1.5 px-1">
            なふだスタイル（タップで切替）
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <StyleSwatch
              selected={!selectedStyleId}
              onClick={() => onSelectStyle(null)}
              label="なし"
            />
            {NAFUDA_STYLES.map((s) => (
              <StyleSwatch
                key={s.id}
                selected={selectedStyleId === s.id}
                onClick={() => onSelectStyle(s.id)}
                label={s.name}
                background={s.background}
                pro={!s.isFree}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StyleSwatch({
  selected,
  onClick,
  label,
  background,
  pro,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  background?: string;
  pro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 w-14 flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 transition-all ${
        selected ? "border-black" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div
        className="w-full h-9 rounded-md border border-gray-200"
        style={background ? { background } : { background: "#ffffff" }}
      />
      {pro && (
        <span className="absolute top-0.5 left-0.5 text-[8px] font-bold bg-linear-to-r from-yellow-400 to-amber-500 text-white px-1 rounded leading-tight">
          PRO
        </span>
      )}
      <span className="text-[10px] text-gray-600 leading-none truncate w-full text-center">
        {label}
      </span>
    </button>
  );
}
