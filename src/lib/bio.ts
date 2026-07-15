// 自己紹介（bio）の箇条書き対応。
// 保存は生テキストのまま（DB 変更なし）。行頭 `- `（半角ハイフン＋スペース）
// または `・`（全角中黒）を箇条書きとして解釈する。マーカー行が1行も無い bio は
// 従来どおりのテキスト表示になり、完全に後方互換。

// 行が箇条書きマーカーで始まるなら、マーカーを除いた中身を返す。そうでなければ null。
function bulletContent(line: string): string | null {
  if (line.startsWith("- ")) return line.slice(2);
  if (line.startsWith("・")) return line.slice(1).replace(/^\s/, "");
  return null;
}

export type BioBlock =
  | { type: "text"; text: string }
  | { type: "list"; items: string[] };

// bio を「連続するテキスト行のかたまり」と「連続する箇条書き行のかたまり」に分割する。
// 非マーカー行でリストは途切れ、マーカー行でテキストは途切れる。
export function parseBioBlocks(bio: string): BioBlock[] {
  const blocks: BioBlock[] = [];
  let textBuf: string[] = [];
  let listBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length) {
      blocks.push({ type: "text", text: textBuf.join("\n") });
      textBuf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length) {
      blocks.push({ type: "list", items: listBuf });
      listBuf = [];
    }
  };

  for (const line of bio.split("\n")) {
    const content = bulletContent(line);
    if (content !== null) {
      flushText();
      listBuf.push(content);
    } else {
      flushList();
      textBuf.push(line);
    }
  }
  flushText();
  flushList();
  return blocks;
}

// プレーンテキスト文脈（OGP description・お気に入り一覧のコンパクト表示）向けに
// 行頭の箇条書きマーカーを剥がす。`- ` `・` を除去し、中身だけを残す。
export function stripBioMarkers(bio: string): string {
  return bio
    .split("\n")
    .map((line) => {
      const content = bulletContent(line);
      return content !== null ? content : line;
    })
    .join("\n");
}
