import { useMemo, useState } from "react";
import { UserAvatar } from "./UserAvatar";

// なふだマップの図コンポーネント（CONTEXT.md「なふだマップ」）。
// 依存ゼロの自前の円環レイアウト＋静的SVGで有向グラフを描く（mermaid 等の
// グラフライブラリは使わない — バンドル増・SSR不可・アバター埋め込み不可のため）。
// ノードをタップすると、そこから到達できる下流（露出する先）と、そこへ到達できる
// 上流（露出させる元）を色分けで同時ハイライトする（推移閉包・循環対応）。
// 読み取り専用。リンクの追加・削除は各なふだの編集画面で行う。

export interface MapNode {
  id: string;
  displayName: string;
  label: string | null;
  avatarUrl: string | null;
}
export interface MapEdge {
  from: string;
  to: string;
}

// 色（下流＝露出する先／上流＝露出させる元／両方＝循環）
const COLOR = {
  down: "#f59e0b", // amber-500: このなふだを見せると露出する先
  up: "#0ea5e9", // sky-500: これを見せると自分が露出してしまう入口
  both: "#a855f7", // purple-500: 循環で下流かつ上流
  selected: "#ec4899", // pink-500: 選択中
  neutral: "#9ca3af", // gray-400: 無選択時の辺
  dim: "#e5e7eb", // gray-200: 非ハイライト
} as const;

const R = 38; // 円環半径（0-100 座標系）
const GAP = 7; // ノード中心から辺の端までの余白（矢印がノードに隠れないように）
const BOW = 5; // 辺の湾曲量（A→B と B→A を分離するため）

function nodeName(n: MapNode): string {
  return n.label?.trim() || n.displayName;
}

// 隣接から到達可能な集合（開始ノードは含めない。循環で戻る場合のみ含まれる）
function closure(start: string, adj: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!result.has(next)) {
        result.add(next);
        queue.push(next);
      }
    }
  }
  return result;
}

export function NafudaMapDiagram({
  nodes,
  edges,
}: {
  nodes: MapNode[];
  edges: MapEdge[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  // ノード座標（円周上に等間隔、先頭を上に置く）
  const positions = useMemo(() => {
    const N = nodes.length;
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const theta = ((-90 + (i * 360) / N) * Math.PI) / 180;
      map.set(n.id, {
        x: 50 + R * Math.cos(theta),
        y: 50 + R * Math.sin(theta),
      });
    });
    return map;
  }, [nodes]);

  // 有向隣接（下流＝outgoing／上流＝incoming）
  const { outAdj, inAdj } = useMemo(() => {
    const out = new Map<string, string[]>();
    const inc = new Map<string, string[]>();
    for (const e of edges) {
      if (!out.has(e.from)) out.set(e.from, []);
      out.get(e.from)!.push(e.to);
      if (!inc.has(e.to)) inc.set(e.to, []);
      inc.get(e.to)!.push(e.from);
    }
    return { outAdj: out, inAdj: inc };
  }, [edges]);

  const { downstream, upstream } = useMemo(() => {
    if (!selected)
      return { downstream: new Set<string>(), upstream: new Set<string>() };
    return {
      downstream: closure(selected, outAdj),
      upstream: closure(selected, inAdj),
    };
  }, [selected, outAdj, inAdj]);

  // ノードの種別 → 見た目
  function nodeKind(id: string): keyof typeof COLOR | "none" {
    if (!selected) return "none";
    if (id === selected) return "selected";
    const d = downstream.has(id);
    const u = upstream.has(id);
    if (d && u) return "both";
    if (d) return "down";
    if (u) return "up";
    return "dim";
  }

  // 辺の色（下流経路＝amber／上流経路＝sky／両方＝purple／無選択＝neutral／その他＝dim）
  const reachDown = useMemo(
    () => new Set(selected ? [selected, ...downstream] : []),
    [selected, downstream],
  );
  const reachUp = useMemo(
    () => new Set(selected ? [selected, ...upstream] : []),
    [selected, upstream],
  );
  function edgeColor(e: MapEdge): string {
    if (!selected) return COLOR.neutral;
    const isDown = reachDown.has(e.from) && downstream.has(e.to);
    const isUp = upstream.has(e.from) && reachUp.has(e.to);
    if (isDown && isUp) return COLOR.both;
    if (isDown) return COLOR.down;
    if (isUp) return COLOR.up;
    return COLOR.dim;
  }

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectedNode = selected ? byId.get(selected) : null;
  const downList = selectedNode
    ? nodes.filter((n) => downstream.has(n.id))
    : [];
  const upList = selectedNode ? nodes.filter((n) => upstream.has(n.id)) : [];

  // 使われる辺色ごとに矢印マーカーを用意（marker は stroke を継承しないため色別に定義）
  const markerColors = [
    COLOR.down,
    COLOR.up,
    COLOR.both,
    COLOR.neutral,
    COLOR.dim,
  ];
  const markerId = (c: string) => `nm-arrow-${c.replace("#", "")}`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500 text-center">
        なふだをタップすると、それを見せたときに広がる露出を色で示します。
      </p>

      {/* 図（正方形・円環配置） */}
      <div
        className="relative mx-auto w-full"
        style={{ maxWidth: 360, aspectRatio: "1 / 1" }}
      >
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          style={{ overflow: "visible" }}
          aria-hidden
        >
          <defs>
            {markerColors.map((c) => (
              <marker
                key={c}
                id={markerId(c)}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                markerUnits="userSpaceOnUse"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {edges.map((e, i) => {
            const p1 = positions.get(e.from);
            const p2 = positions.get(e.to);
            if (!p1 || !p2) return null;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const sx = p1.x + ux * GAP;
            const sy = p1.y + uy * GAP;
            const ex = p2.x - ux * GAP;
            const ey = p2.y - uy * GAP;
            // 垂直方向に湾曲（from/to を反転すると符号も反転し双方向辺が分離する）
            const mx = (sx + ex) / 2 + -uy * BOW;
            const my = (sy + ey) / 2 + ux * BOW;
            const color = edgeColor(e);
            const active = selected != null && color !== COLOR.dim;
            return (
              <path
                key={`${e.from}-${e.to}-${i}`}
                d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                fill="none"
                stroke={color}
                strokeWidth={active ? 1.4 : 1}
                markerEnd={`url(#${markerId(color)})`}
                style={{ transition: "stroke 0.15s" }}
              />
            );
          })}
        </svg>

        {/* ノード（アバター＋名前を絶対配置。SVG の上に重ねてクリック可能に） */}
        {nodes.map((n) => {
          const pos = positions.get(n.id)!;
          const kind = nodeKind(n.id);
          const ringColor =
            kind === "none"
              ? "transparent"
              : kind === "dim"
                ? "transparent"
                : COLOR[kind];
          const dimmed = kind === "dim"; // kind は選択時のみ "dim" になる
          const isSelected = kind === "selected";
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => setSelected((s) => (s === n.id ? null : n.id))}
              aria-pressed={isSelected}
              aria-label={`${nodeName(n)}${isSelected ? "（選択中）" : ""}`}
              className="absolute flex flex-col items-center gap-0.5 outline-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                width: 72,
                opacity: dimmed ? 0.35 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <span
                className="rounded-full"
                style={{
                  padding: 2,
                  boxShadow:
                    ringColor === "transparent"
                      ? "0 0 0 1px #e5e7eb"
                      : `0 0 0 3px ${ringColor}`,
                  borderRadius: "9999px",
                }}
              >
                <UserAvatar
                  avatarUrl={n.avatarUrl}
                  name={n.displayName}
                  size={40}
                />
              </span>
              <span
                className="max-w-18 truncate text-[11px] leading-tight text-gray-700"
                title={nodeName(n)}
              >
                {nodeName(n)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="mx-auto flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
        <LegendDot color={COLOR.down} label="露出する先" />
        <LegendDot color={COLOR.up} label="露出させる元" />
        <span className="text-gray-400">
          矢印 A→B ＝ A を見せると B が開ける
        </span>
      </div>

      {/* 情報パネル（選択時） */}
      {selectedNode ? (
        <div className="mx-auto w-full max-w-sm rounded-xl border border-gray-200 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2">
            <UserAvatar
              avatarUrl={selectedNode.avatarUrl}
              name={selectedNode.displayName}
              size={28}
            />
            <span className="font-bold">{nodeName(selectedNode)}</span>
          </div>
          <ExposureRow
            arrow="→"
            color={COLOR.down}
            heading="露出する先"
            help="これを見せた相手が、なふだリンクをたどって開けてしまう別のなふだ"
            names={downList.map(nodeName)}
          />
          <ExposureRow
            arrow="←"
            color={COLOR.up}
            heading="露出させる元"
            help="これらを見せると、このなふだが開けてしまう入口"
            names={upList.map(nodeName)}
          />
          <p className="mt-3 text-xs text-gray-400">
            意図しない露出があれば、そのなふだの編集画面でなふだリンクを外してください。
          </p>
        </div>
      ) : (
        <p className="text-center text-xs text-gray-400">
          孤立したなふだ（どことも繋がっていない＝露出なし）は枠だけで表示されます。
        </p>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function ExposureRow({
  arrow,
  color,
  heading,
  help,
  names,
}: {
  arrow: string;
  color: string;
  heading: string;
  help: string;
  names: string[];
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        <span style={{ color }}>{arrow}</span>
        <span className="font-medium" style={{ color }}>
          {heading}
        </span>
      </div>
      <p className="mb-1 text-[11px] text-gray-400">{help}</p>
      {names.length === 0 ? (
        <span className="text-xs text-gray-400">（なし）</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {names.map((name) => (
            <span
              key={name}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: `${color}1a`, color }}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
