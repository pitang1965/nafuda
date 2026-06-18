import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { capture } from "@/lib/analytics";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createPersona,
  getOwnProfile,
} from "../../../server/functions/profile";
import {
  PURPOSE_CONFIGS,
  PURPOSE_PICKER_ORDER,
  purposeLabelPlaceholder,
  purposeEditTagLabel,
  purposeEditTagHint,
  type PurposeId,
} from "@/lib/purpose";
import { OshiTagInput } from "../../../components/OshiTagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_protected/profile/wizard")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  loader: () => getOwnProfile(),
  component: WizardPage,
});

// Steps: 1=用途タイプ, 2=表示名/ラベル, 3=推しタグ, 4=完了

const WizardSchema = z.object({
  displayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(50, "50文字以下"),
  label: z.string().max(20, "20文字以下").optional().or(z.literal("")),
  oshiTags: z.array(z.string()),
});

type WizardForm = z.infer<typeof WizardSchema>;

function WizardPage() {
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

  const methods = useForm<WizardForm>({
    resolver: zodResolver(WizardSchema),
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
      if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
        window.location.href = redirect;
      } else if (dest === "edit") {
        window.location.href = `/profile/edit?personaId=${persona.id}`;
      } else {
        window.location.href = "/me";
      }
    } catch {
      setSubmitError("エラーが発生しました。もう一度お試しください。");
    }
  };

  const steps = ["用途", "表示名", purposeEditTagLabel(purpose), "完了"];

  return (
    <main className="min-h-screen p-6 flex flex-col max-w-md mx-auto">
      <div className="mb-4">
        <Link to="/me" className="text-sm text-gray-400 hover:text-gray-600">
          ← トップに戻る
        </Link>
      </div>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i + 1 === step ? "bg-black text-white" : i + 1 < step ? "bg-gray-400 text-white" : "bg-gray-100 text-gray-400"}`}
            >
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="w-6 h-px bg-gray-200" />}
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
              <h2 className="text-xl font-bold">何のためのなふだ？</h2>
              <p className="text-sm text-gray-500">
                用途を選ぶと、なふだの見せ方がそれに合わせて変わります。あとから変更できます。
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
                        <span className="font-bold">{cfg.label}</span>
                        <span className="text-xs text-gray-500">
                          {cfg.description}
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
                次へ
              </Button>
            </div>
          )}

          {/* Step 2: Display name + label */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">表示名を決めましょう</h2>
              <p className="text-sm text-gray-500">
                本名は不要です。ハンドル名・ニックネームでOK。絵文字も使えます。
              </p>
              <div>
                <Input
                  {...register("displayName")}
                  placeholder="例：ゆきたん⭐"
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
                  ラベル{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    （自分だけが見る用途メモ・任意）
                  </span>
                </label>
                <div className="relative mt-1">
                  <Input
                    {...register("label")}
                    placeholder={purposeLabelPlaceholder(purpose)}
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
                  戻る
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
                  次へ
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Oshi tags */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">
                {purposeEditTagLabel(purpose)}を登録しましょう{" "}
                <span className="text-sm font-normal text-gray-400">
                  （任意）
                </span>
              </h2>
              <p className="text-sm text-gray-500">
                {purposeEditTagHint(purpose)}自由に入力できます。
                <br />
                入力して{" "}
                <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">
                  Enter
                </kbd>{" "}
                で追加、×で削除。複数登録OK。
              </p>
              <OshiTagInput name="oshiTags" />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  type="button"
                  onClick={handleProceedFromOshi}
                  className="flex-1"
                >
                  次へ
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm + submit */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">
                {isFromEvent ? "設定完了！" : "もうひといきです！"}
              </h2>
              <p className="text-sm text-gray-500">
                {isFromEvent
                  ? "なふだを作成してイベントに参加しましょう。"
                  : "SNSリンクや自己紹介を追加すると、より伝わるなふだになります。"}
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
                    戻る
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit((v) => onSubmit(v, "me"))()}
                    className="flex-1"
                  >
                    作成してイベントへ
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => handleSubmit((v) => onSubmit(v, "edit"))()}
                    className="w-full"
                  >
                    編集画面で仕上げる
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit((v) => onSubmit(v, "me"))()}
                    className="w-full"
                  >
                    あとで編集する
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 mt-1"
                  >
                    ← 戻る
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
