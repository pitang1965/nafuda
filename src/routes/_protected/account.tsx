import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import { deleteAccount } from "../../server/functions/profile";
import { useT } from "../../lib/i18n/context";
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
  staticData: { title: "menu.account", hideBottomNav: true },
  component: AccountPage,
});

function AccountPage() {
  const t = useT();
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
      setDeleteError(t("account.deleteFailedError"));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex-1 p-6 flex flex-col gap-8">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-700">
              {t("account.logoutHeading")}
            </h2>
            <p className="text-xs text-gray-500">
              {t("account.logoutDescription")}
            </p>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              {t("account.logoutButton")}
            </Button>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-700">
              {t("account.deleteHeading")}
            </h2>
            <p className="text-xs text-gray-500">
              {t("account.deleteDescription")}
            </p>
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:bg-red-50 hover:text-red-600"
              onClick={() => setShowDeleteModal(true)}
            >
              {t("account.deleteButton")}
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
              <AlertDialogTitle>{t("account.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>{t("account.confirmBody1")}</p>
                  <p>{t("account.confirmBody2")}</p>
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
              <span className="text-sm">{t("account.confirmAgree")}</span>
            </label>
            {deleteError && (
              <p className="text-sm text-red-500">{deleteError}</p>
            )}
            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="flex-1" disabled={isDeleting}>
                {t("account.cancel")}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={!deleteAgreed || isDeleting}
              >
                {isDeleting ? t("account.processing") : t("account.confirmDelete")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
