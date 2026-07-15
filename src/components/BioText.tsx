import { parseBioBlocks } from "../lib/bio";

// 自己紹介（bio）のブロック表示。テキスト行は従来どおり whitespace-pre-wrap で
// 描画し、箇条書き行は <ul> にまとめる。箇条書きは「中央に置いた左揃えの塊」
// （inline-block text-left）にして、カードの中央対称なコンポジションを保ちつつ
// 中身だけ左揃えにする（親側で text-center を渡す前提）。
export function BioText({
  bio,
  className,
  color,
}: {
  bio: string;
  className?: string;
  color?: string;
}) {
  const blocks = parseBioBlocks(bio);

  return (
    <div className={className} style={color ? { color } : undefined}>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul
            key={i}
            className="inline-block text-left list-disc pl-5 my-1"
          >
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {block.text}
          </p>
        )
      )}
    </div>
  );
}
