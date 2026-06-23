import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { useState } from "react";
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

const schema = z
  .object({
    name: z.string().min(1, "イベント名を入力してください").max(100),
    venueName: z.string().min(1, "会場名を入力してください").max(100),
    eventDate: z.string().min(1, "日付を選択してください"),
    eventTime: z.string().optional(),
    eventEndDate: z.string().optional(),
    eventEndTime: z.string().optional(),
    showTime: z.boolean(),
    description: z.string().max(1000).optional(),
  })
  .refine((d) => !d.eventEndDate || d.eventEndDate >= d.eventDate, {
    message: "終了日は開始日以降にしてください",
    path: ["eventEndDate"],
  });

type FormValues = z.infer<typeof schema>;

function EditEventPage() {
  const { event } = Route.useLoaderData();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
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
      setSubmitError(err instanceof Error ? err.message : "更新に失敗しました");
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
      setDeleteError(err instanceof Error ? err.message : "削除に失敗しました");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.history.back()}
          aria-label="戻る"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Button>
        <h1 className="text-lg font-bold">イベントを編集</h1>
      </div>

      <main className="flex-1 p-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="name">
                イベント名
              </label>
              <Input id="name" type="text" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="venueName">
                会場名
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
                  開始日
                </label>
                <Input id="eventDate" type="date" {...register("eventDate")} />
                {errors.eventDate && (
                  <p className="text-xs text-red-500">
                    {errors.eventDate.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium" htmlFor="eventEndDate">
                  終了日{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    （任意）
                  </span>
                </label>
                <Input
                  id="eventEndDate"
                  type="date"
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
                onCheckedChange={(v) => setValue("showTime", v)}
              />
              <span className="text-sm">時刻を追加</span>
            </label>

            {showTime && (
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium" htmlFor="eventTime">
                    開始時刻
                  </label>
                  <Input
                    id="eventTime"
                    type="time"
                    {...register("eventTime")}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium" htmlFor="eventEndTime">
                    終了時刻{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      （任意）
                    </span>
                  </label>
                  <Input
                    id="eventEndTime"
                    type="time"
                    {...register("eventEndTime")}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="description">
                説明{" "}
                <span className="text-xs text-gray-400 font-normal">
                  （任意）
                </span>
              </label>
              <div className="relative">
                <Textarea
                  id="description"
                  {...register("description")}
                  aria-invalid={!!errors.description}
                  maxLength={1000}
                  placeholder="イベントの詳細・注意事項など"
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
            URLは変更されません。既存のQRコードは引き続き有効です。
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
            {isSubmitting ? "保存中..." : "保存する"}
          </Button>
        </form>

        <div className="pt-4 border-t flex justify-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-gray-400 underline hover:text-red-500"
          >
            このイベントを削除する
          </button>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">イベントの削除</h2>
            <p className="text-sm text-gray-600 mb-4">
              イベントとすべての参加履歴を削除します。この操作は取り消せません。
            </p>
            <label
              htmlFor="event-delete-agree"
              className="flex items-start gap-2 mb-4 cursor-pointer"
            >
              <Checkbox
                id="event-delete-agree"
                checked={deleteAgreed}
                onCheckedChange={(c) => setDeleteAgreed(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm">削除することに同意します</span>
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
                onClick={handleDelete}
                disabled={!deleteAgreed || isDeleting}
              >
                {isDeleting ? "削除中..." : "削除する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
