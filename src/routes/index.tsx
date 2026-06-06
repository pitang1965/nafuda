import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "../server/auth";

const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  return auth.api.getSession({ headers: request.headers });
});

const features = [
  {
    icon: "🪪",
    title: "QRコードで名刺交換",
    description: "イベント会場でQRを見せ合うだけ。その場でつながれる。",
  },
  {
    icon: "🌟",
    title: "推しタグで仲間を発見",
    description: "同じアーティストを推す人がひと目でわかる。",
  },
  {
    icon: "🎪",
    title: "イベントルームで盛り上がる",
    description: "ライブ・握手会・オフ会の参加者と気軽に交流。",
  },
  {
    icon: "🪄",
    title: "シーンで使い分ける",
    description:
      "推し活用・仕事用を別々のなふだに。見せたい情報だけを見せられる。",
  },
];

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/me" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-white flex flex-col items-center px-4 py-12">
      <div className="max-w-md w-full flex flex-col items-center">
        <p className="text-2xl font-bold text-pink-500 tracking-widest mb-3">
          なふだ
        </p>
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center leading-snug">
          出会いに、文脈を。
        </h1>
        <p className="text-sm text-gray-500 mb-10 text-center leading-relaxed">
          ライブ会場で隣の人と話が弾んだ。でもSNS交換って気まずい——
          そんなとき、QRをかざすだけ。推しも、現場も、ふたりの記録に残る。
        </p>

        <Link
          to="/login"
          className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full shadow-md transition-colors mb-12 text-base text-center block"
        >
          はじめる
        </Link>

        <p className="text-xs text-gray-400 text-center">
          <Link
            to="/privacy"
            className="underline underline-offset-2 hover:text-gray-600"
          >
            プライバシーポリシー
          </Link>
        </p>

        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4 self-start mt-8">
          できること
        </p>
        <div className="flex flex-col gap-4 w-full">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-white rounded-2xl shadow-sm px-5 py-4"
            >
              <span className="text-3xl mt-0.5">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
