import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { capture } from "@/lib/analytics";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createPersona,
  getOwnProfile,
} from "../../../server/functions/profile";
import { InitialsAvatar } from "../../../components/InitialsAvatar";
import { OshiTagInput } from "../../../components/OshiTagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_protected/profile/wizard")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  loader: () => getOwnProfile(),
  component: WizardPage,
});

// Steps: 1=表示名, 2=推しタグ, 3=アバター, 4=完了

const WizardSchema = z.object({
  displayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(50, "50文字以下"),
  label: z.string().max(20, "20文字以下").optional().or(z.literal("")),
  oshiTags: z.array(z.string()),
  avatarUrl: z.url("有効なURLを入力してください").optional().or(z.literal("")),
  useAutoAvatar: z.boolean(),
});

type WizardForm = z.infer<typeof WizardSchema>;

function WizardPage() {
  const { personas } = Route.useLoaderData();
  const { redirect } = Route.useSearch();
  const isFromEvent = redirect?.startsWith("/e/") ?? false;
  const isFirstPersona = personas.length === 0;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    capture("wizard_started", { is_first_persona: isFirstPersona });
  }, [isFirstPersona]);

  const methods = useForm<WizardForm>({
    resolver: zodResolver(WizardSchema),
    defaultValues: {
      useAutoAvatar: true,
      oshiTags: [],
      label: isFirstPersona ? "メイン" : "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = methods;

  const displayName =
    useWatch({ control: methods.control, name: "displayName" }) ?? "";
  const label = useWatch({ control: methods.control, name: "label" }) ?? "";
  const useAutoAvatar = useWatch({
    control: methods.control,
    name: "useAutoAvatar",
  });
  const avatarUrl =
    useWatch({ control: methods.control, name: "avatarUrl" }) ?? "";

  const handleProceedFromOshi = () => {
    capture("wizard_step_completed", { step: 2 });
    setStep(3);
  };

  const onSubmit = async (values: WizardForm) => {
    setSubmitError(null);
    try {
      await createPersona({
        data: {
          displayName: values.displayName,
          label: values.label || null,
          avatarUrl: values.useAutoAvatar ? null : values.avatarUrl || null,
          isDefault: isFirstPersona,
          oshiTags: values.oshiTags,
        },
      });
      capture("wizard_completed", { is_first_persona: isFirstPersona });
      const safeRedirect =
        redirect?.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : null;
      if (safeRedirect) {
        window.location.href = safeRedirect;
      } else {
        navigate({ to: "/me" });
      }
    } catch {
      setSubmitError("エラーが発生しました。もう一度お試しください。");
    }
  };

  const steps = ["表示名", "推し / 趣味タグ", "アバター", "完了"];

  return (
    <div className="min-h-screen p-6 flex flex-col max-w-md mx-auto">
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Step 1: Display name */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">表示名を決めましょう</h2>
              <p className="text-sm text-gray-500">
                本名は不要です。ハンドル名・ニックネームでOK。絵文字も使えます。
              </p>
              <div>
                <Input
                  {...register("displayName")}
                  placeholder="ぴたんこ🐾"
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
                    placeholder="例: 推し活用・仕事用"
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
              <Button
                type="button"
                onClick={() => {
                  if (displayName.trim()) {
                    capture("wizard_step_completed", { step: 1 });
                    setStep(2);
                  }
                }}
                disabled={!displayName.trim()}
                size="lg"
                className="w-full"
              >
                次へ
              </Button>
            </div>
          )}

          {/* Step 2: Oshi tags */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">
                趣味・推し・ジャンルを登録しましょう{" "}
                <span className="text-sm font-normal text-gray-400">
                  （任意）
                </span>
              </h2>
              <p className="text-sm text-gray-500">
                推しの名前・グループ名・趣味・ジャンルなど自由に入力できます。
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
                  onClick={() => setStep(1)}
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

          {/* Step 3: Avatar */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">アバターを設定しましょう</h2>
              <div className="flex justify-center">
                {!useAutoAvatar && avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar name={displayName || "?"} size={80} />
                )}
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={useAutoAvatar}
                    onCheckedChange={(v) => setValue("useAutoAvatar", v)}
                  />
                  <span className="text-sm">
                    イニシャルアバターを使う（表示名の頭文字＋カラー）
                  </span>
                </label>
                {!useAutoAvatar && (
                  <div>
                    <Input
                      {...register("avatarUrl")}
                      placeholder="https://example.com/avatar.png"
                      className="h-12"
                    />
                    {errors.avatarUrl && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.avatarUrl.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
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
                  onClick={() => {
                    capture("wizard_step_completed", { step: 3 });
                    setStep(4);
                  }}
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
              <h2 className="text-xl font-bold">設定完了！</h2>
              <p className="text-sm text-gray-500">
                {isFromEvent
                  ? "なふだを作成してイベントに参加しましょう。"
                  : "なふだを作成して始めましょう。"}
              </p>
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {submitError}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button type="submit" className="flex-1">
                  {isFromEvent ? "作成してイベントへ" : "なふだを作成"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  );
}
