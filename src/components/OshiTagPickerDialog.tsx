import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

// 人気タグを多数並べてタップで選択するモーダル。
// 入力欄下のインラインチップ（上位12個）の「もっと見る」から開く。
// 選択状態はオーナーの oshiTags に同期し、タップで追加／再タップで解除できる。
// フォーカストラップ・スクロールロック・aria-modal・Esc は Radix Dialog に委譲する。
export function OshiTagPickerDialog({
  isOpen,
  onClose,
  heading,
  tags,
  selected,
  onToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  heading: string;
  tags: string[];
  selected: Set<string>;
  onToggle: (tag: string) => void;
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="shrink-0 border-b border-gray-200 px-4 py-3 text-left">
          <DialogTitle className="text-sm font-bold">
            {heading}から選ぶ
          </DialogTitle>
          <DialogDescription className="text-xs">
            タップで追加／もう一度タップで解除
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const isSelected = selected.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggle(tag)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-0.5 rounded-full border px-2.5 py-1 text-sm transition-colors ${
                    isSelected
                      ? "border-pink-200 bg-pink-100 text-pink-700"
                      : "border-gray-300 bg-white text-gray-600 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-700"
                  }`}
                >
                  <span
                    className={isSelected ? "text-pink-400" : "text-gray-400"}
                  >
                    {isSelected ? "✓" : "＋"}
                  </span>
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-gray-200 p-3">
          <DialogClose asChild>
            <Button type="button" className="w-full">
              完了
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
