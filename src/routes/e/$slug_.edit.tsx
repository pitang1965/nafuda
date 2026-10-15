import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { useMemo, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth } from "../../server/auth";
import {
  getEventParticipants,
  updateEvent,
  deleteEvent,
} from "../../server/functions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useT, useLocale } from "../../lib/i18n/context";
import { LanguageToggle } from "../../components/LanguageToggle";

const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  return auth.api.getSession({ headers: request.headers });
});

export const Route = createFileRoute("/e/$slug_/edit")({
  loader: async ({ params }) => {
    const [data, session] = await Promise.all([
      getEventParticipants({ data: { token: params.slug } }),
      getSession(),
    ]);
    if (!data) throw new Error("Event not found");
    if (!session?.user || data.event.hostUserId !== session.user.id) {
      throw new Error("Forbidden");
    }
    return { event: data.event };
  },
  component: EditEventPage,
});

// バリデーションメッセージは t() を使うため、スキーマはコンポーネント内で生成する。
function createEditEventSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(1, t("eventForm.errorEventNameRequired")).max(100),
      venueName: z
        .string()
        .min(1, t("eventForm.errorVenueNameRequired"))
        .max(100),
      eventDate: z.string().min(1, t("eventForm.errorDateRequired")),
      eventTime: z.string().optional(),
      eventEndDate: z.string().optional(),
      eventEndTime: z.string().optional(),
      showTime: z.boolean(),
      description: z.string().max(1000).optional(),
    })
    .refine((d) => !d.eventEndDate || d.eventEndDate >= d.eventDate, {
      message: t("eventForm.errorEndDateBeforeStart"),
      path: ["eventEndDate"],
    });
}

type FormValues = z.infer<ReturnType<typeof createEditEventSchema>>;

function EditEventPage() {
  const t = useT();
  const { locale } = useLocale();
  const { event } = Route.useLoaderData();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    router.history.back();
  };

  // 保存値（UTC instant）から JST のウォールクロック文字列を取り出す（入力欄の初期値用）。
  // sv-SE ロケールは "YYYY-MM-DD" / "HH:MM" 形式を返すため date/time input にそのまま使える。
  const toJstDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const toJstTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString("sv-SE", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
    });
  const eventDateStr = toJstDate(event.eventDate);
  const eventTimeStr = event.showTime ? toJstTime(event.eventDate) : "";
  const eventEndDateStr = event.eventEndDate ? toJstDate(event.eventEndDate) : "";
  const eventEndTimeStr =
    event.eventEndDate && event.showTime ? toJstTime(event.eventEndDate) : "";

  // 言語切替への追従はせず、マウント時点のロケールでメッセージを固定する（意図的。wizard.tsxと同じ）。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => createEditEventSchema(t), []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: event.name,
      venueName: event.venueName ?? "",
      eventDate: eventDateStr,
      eventTime: eventTimeStr,
      eventEndDate: eventEndDateStr,
      eventEndTime: eventEndTimeStr,
      showTime: event.showTime,
      description: event.description ?? "",
    },
  });

  const showTime = useWatch({ control, name: "showTime", defaultValue: false });
  const description =
    useWatch({ control, name: "description", defaultValue: "" }) ?? "";

  const onSubmit: SubmitHandler<FormValues> = async (formData) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateEvent({
        data: {
          token: event.shareToken,
          name: formData.name,
          venueName: formData.venueName,
          eventDate: formData.eventDate,
          eventTime: formData.eventTime,
          eventEndDate: formData.eventEndDate || undefined,
          eventEndTime: formData.eventEndTime || undefined,
          showTime: formData.showTime,
          description: formData.description || null,
        },
      });
      await router.navigate({
        to: "/e/$slug",
        params: { slug: event.shareToken },
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("eventEdit.updateFailedGeneric"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent({ data: { token: event.shareToken } });
      await router.navigate({ to: "/events", replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : t("eventEdit.deleteFailedGeneric"),
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleBack}
          aria-label={t("common.back")}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">{t("eventEdit.title")}</h1>
        <LanguageToggle />
      </div>

      <main className="flex-1 p-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="name">
                {t("eventForm.eventNameLabel")}
              </label>
              <Input id="name" type="text" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="venueName">
                {t("eventForm.venueNameLabel")}
              </label>
              <Input id="venueName" type="text" {...register("venueName")} />
              {errors.venueName && (
                <p className="text-xs text-red-500">
                  {errors.venueName.message}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium" htmlFor="eventDate">
                  {t("eventForm.startDateLabel")}
                </label>
                <Input
                  id="eventDate"
                  type="date"
                  lang={locale}
                  {...register("eventDate")}
                />
                {errors.eventDate && (
                  <p className="text-xs text-red-500">
                    {errors.eventDate.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium" htmlFor="eventEndDate">
                  {t("eventForm.endDateLabel")}{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    {t("wizard.optional")}
                  </span>
                </label>
                <Input
                  id="eventEndDate"
                  type="date"
                  lang={locale}
                  {...register("eventEndDate")}
                />
                {errors.eventEndDate && (
                  <p className="text-xs text-red-500">
                    {errors.eventEndDate.message}
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={showTime}
                onCheckedChange={(v) =>
                  setValue("showTime", v, { shouldDirty: true })
                }
              />
              <span className="text-sm">{t("eventForm.addTime")}</span>
            </label>

            {showTime && (
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium" htmlFor="eventTime">
                    {t("eventForm.startTimeLabel")}
                  </label>
                  <Input
                    id="eventTime"
                    type="time"
                    lang={locale}
                    {...register("eventTime")}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium" htmlFor="eventEndTime">
                    {t("eventForm.endTimeLabel")}{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      {t("wizard.optional")}
                    </span>
                  </label>
                  <Input
                    id="eventEndTime"
                    type="time"
                    lang={locale}
                    {...register("eventEndTime")}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="description">
                {t("eventForm.descriptionLabel")}{" "}
                <span className="text-xs text-gray-400 font-normal">
                  {t("wizard.optional")}
                </span>
              </label>
              <div className="relative">
                <Textarea
                  id="description"
                  {...register("description")}
                  aria-invalid={!!errors.description}
                  maxLength={1000}
                  placeholder={t("eventForm.descriptionPlaceholder")}
                  className="pb-6"
                />
                <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                  {description.length}/1000
                </span>
              </div>
              {errors.description && (
                <p className="text-xs text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground px-1">
            {t("eventEdit.urlUnchangedHint")}
          </p>

          {submitError && (
            <p className="text-sm text-red-600 px-1">{submitError}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full rounded-xl"
          >
            {isSubmitting ? t("edit.saving") : t("edit.save")}
          </Button>
        </form>

        <div className="pt-4 border-t flex justify-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-gray-400 underline hover:text-red-500"
          >
            {t("eventEdit.deleteThisEvent")}
          </button>
        </div>
      </main>

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
            <AlertDialogTitle>{t("eventEdit.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("eventEdit.deleteDialogBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label
            htmlFor="event-delete-agree"
            className="flex items-start gap-2 cursor-pointer"
          >
            <Checkbox
              id="event-delete-agree"
              checked={deleteAgreed}
              onCheckedChange={(c) => setDeleteAgreed(c === true)}
              className="mt-0.5"
            />
            <span className="text-sm">{t("eventEdit.deleteAgree")}</span>
          </label>
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1" disabled={isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={!deleteAgreed || isDeleting}
            >
              {isDeleting ? t("edit.deleting") : t("edit.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("edit.unsavedChangesTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("edit.unsavedChangesDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("edit.continueEditing")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => router.history.back()}
            >
              {t("edit.discardAndLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
