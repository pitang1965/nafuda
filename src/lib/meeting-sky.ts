// 出会いの夜空 (MeetingSky) の配置ロジック。
// 星の見た目は出会いの客観属性（時期・季節・イベントの束なり）のみから導く。
// 関係の強弱・頻度・メモ量は符号化しない（平等原則 / ADR-0025）。
// 同じ入力からは常に同じ空が描かれるよう、乱数は使わず ID のハッシュで配置する。

export const SKY_W = 1000;
export const SKY_H = 600;

const PAD_X = 70;
const PAD_Y = 56;

export type SkyConnection = {
  connectionId: string;
  connectedAt: string | Date;
  eventId: string | null;
  isInstant: boolean | null;
};

export type Star = {
  connectionId: string;
  x: number;
  y: number;
  color: string;
  twinkleDelay: number;
};

export type SkyLine = { x1: number; y1: number; x2: number; y2: number };

export type SkyLayout = {
  stars: Star[];
  /** 同一企画イベント由来の星を connectedAt 順に結ぶ星座線 */
  lines: SkyLine[];
  /** 雰囲気用の背景の塵。コネクションとは無関係の固定装飾（全員同じ） */
  dust: { x: number; y: number; r: number; opacity: number }[];
  periodLabel: string;
  count: number;
};

/** 文字列から [0,1) を決定的に得る（FNV-1a + fmix32 仕上げ） */
function hash01(str: string, salt = 0): number {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // FNV-1a は末尾1文字違いの短い文字列で値が相関し、背景の塵が点線状に
  // 並んでしまう。murmur3 の finalizer で撹拌して無相関にする。
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 出会った季節の色（客観属性のみ。ADR-0025） */
export function seasonColor(date: Date): string {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "#fbc4e0"; // 春・桜
  if (m >= 6 && m <= 8) return "#8ff0e8"; // 夏・水
  if (m >= 9 && m <= 11) return "#ffd98a"; // 秋・灯
  return "#cfe3ff"; // 冬・氷
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function formatYearMonth(d: Date): string {
  return `${d.getFullYear()}.${d.getMonth() + 1}`;
}

export function layoutSky(connections: SkyConnection[]): SkyLayout {
  const dust = Array.from({ length: 80 }, (_, i) => ({
    x: hash01(`dust-x-${i}`) * SKY_W,
    y: hash01(`dust-y-${i}`) * SKY_H,
    r: 0.6 + hash01(`dust-r-${i}`) * 0.9,
    opacity: 0.15 + hash01(`dust-o-${i}`) * 0.25,
  }));

  if (connections.length === 0) {
    return { stars: [], lines: [], dust, periodLabel: "", count: 0 };
  }

  const parsed = connections.map((c) => ({
    ...c,
    date: new Date(c.connectedAt),
  }));

  const times = parsed.map((c) => c.date.getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const span = maxT - minT;

  // 星座＝同一企画イベント（isInstant === false）の束なり。
  // 即時イベントは交換ごとに独立なので星座を作らない（CONTEXT.md イベント）。
  const groups = new Map<string, typeof parsed>();
  for (const c of parsed) {
    if (c.eventId && c.isInstant === false) {
      const members = groups.get(c.eventId) ?? [];
      members.push(c);
      groups.set(c.eventId, members);
    }
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const c of parsed) {
    const tNorm = span === 0 ? 0.5 : (c.date.getTime() - minT) / span;
    const jitterX = (hash01(c.connectionId, 3) - 0.5) * 26;
    const x = clamp(
      PAD_X + tNorm * (SKY_W - PAD_X * 2) + jitterX,
      PAD_X * 0.5,
      SKY_W - PAD_X * 0.5,
    );

    // 同一企画イベントの星は縦方向にまとまり、星座として読めるようにする。
    // 束なりの位置自体もイベントIDから決定的に導く（評価軸ではない）。
    const group = c.eventId ? groups.get(c.eventId) : undefined;
    let y: number;
    if (group && group.length >= 2) {
      const anchorY =
        PAD_Y + 90 + hash01(c.eventId as string) * (SKY_H - PAD_Y * 2 - 180);
      y = anchorY + (hash01(c.connectionId, 7) - 0.5) * 190;
    } else {
      y = PAD_Y + hash01(c.connectionId, 7) * (SKY_H - PAD_Y * 2);
    }
    y = clamp(y, PAD_Y * 0.7, SKY_H - PAD_Y * 0.7);

    positions.set(c.connectionId, { x, y });
  }

  const stars: Star[] = parsed.map((c) => {
    const p = positions.get(c.connectionId) as { x: number; y: number };
    return {
      connectionId: c.connectionId,
      x: p.x,
      y: p.y,
      color: seasonColor(c.date),
      twinkleDelay: hash01(c.connectionId, 11) * 4,
    };
  });

  const lines: SkyLine[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const ordered = [...members].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = positions.get(ordered[i].connectionId) as {
        x: number;
        y: number;
      };
      const b = positions.get(ordered[i + 1].connectionId) as {
        x: number;
        y: number;
      };
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }

  const minLabel = formatYearMonth(new Date(minT));
  const maxLabel = formatYearMonth(new Date(maxT));
  const periodLabel =
    minLabel === maxLabel ? minLabel : `${minLabel} – ${maxLabel}`;

  return { stars, lines, dust, periodLabel, count: parsed.length };
}
