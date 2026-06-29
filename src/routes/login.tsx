import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { authClient } from "../lib/auth-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  // Reject protocol-relative URLs (//evil.com) to prevent open redirect
  const callbackURL =
    redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/me";

  // errorCallbackURL: OAuth 失敗時に better-auth 既定のエラーページではなく
  // /login?error=CODE へ戻し、下の OAuthErrorMessage で原因別に案内する。
  const handleGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/login",
    });
  };
  const handleFacebook = async () => {
    await authClient.signIn.social({
      provider: "facebook",
      callbackURL,
      errorCallbackURL: "/login",
    });
  };
  const handleLine = async () => {
    await authClient.signIn.oauth2({
      providerId: "line",
      callbackURL,
      errorCallbackURL: "/login",
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">なふだ</h1>
        <p className="mt-2 text-sm text-gray-500">
          SNSをまとめて、出会いも記録する
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* メイン客層（推し活層）の入口。最強ゲートかつ最頻なので主ボタンとして最上段（ADR-0023） */}
        <Button
          onClick={handleLine}
          size="lg"
          className="w-full gap-2 bg-[#06C755] text-white hover:bg-[#05b34c]"
        >
          <LineLogo className="size-5" />
          LINEでログイン
        </Button>
        <Button
          onClick={handleGoogle}
          variant="outline"
          size="lg"
          className="w-full gap-2"
        >
          <span>G</span>
          Googleでログイン
        </Button>
        <Button
          onClick={handleFacebook}
          size="lg"
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <span>f</span>
          Facebookでログイン
        </Button>
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" />
        <span className="underline underline-offset-2">トップに戻る</span>
      </Link>

      <Link
        to="/privacy"
        className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
      >
        プライバシーポリシー
      </Link>

      <OAuthErrorMessage />
    </main>
  );
}

// LINE 公式ロゴ（白抜き・currentColor）。緑ボタン上で白く表示する。
function LineLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.252l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function OAuthErrorMessage() {
  const search =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const error = search?.get("error");
  if (!error) return null;

  // メールが取得できない原因は「LINEでメール提供をOFFにした」か「LINEにメール未登録」の
  // 2通り。どちらも再試行では直らないため、両方をカバーする案内と代替手段を出す。
  if (error === "email_is_missing") {
    return (
      <div className="w-full max-w-xs p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        LINEからメールアドレスを取得できなかったため、ログインできませんでした。LINEログイン時に「メールアドレス」の提供を許可するか、Googleでログインしてお試しください。（LINEにメール未登録の場合は、先にLINE側での登録が必要です）
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      ログインに失敗しました。もう一度お試しください。
      <Button
        variant="link"
        size="sm"
        onClick={() => {
          window.location.href = "/login";
        }}
        className="ml-1 p-0 h-auto text-red-700 underline"
      >
        再試行
      </Button>
    </div>
  );
}
