import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getOwnProfile } from "../../../server/functions/profile";
import { createEventAndCheckin } from "../../../server/functions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonaSwitcher } from "../../../components/PersonaSwitcher";
import { useT, useLocale } from "../../../lib/i18n/context";
import { getBrowserTimeZone, listTimeZones } from "../../../lib/timezone";

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

// バリデーションメッセージは t() を使うため、スキーマはコンポーネント内で生成する。
function createEventSchema(t: (key: string) => string) {
  return z
    .object({
      eventName: z
        .string()
        .min(1, t("eventForm.errorEventNameRequired"))
        .max(100),
      venueName: z
        .string()
        .min(1, t("eventForm.errorVenueNameRequired"))
        .max(100),
      eventDate: z.string().min(1, t("eventForm.errorDateRequired")),
      eventTime: z.string().optional(),
      eventEndDate: z.string().optional(),
      eventEndTime: z.string().optional(),
      showTime: z.boolean(),
      timezone: z.string().min(1),
      description: z.string().max(1000).optional(),
    })
    .refine((d) => !d.eventEndDate || d.eventEndDate >= d.eventDate, {
      message: t("eventForm.errorEndDateBeforeStart"),
      path: ["eventEndDate"],
    });
}

type FormValues = z.infer<ReturnType<typeof createEventSchema>>;

export const Route = createFileRoute("/_protected/events/new")({
  loader: async () => {
    const profile = await getOwnProfile();
    const defaultPersona =
      profile?.personas?.find((p) => p.isDefault) ?? profile?.personas?.[0];
    return { personaId: defaultPersona?.id ?? null, personas: profile?.personas ?? [] };
  },
  staticData: { title: "events.createTitle" },
  component: NewEventPage,
});

function NewEventPage() {
  const t = useT();
  const { locale } = useLocale();
  const { personaId: defaultPersonaId, personas } = Route.useLoaderData();
  const [selectedPersonaId, setSelectedPersonaId] = useState(defaultPersonaId);
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 言語切替への追従はせず、マウント時点のロケールでメッセージを固定する（意図的。wizard.tsxと同じ）。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => createEventSchema(t), []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // タイムゾーンはサーバーでは判定できない（Workersの実行タイムゾーンとブラウザの
    // タイムゾーンが異なるため）。空のままSSRし、マウント後にブラウザの検出値へ更新する
    // （hydration時にSelectの表示が不一致になるのを避ける）。
    defaultValues: { showTime: false, timezone: "" },
  });

  const showTime = useWatch({ control, name: "showTime", defaultValue: false });
  const description =
    useWatch({ control, name: "description", defaultValue: "" }) ?? "";
  const timezone = useWatch({ control, name: "timezone", defaultValue: "" });
  const timeZoneOptions = useMemo(() => listTimeZones(), []);

  useEffect(() => {
    setValue("timezone", getBrowserTimeZone());
  }, [setValue]);

  const onSubmit = async (formData: FormValues) => {
    if (!selectedPersonaId) {
      setSubmitError(t("eventForm.noPersonaError"));
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
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
          timezone: formData.timezone,
          description: formData.description || null,
          personaId: selectedPersonaId,
          hostPersonaId: selectedPersonaId,
        },
      });
      await router.navigate({
        to: "/e/$slug",
        params: { slug: result.event.shareToken },
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("eventForm.createFailedGeneric"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6">
        {personas.length > 1 && selectedPersonaId && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t("eventForm.participatingPersonaLabel")}</span>
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
                {t("eventForm.eventNameLabel")}
              </label>
              <Input
                id="eventName"
                type="text"
                placeholder={t("eventForm.eventNamePlaceholder")}
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
                {t("eventForm.venueNameLabel")}
              </label>
              <Input
                id="venueName"
                type="text"
                placeholder={t("eventForm.venueNamePlaceholder")}
                {...register("venueName")}
              />
              {errors.venueName && (
                <p className="text-xs text-red-500">
                  {errors.venueName.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="timezone">
                {t("eventForm.timezoneLabel")}
              </label>
              <Select
                value={timezone}
                onValueChange={(v) =>
                  setValue("timezone", v, { shouldDirty: true })
                }
              >
                <SelectTrigger id="timezone" className="w-full bg-white">
                  <SelectValue
                    placeholder={t("eventForm.timezoneDetecting")}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {timeZoneOptions.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                {t("eventForm.timezoneHint")}
              </p>
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
                onCheckedChange={(v) => setValue("showTime", v)}
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
            {isSubmitting ? t("eventForm.creating") : t("eventForm.submitButton")}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t("eventForm.afterCreateHint")}
          </p>
        </form>
    </div>
  );
}
