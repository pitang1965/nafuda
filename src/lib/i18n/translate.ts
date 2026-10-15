export type DictionaryNode = { [key: string]: string | DictionaryNode };

const INTERPOLATION_RE = /\{\{(\w+)\}\}/g;

// "a.b.c" 形式のキーで辞書を辿り、{{name}} プレースホルダーを params で埋めて返す。
// 見つからない場合はキー自体を返す（壊れた表示より原因が分かる方を優先）。
export function translate(
  dict: DictionaryNode,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let node: string | DictionaryNode | undefined = dict;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) {
      node = undefined;
      break;
    }
    node = node[part];
  }
  if (typeof node !== "string") {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] missing translation key: "${key}"`);
    }
    return key;
  }
  if (!params) return node;
  return node.replace(INTERPOLATION_RE, (_, name: string) =>
    String(params[name] ?? ""),
  );
}
