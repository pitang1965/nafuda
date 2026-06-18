import { TagInput, type Tag } from "emblor";
import { useFormContext } from "react-hook-form";
import { useState, useRef, useCallback } from "react";
import { getOshiSuggestions } from "../server/functions/oshi";

interface OshiTagInputProps {
  name?: string; // RHF field name, defaults to 'oshiTags'
  onPendingChange?: (hasPending: boolean) => void;
}

export function OshiTagInput({
  name = "oshiTags",
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

  return (
    <TagInput
      tags={emblorTags}
      setTags={handleSetTags}
      activeTagIndex={activeTagIndex}
      setActiveTagIndex={setActiveTagIndex}
      enableAutocomplete={suggestions.length > 0}
      autocompleteOptions={suggestions}
      onInputChange={handleInputChange}
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
  );
}
