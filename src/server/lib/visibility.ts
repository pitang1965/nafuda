// personas.fieldVisibility で項目が非公開にされているか。未設定は公開扱い。
// 他人のなふだの値を返す処理はすべてこれを通す（公開プロフィール以外の一覧・OGP も含む）。
export function isPrivateField(fieldVisibility: unknown, field: string) {
  return (fieldVisibility as Record<string, string> | null)?.[field] === "private";
}
