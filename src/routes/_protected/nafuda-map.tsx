import { createFileRoute, Link } from "@tanstack/react-router";
import { getNafudaMap } from "../../server/functions/profile";
import { NafudaMapDiagram } from "../../components/NafudaMapDiagram";

// なふだマップ（CONTEXT.md「なふだマップ」）: オーナー専用・読み取り専用の俯瞰／自己監査ビュー。
// 全なふだと、その間のなふだリンク（有向参照）を1画面で一望し、あるなふだを見せたときに
// ShareToken がどこまで推移的に露出するかを色で把握する。ガード（警告・トグル）は持たない（ADR-0015 不変）。
export const Route = createFileRoute("/_protected/nafuda-map")({
  loader: () => getNafudaMap(),
  staticData: { title: "なふだマップ" },
  component: NafudaMapPage,
});

function NafudaMapPage() {
  const { nodes, edges } = Route.useLoaderData();

  return (
    <div className="flex-1 p-4">
      {nodes.length <= 1 ? (
        <EmptyState
          title="なふだが1枚だけです"
          body="なふだを2枚以上作ると、なふだ同士のリンクの関係をここで見渡せます。"
        />
      ) : edges.length === 0 ? (
        <EmptyState
          title="なふだリンクはまだありません"
          body="なふだ同士のリンクがないため、リンク経由の露出もありません。自分の別のなふだへの導線は、なふだの編集画面から追加できます。"
        />
      ) : (
        <NafudaMapDiagram nodes={nodes} edges={edges} />
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h2 className="text-base font-bold text-gray-700">{title}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-gray-500">{body}</p>
      <Link
        to="/me"
        className="text-sm text-pink-500 underline underline-offset-2"
      >
        マイなふだへ戻る
      </Link>
    </div>
  );
}
