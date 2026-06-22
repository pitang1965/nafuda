import { TagInput, type Tag } from "emblor";
import { useFormContext } from "react-hook-form";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  getOshiSuggestions,
  getPopularOshiTags,
} from "../server/functions/oshi";
import { purposePopularTagSeeds } from "@/lib/purpose";

interface OshiTagInputProps {
  name?: string; // RHF field name, defaults to 'oshiTags'
  // 用途タイプ。人気タグチップのキュレーション seed と usage 集計の絞り込みに使う。
  purpose?: string | null;
  onPendingChange?: (hasPending: boolean) => void;
}

export function OshiTagInput({
  name = "oshiTags",
  purpose,
  onPendingChange,
}: OshiTagInputProps) {
  const { setValue, watch } = useFormContext();
  const rawTags: string[] = watch(name) ?? [];

  // Emblor requires React.Dispatch<React.SetStateAction<Tag[]>> — use useState
  // Sync: RHF is source of truth (string[]), Emblor state derived from it
  const [emblorTags, setEmblorTags] = useState<Tag[]>(() =>
    rawTags.map((text, i) => ({ id: String(i), text })),
  );

  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  // useRef for debounce timer — avoids stale closure in useCallback (per 01-03 pattern)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetTags: React.Dispatch<React.SetStateAction<Tag[]>> =
    useCallback(
      (newTagsOrUpdater) => {
        setEmblorTags((prev) => {
          const newTags =
            typeof newTagsOrUpdater === "function"
              ? newTagsOrUpdater(prev)
              : newTagsOrUpdater;
          // Sync string[] back to RHF
          setValue(
            name,
            newTags.map((t) => t.text),
            { shouldDirty: true, shouldValidate: true },
          );
          // Tag confirmed (Enter pressed) — clear pending state
          if (newTags.length > prev.length) onPendingChange?.(false);
          return newTags;
        });
      },
      [setValue, name, onPendingChange],
    );

  const handleInputChange = useCallback(
    (value: string) => {
      onPendingChange?.(value.length > 0);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (!value || value.length < 1) {
        setSuggestions([]);
        return;
      }
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const results = await getOshiSuggestions({ data: { query: value } });
          setSuggestions(results.map((s) => ({ id: s, text: s })));
        } catch {
          setSuggestions([]);
        }
      }, 300);
    },
    [onPendingChange],
  );

  // ゼロ入力で見せる人気タグ（usage 集計）。purpose 変更に追従して取り直す。
  // .then 内 setState は同期ではないため effect-setState の lint には触れない。
  const [usageTags, setUsageTags] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    getPopularOshiTags({ data: { purpose: purpose ?? undefined } })
      .then((tags) => {
        if (!cancelled) setUsageTags(tags);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [purpose]);

  // ハイブリッド: キュレーション seed を優先し、usage 人気で補う。
  // 重複・既に選択済みのタグを除き、最大12個まで。
  const selected = new Set(rawTags);
  const chipTags = [
    ...new Set([...purposePopularTagSeeds(purpose), ...usageTags]),
  ]
    .filter((t) => !selected.has(t))
    .slice(0, 12);

  const addTag = useCallback(
    (text: string) => {
      setEmblorTags((prev) => {
        if (prev.length >= 20 || prev.some((t) => t.text === text)) return prev;
        const next = [...prev, { id: crypto.randomUUID(), text }];
        setValue(
          name,
          next.map((t) => t.text),
          { shouldDirty: true, shouldValidate: true },
        );
        return next;
      });
    },
    [setValue, name],
  );

  return (
    <div className="space-y-2">
      <TagInput
        tags={emblorTags}
        setTags={handleSetTags}
        activeTagIndex={activeTagIndex}
        setActiveTagIndex={setActiveTagIndex}
        enableAutocomplete={suggestions.length > 0}
        autocompleteOptions={suggestions}
        onInputChange={handleInputChange}
        // Enter を押さずに保存/次へに進むと未確定テキストが捨てられていた（データ消失）。
        // blur 時に入力欄の残り文字列を自動でタグ化して取りこぼしを防ぐ。
        // 保存バー・「次へ」タップは先に input を blur させるため、確定後に save が読む。
        addTagsOnBlur
        placeholder="推し・趣味・ジャンルを入力して Enter"
        maxTags={20}
        className="w-full"
        styleClasses={{
          // モバイルSafariはfontSize<16pxの入力欄をタップすると自動ズームする。
          // emblorのデフォルトinputはtext-sm(14px)なので16px化してズームを抑止。
          input: "text-base md:text-sm",
          tag: {
            body: "bg-pink-100 text-pink-700 border-pink-200 pl-3",
            closeButton: "py-1 pl-1 pr-1 h-full hover:bg-transparent",
          },
          autoComplete: {
            popoverContent:
              "z-50 bg-white border border-gray-200 rounded-lg shadow-lg",
          },
        }}
      />
      {chipTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chipTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="inline-flex items-center gap-0.5 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-600 transition-colors hover:border-pink-300 hover:bg-pink-50 hover:text-pink-700"
            >
              <span className="text-gray-400">＋</span>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
