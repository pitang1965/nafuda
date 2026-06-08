import { createFileRoute, Link } from "@tanstack/react-router";
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

  const handleGoogle = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL });
  };
  const handleFacebook = async () => {
    await authClient.signIn.social({ provider: "facebook", callbackURL });
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
        className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
      >
        ← トップに戻る
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

function OAuthErrorMessage() {
  const search =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const error = search?.get("error");
  if (!error) return null;
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
