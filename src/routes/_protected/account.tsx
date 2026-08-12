import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import { deleteAccount } from "../../server/functions/profile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
              退会手続きに進む
            </Button>
          </section>
        </div>

        <AlertDialog
          open={showDeleteModal}
          onOpenChange={(o) => {
            if (!o) {
              setShowDeleteModal(false);
              setDeleteAgreed(false);
              setDeleteError(null);
            }
          }}
        >
          <AlertDialogContent className="sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>退会の確認</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    退会すると、あなたが入力したデータや築いたつながりはすべて削除され、元に戻せません。印刷・共有済みのQRコードも使えなくなります。
                  </p>
                  <p>
                    ただし、あなたが作成したイベントは記録として残ります（あなた自身の情報は消えます）。
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label
              htmlFor="delete-agree"
              className="flex items-start gap-2 cursor-pointer"
            >
              <Checkbox
                id="delete-agree"
                checked={deleteAgreed}
                onCheckedChange={(c) => setDeleteAgreed(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                上記の内容をすべて削除することに同意します
              </span>
            </label>
            {deleteError && (
              <p className="text-sm text-red-500">{deleteError}</p>
            )}
            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="flex-1" disabled={isDeleting}>
                キャンセル
              </AlertDialogCancel>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={!deleteAgreed || isDeleting}
              >
                {isDeleting ? "処理中..." : "退会する"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
