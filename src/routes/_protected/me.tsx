import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getOwnProfile, deleteAccount } from "../../server/functions/profile";
import { authClient } from "../../lib/auth-client";
import { PersonaSwitcher } from "../../components/PersonaSwitcher";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { SnsLinkButton } from "../../components/SnsLinkButton";
import { QRBottomSheet } from "../../components/QRBottomSheet";
import { PwaInstallBanner } from "../../components/PwaInstallBanner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_protected/me")({
  loader: () => getOwnProfile(),
  component: MePage,
});

function PrivateBadge() {
  return <span className="text-xs text-gray-400 ml-1">🔒</span>;
}

const LAST_PERSONA_KEY = "nafuda_last_persona_id";

function resolveInitialPersonaId(
  personas: { id: string; isDefault: boolean }[],
): string {
  const saved =
    typeof window !== "undefined"
      ? localStorage.getItem(LAST_PERSONA_KEY)
      : null;
  if (saved && personas.some((p) => p.id === saved)) return saved;
  return personas.find((p) => p.isDefault)?.id ?? personas[0]?.id ?? "";
}

function MePage() {
  const { urlId, personas } = Route.useLoaderData();
  const navigate = useNavigate();
  const [currentPersonaId, setCurrentPersonaId] = useState(() =>
    resolveInitialPersonaId(personas),
  );
  const currentPersona = personas.find((p) => p.id === currentPersonaId);
  const [qrOpen, setQrOpen] = useState(false);
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (currentPersonaId)
      localStorage.setItem(LAST_PERSONA_KEY, currentPersonaId);
  }, [currentPersonaId]);

  const handleLogout = async () => {
    await authClient.signOut();
    await navigate({ to: "/login" });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await authClient.signOut();
      await navigate({ to: "/login" });
    } catch {
      setDeleteError("退会処理に失敗しました。再度お試しください。");
      setIsDeleting(false);
    }
  };

  // No persona yet → redirect to wizard
  if (!personas.length || !urlId) {
    return <RedirectToWizard />;
  }

  const vis = (currentPersona?.fieldVisibility ?? {}) as Record<string, string>;
  const isPrivate = (field: string) => vis[field] === "private";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar with persona switcher */}
      <div className="flex items-center justify-between p-4 border-b">
        <PersonaSwitcher
          personas={personas}
          currentPersonaId={currentPersonaId}
          onSwitch={setCurrentPersonaId}
          onCreateNew={() => navigate({ to: "/profile/wizard" })}
        />
        <div className="flex items-center gap-3">
          <Link
            to="/profile/edit"
            search={{ personaId: currentPersonaId }}
            className="text-sm text-gray-500 underline"
          >
            編集
          </Link>
          <Link to="/events" className="text-sm text-gray-500 underline">
            イベント
          </Link>
          <Button
            variant="link"
            size="sm"
            onClick={handleLogout}
            className="p-0 h-auto text-gray-500"
          >
            ログアウト
          </Button>
        </div>
      </div>

      <PwaInstallBanner />

      {/* Profile display */}
      <div className="flex-1 p-6 flex flex-col items-center gap-4">
        <div
          className={`relative ${isPrivate("avatar_url") ? "opacity-50" : ""}`}
        >
          {currentPersona?.avatarUrl ? (
            <img
              src={currentPersona.avatarUrl}
              alt=""
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar
              name={currentPersona?.displayName ?? "?"}
              size={80}
            />
          )}
          {isPrivate("avatar_url") && (
            <span className="absolute -bottom-1 -right-1 bg-white rounded-full text-sm leading-none px-0.5">
              🔒
            </span>
          )}
        </div>

        <div
          className={`flex items-center gap-1 ${isPrivate("display_name") ? "opacity-50" : ""}`}
        >
          <h1 className="text-xl font-bold">{currentPersona?.displayName}</h1>
          {isPrivate("display_name") && <PrivateBadge />}
        </div>

        {!currentPersona?.label && (
          <Link
            to="/profile/edit"
            search={{ personaId: currentPersonaId }}
            className="text-xs text-gray-400 underline"
          >
            ラベルを設定する →
          </Link>
        )}

        {currentPersona?.bio && (
          <div
            className={`w-full max-w-xs text-center ${isPrivate("bio") ? "opacity-50" : ""}`}
          >
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {currentPersona.bio}
            </p>
            {isPrivate("bio") && (
              <p className="text-xs text-gray-400 mt-1">🔒 非公開</p>
            )}
          </div>
        )}

        {currentPersona?.oshiTags && currentPersona.oshiTags.length > 0 && (
          <div
            className={`w-full max-w-xs ${isPrivate("oshi_tags") ? "opacity-50" : ""}`}
          >
            <div className="flex flex-wrap gap-1 justify-center">
              {currentPersona.oshiTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
            {isPrivate("oshi_tags") && (
              <p className="text-xs text-gray-400 text-center mt-1">
                🔒 非公開
              </p>
            )}
          </div>
        )}

        {currentPersona?.snsLinks && currentPersona.snsLinks.length > 0 && (
          <div
            className={`flex flex-col gap-2 w-full max-w-xs ${isPrivate("sns_links") ? "opacity-50" : ""}`}
          >
            {currentPersona.snsLinks.map((link) => (
              <SnsLinkButton
                key={link.id}
                platform={link.platform}
                url={link.url}
              />
            ))}
            {isPrivate("sns_links") && (
              <p className="text-xs text-gray-400 text-center">🔒 非公開</p>
            )}
          </div>
        )}

        <div className="w-full max-w-xs pt-2 flex flex-col gap-2">
          <Button
            onClick={() => setQrOpen(true)}
            size="lg"
            className="w-full rounded-xl"
          >
            QRコードを表示
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="w-full rounded-xl"
          >
            <Link to="/connections">つながりを見る</Link>
          </Button>
        </div>

        <div className="pt-6 pb-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-gray-400 underline hover:text-red-500"
          >
            退会する
          </button>
        </div>
      </div>

      {currentPersona && urlId && (
        <QRBottomSheet
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          url={
            origin ? `${origin}/u/${urlId}/p/${currentPersona.shareToken}` : ""
          }
          label={`${currentPersona.displayName} のQRコード`}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">退会の確認</h2>
            <p className="text-sm text-gray-600 mb-3">
              以下のデータが完全に削除されます（復元できません）：
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc pl-4 space-y-1">
              <li>すべてのなふだ</li>
              <li>つながり（相手側の記録も含む）</li>
              <li>チェックイン履歴</li>
            </ul>
            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAgreed}
                onChange={(e) => setDeleteAgreed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">
                上記の内容をすべて削除することに同意します
              </span>
            </label>
            {deleteError && (
              <p className="text-sm text-red-500 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteAgreed(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={!deleteAgreed || isDeleting}
              >
                {isDeleting ? "処理中..." : "退会する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RedirectToWizard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-gray-500">プロフィールを設定しましょう</p>
      <Button asChild size="lg">
        <Link to="/profile/wizard">プロフィールを作成する</Link>
      </Button>
    </div>
  );
}
