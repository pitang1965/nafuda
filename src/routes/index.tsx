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
    icon: "🔗",
    title: "SNSリンクをひとつにまとめる",
    description:
      "X・Instagram・YouTubeなど、バラバラなリンクを1枚のなふだに。SNSのbioリンクはこれひとつで。",
  },
  {
    icon: "🪪",
    title: "QRで名刺交換",
    description: "イベント会場でQRを見せ合うだけ。その場でつながれる。",
  },
  {
    icon: "🗂",
    title: "出会いの文脈を残す",
    description:
      "いつ・どこで出会ったか、自動で記録。ライブ・オフ会・握手会の思い出に。",
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
    <main className="min-h-screen bg-linear-to-b from-pink-50 to-white flex flex-col items-center px-4 py-12">
      <div className="max-w-md w-full flex flex-col items-center">
        <p className="text-2xl font-bold text-pink-500 tracking-widest mb-3">
          なふだ
        </p>
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center leading-snug">
          SNSをひとつに。出会いに、文脈を。
        </h1>
        <p className="text-sm text-gray-500 mb-10 text-center leading-relaxed">
          X・Instagram・YouTubeなど、バラバラなリンクを1枚のなふだにまとめられる。
          イベントで出会った人とのつながりも、いつ・どこでという文脈ごと記録に残せる。
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

        {/* Screenshots */}
        <div className="flex flex-col gap-10 w-full mt-10 mb-2">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/screenshot1.jpg"
              alt="なふだの画面例"
              width={526}
              height={770}
              fetchPriority="high"
              className="w-full max-w-xs rounded-2xl shadow-lg"
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">
                自分だけのなふだを作ろう
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                スタイルを選んで個性を演出。推し活用・仕事用など複数のなふだを使い分けられる。
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <a
              href="https://nafuda.me/u/ffa2c0f0f4/p/5db65a7ecc006a102f7ba42790acff93"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/demo-qrl.png"
                alt="なふだのQRコード例"
                width={300}
                height={349}
                loading="lazy"
                className="w-48 h-48 rounded-2xl shadow-lg"
              />
            </a>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">
                QRをスキャンして試してみる
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                推測されにくいURLで、必要な人にだけ情報を届けられる。
              </p>
            </div>
          </div>
        </div>

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
    </main>
  );
}
