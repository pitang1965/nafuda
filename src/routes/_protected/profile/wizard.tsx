import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { capture } from "@/lib/analytics";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createPersona,
  getOwnProfile,
} from "../../../server/functions/profile";
import {
  PURPOSE_PICKER_ORDER,
  purposeLabel,
  purposeDescription,
  purposeLabelPlaceholder,
  purposeEditTagLabel,
  purposeEditTagHint,
  PURPOSE_CONFIGS,
  type PurposeId,
} from "@/lib/purpose";
import { OshiTagInput } from "../../../components/OshiTagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT, useLocale } from "../../../lib/i18n/context";
import { LanguageToggle } from "../../../components/LanguageToggle";

export const Route = createFileRoute("/_protected/profile/wizard")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  loader: () => getOwnProfile(),
  // 初回オンボーディングの多段フロー。独自の内部ナビを持つため、シェルの
  // ヘッダー/ボトムナビを被せず全画面で表示する。
  staticData: { hideChrome: true },
  component: WizardPage,
});

// Steps: 1=用途タイプ, 2=表示名/ラベル, 3=推しタグ, 4=完了

// バリデーションメッセージは t() を使うため、スキーマはコンポーネント内で生成する。
function createWizardSchema(t: (key: string) => string) {
  return z.object({
    displayName: z
      .string()
      .min(1, t("wizard.errorDisplayNameRequired"))
      .max(50, t("wizard.errorDisplayNameMax")),
    label: z.string().max(20, t("wizard.errorLabelMax")).optional().or(z.literal("")),
    oshiTags: z.array(z.string()),
  });
}

type WizardForm = z.infer<ReturnType<typeof createWizardSchema>>;

function WizardPage() {
  const t = useT();
  const { locale } = useLocale();
  const { personas } = Route.useLoaderData();
  const { redirect } = Route.useSearch();
  const isFromEvent = redirect?.startsWith("/e/") ?? false;
  const isFirstPersona = personas.length === 0;
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState<PurposeId | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    capture("wizard_started", { is_first_persona: isFirstPersona });
  }, [isFirstPersona]);

  // 言語切替への追従はせず、マウント時点のロケールでメッセージを固定する（意図的）。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wizardSchema = useMemo(() => createWizardSchema(t), []);

  const methods = useForm<WizardForm>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      oshiTags: [],
      label: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods;

  const displayName =
    useWatch({ control: methods.control, name: "displayName" }) ?? "";
  const label = useWatch({ control: methods.control, name: "label" }) ?? "";

  // 用途タイプを選んだら、ラベルが未編集のときだけ初期値を seed する。
  // 一度でもユーザーがラベルを触っていたら上書きしない（ADR-0010）。
  const handleSelectPurpose = (p: PurposeId) => {
    setPurpose(p);
    if (!methods.getFieldState("label", methods.formState).isDirty) {
      methods.setValue("label", PURPOSE_CONFIGS[p].labelSeed, {
        shouldDirty: false,
      });
    }
  };

  const handleProceedFromOshi = () => {
    capture("wizard_step_completed", { step: 3 });
    setStep(4);
  };

  const onSubmit = async (values: WizardForm, dest: "me" | "edit" = "edit") => {
    if (!purpose) {
      setStep(1);
      return;
    }
    setSubmitError(null);
    try {
      const persona = await createPersona({
        data: {
          displayName: values.displayName,
          label: values.label || null,
          purpose,
          isDefault: isFirstPersona,
          oshiTags: values.oshiTags,
        },
      });
      capture("wizard_completed", {
        is_first_persona: isFirstPersona,
        purpose,
      });
      // 作成直後は /me でこの新しいなふだを表示したい。Cookie を更新しないと
      // 直前まで見ていた既存なふだが initialPersonaId に採用されてしまう。
      document.cookie = `nafuda_last_persona_id=${persona.id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
        window.location.href = redirect;
      } else if (dest === "edit") {
        window.location.href = `/profile/edit?personaId=${persona.id}`;
      } else {
        window.location.href = "/me";
      }
    } catch {
      setSubmitError(t("wizard.submitErrorGeneric"));
    }
  };

  const STEP_COUNT = 4;

  return (
    <main className="min-h-screen p-6 flex flex-col max-w-md mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/me"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="size-4" />
          {t("wizard.backToTop")}
        </Link>
        <LanguageToggle />
      </div>
      {/* Step indicator（番号のみ表示。文言は画面に出ない） */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i + 1 === step ? "bg-black text-white" : i + 1 < step ? "bg-gray-400 text-white" : "bg-gray-100 text-gray-400"}`}
            >
              {i + 1}
            </div>
            {i < STEP_COUNT - 1 && <div className="w-6 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <FormProvider {...methods}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-6"
        >
          {/* Step 1: Purpose */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">{t("wizard.step1Title")}</h2>
              <p className="text-sm text-gray-500">
                {t("wizard.step1Description")}
              </p>
              <div className="flex flex-col gap-2">
                {PURPOSE_PICKER_ORDER.map((id) => {
                  const cfg = PURPOSE_CONFIGS[id];
                  const selected = purpose === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectPurpose(id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition
                      ${selected ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:border-gray-400"}`}
                    >
                      <span className="text-2xl">{cfg.emoji}</span>
                      <span className="flex flex-col">
                        <span className="font-bold">
                          {purposeLabel(id, locale)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {purposeDescription(id, locale)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (purpose) {
                    capture("wizard_step_completed", { step: 1, purpose });
                    setStep(2);
                  }
                }}
                disabled={!purpose}
                size="lg"
                className="w-full"
              >
                {t("wizard.next")}
              </Button>
            </div>
          )}

          {/* Step 2: Display name + label */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">{t("wizard.step2Title")}</h2>
              <p className="text-sm text-gray-500">
                {t("wizard.step2Description")}
              </p>
              <div>
                <Input
                  {...register("displayName")}
                  placeholder={t("wizard.displayNamePlaceholder")}
                  className="h-12"
                />
                {errors.displayName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.displayName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("wizard.labelFieldLabel")}{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    {t("wizard.labelFieldHint")}
                  </span>
                </label>
                <div className="relative mt-1">
                  <Input
                    {...register("label")}
                    placeholder={purposeLabelPlaceholder(purpose, locale)}
                    maxLength={20}
                    className="h-12 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {label.length}/20
                  </span>
                </div>
                {errors.label && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.label.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  {t("common.back")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (displayName.trim()) {
                      capture("wizard_step_completed", { step: 2 });
                      setStep(3);
                    }
                  }}
                  disabled={!displayName.trim()}
                  className="flex-1"
                >
                  {t("wizard.next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Oshi tags */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">
                {t("wizard.step3Title", {
                  tagLabel: purposeEditTagLabel(purpose, locale),
                })}{" "}
                <span className="text-sm font-normal text-gray-400">
                  {t("wizard.optional")}
                </span>
              </h2>
              <p className="text-sm text-gray-500">
                {t("wizard.step3Hint", {
                  tagHint: purposeEditTagHint(purpose, locale),
                })}
                <br />
                {t("wizard.pressEnterPrefix")}
                <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">
                  Enter
                </kbd>
                {t("wizard.pressEnterSuffix")}
              </p>
              <OshiTagInput name="oshiTags" purpose={purpose} />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  {t("common.back")}
                </Button>
                <Button
                  type="button"
                  onClick={handleProceedFromOshi}
                  className="flex-1"
                >
                  {t("wizard.next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm + submit */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">
                {isFromEvent
                  ? t("wizard.step4TitleFromEvent")
                  : t("wizard.step4TitleDefault")}
              </h2>
              <p className="text-sm text-gray-500">
                {isFromEvent
                  ? t("wizard.step4DescriptionFromEvent")
                  : t("wizard.step4DescriptionDefault")}
              </p>
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {isFromEvent ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="flex-1"
                  >
                    {t("common.back")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit((v) => onSubmit(v, "me"))()}
                    className="flex-1"
                  >
                    {t("wizard.createAndGoToEvent")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => handleSubmit((v) => onSubmit(v, "edit"))()}
                    className="w-full"
                  >
                    {t("wizard.finishInEditor")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit((v) => onSubmit(v, "me"))()}
                    className="w-full"
                  >
                    {t("wizard.finishLater")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mt-1"
                  >
                    <ChevronLeft className="size-4" />
                    <span className="underline underline-offset-2">
                      {t("common.back")}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </FormProvider>
    </main>
  );
}
