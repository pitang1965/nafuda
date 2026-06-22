import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getOwnProfile } from "../../../server/functions/profile";
import { createEventAndCheckin } from "../../../server/functions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PersonaSwitcher } from "../../../components/PersonaSwitcher";

async function getGpsCoords(): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ x: pos.coords.longitude, y: pos.coords.latitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: false },
    );
  });
}

function generateSlug(eventName: string, eventDate: string): string {
  const datePart = eventDate.replace(/-/g, "");
  const namePart = eventName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
  return `${namePart}-${datePart}`;
}

const schema = z
  .object({
    eventName: z.string().min(1, "イベント名を入力してください").max(100),
    venueName: z.string().min(1, "会場名を入力してください").max(100),
    eventDate: z.string().min(1, "日付を選択してください"),
    eventTime: z.string().optional(),
    eventEndDate: z.string().optional(),
    eventEndTime: z.string().optional(),
    showTime: z.boolean(),
    description: z.string().max(1000).optional(),
  })
  .refine(
    (d) => !d.eventEndDate || d.eventEndDate >= d.eventDate,
    { message: "終了日は開始日以降にしてください", path: ["eventEndDate"] },
  );

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/_protected/events/new")({
  loader: async () => {
    const profile = await getOwnProfile();
    const defaultPersona =
      profile?.personas?.find((p) => p.isDefault) ?? profile?.personas?.[0];
    return { personaId: defaultPersona?.id ?? null, personas: profile?.personas ?? [] };
  },
  staticData: { title: "イベントを作成" },
  component: NewEventPage,
});

function NewEventPage() {
  const { personaId: defaultPersonaId, personas } = Route.useLoaderData();
  const [selectedPersonaId, setSelectedPersonaId] = useState(defaultPersonaId);
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { showTime: false },
  });

  const showTime = useWatch({ control, name: "showTime", defaultValue: false });
  const description =
    useWatch({ control, name: "description", defaultValue: "" }) ?? "";

  const onSubmit = async (formData: FormValues) => {
    if (!selectedPersonaId) {
      setSubmitError("なふだが見つかりません。なふだを作成してください。");
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const gps = await getGpsCoords();
      const slug = generateSlug(formData.eventName, formData.eventDate);
      const result = await createEventAndCheckin({
        data: {
          slug,
          eventName: formData.eventName,
          venueName: formData.venueName,
          eventDate: formData.eventDate,
          eventTime: formData.eventTime,
          eventEndDate: formData.eventEndDate || undefined,
          eventEndTime: formData.eventEndTime || undefined,
          showTime: formData.showTime,
          description: formData.description || null,
          personaId: selectedPersonaId,
          hostPersonaId: selectedPersonaId,
          gpsCoordinates: gps ?? undefined,
        },
      });
      await router.navigate({
        to: "/e/$slug",
        params: { slug: result.event.shareToken },
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "イベントの作成に失敗しました",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6">
        {personas.length > 1 && selectedPersonaId && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>参加なふだ：</span>
            <PersonaSwitcher
              personas={personas}
              currentPersonaId={selectedPersonaId}
              onSwitch={setSelectedPersonaId}
              onCreateNew={() => router.navigate({ to: "/profile/wizard" })}
            />
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="eventName">
                イベント名
              </label>
              <Input
                id="eventName"
                type="text"
                placeholder="例: コミックマーケット105"
                {...register("eventName")}
              />
              {errors.eventName && (
                <p className="text-xs text-red-500">
                  {errors.eventName.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="venueName">
                会場名
              </label>
              <Input
                id="venueName"
                type="text"
                placeholder="例: 東京ビッグサイト"
                {...register("venueName")}
              />
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
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-red-600 px-1">{submitError}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full rounded-xl"
          >
            {isSubmitting ? "作成中..." : "イベントを作成する"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            作成後、QRコード付きイベントページに移動します
          </p>
        </form>
    </div>
  );
}
