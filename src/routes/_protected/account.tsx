import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import { deleteAccount } from "../../server/functions/profile";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_protected/account")({
  staticData: { title: "アカウント", hideBottomNav: true },
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  return (
    <>
      <div className="flex-1 p-6 flex flex-col gap-8">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-700">ログアウト</h2>
            <p className="text-xs text-gray-500">
              このデバイスからサインアウトします。
            </p>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              ログアウト
            </Button>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-700">退会</h2>
            <p className="text-xs text-gray-500">
              アカウントとすべてのデータを削除します。元に戻せません。
            </p>
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:bg-red-50 hover:text-red-600"
              onClick={() => setShowDeleteModal(true)}
            >
              退会する
            </Button>
          </section>
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-3">退会の確認</h2>
              <p className="text-sm text-gray-600 mb-3">
                退会すると、あなたが入力したデータや築いたつながりはすべて削除され、元に戻せません。印刷・共有済みのQRコードも使えなくなります。
              </p>
              <p className="text-sm text-gray-600 mb-4">
                ただし、あなたが作成したイベントは記録として残ります（あなた自身の情報は消えます）。
              </p>
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
    </>
  );
}
