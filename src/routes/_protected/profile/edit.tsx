import {
  createFileRoute,
  useNavigate,
  useRouter,
  Link,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getOwnProfile,
  updatePersona,
  upsertSnsLink,
  deleteSnsLink,
  setNafudaLinks,
  deletePersona,
} from "../../../server/functions/profile";
import { NAFUDA_STYLES } from "../../../lib/nafuda-styles";
import {
  PURPOSE_CONFIGS,
  PURPOSE_PICKER_ORDER,
  purposeLabelPlaceholder,
  purposeEditTagLabel,
  purposeEditTagHint,
  purposeShowsDojinReject,
  orderPlatformsByPurpose,
  isPurposeId,
  type PurposeId,
} from "@/lib/purpose";
import {
  updateOshiTags,
  updateDojinReject,
} from "../../../server/functions/oshi";
import { AvatarUpload } from "../../../components/AvatarUpload";
import { GalleryUpload } from "../../../components/GalleryUpload";
import { OshiTagInput } from "../../../components/OshiTagInput";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_protected/profile/edit")({
  validateSearch: (search: Record<string, unknown>) => ({
    personaId:
      typeof search.personaId === "string" ? search.personaId : undefined,
  }),
  loader: () => getOwnProfile(),
  staleTime: 0,
  component: EditPage,
});

const PLATFORMS = [
  { value: "x", label: "X (Twitter)" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "discord", label: "Discord" },
  { value: "line_openchat", label: "LINEオープンチャット" },
  { value: "github", label: "GitHub" },
  { value: "spotify", label: "Spotify" },
  { value: "facebook", label: "Facebook" },
  { value: "minkara", label: "みんカラ" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "note", label: "note" },
  { value: "pixiv", label: "pixiv" },
  { value: "other", label: "その他" },
] as const;

type Platform = (typeof PLATFORMS)[number]["value"];

// Platforms where a bare username can be entered (no https:// required)
const USERNAME_BASE: Partial<Record<Platform, string>> = {
  x: "https://x.com/",
  instagram: "https://instagram.com/",
  tiktok: "https://tiktok.com/@",
  youtube: "https://youtube.com/@",
  github: "https://github.com/",
  minkara: "https://minkara.carview.co.jp/userid/",
  linkedin: "https://www.linkedin.com/in/",
  note: "https://note.com/",
  pixiv: "https://www.pixiv.net/users/",
};

function normalizeUrl(platform: Platform, input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("http")) return trimmed;
  const base = USERNAME_BASE[platform];
  return base ? `${base}${trimmed}` : trimmed;
}

function getSnsPlaceholder(platform: Platform): string {
  if (platform in USERNAME_BASE) return "ユーザー名 または https://...";
  if (platform === "discord") return "https://discord.gg/...";
  if (platform === "line_openchat") return "https://line.me/ti/g2/...";
  if (platform === "facebook")
    return "https://www.facebook.com/groups/... または https://www.facebook.com/...";
  return "https://...";
}

interface SnsLinkState {
  id?: string;
  platform: Platform;
  url: string;
  title: string;
  displayOrder: number;
  isNew: boolean;
}

const EditSchema = z.object({
  displayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(50, "50文字以下"),
  label: z.string().max(20, "20文字以下").optional().or(z.literal("")),
  bio: z.string().max(200, "200文字以下").optional().or(z.literal("")),
  displayNameVisibility: z.enum(["public", "private"]),
  bioVisibility: z.enum(["public", "private"]),
  avatarVisibility: z.enum(["public", "private"]),
  snsLinksVisibility: z.enum(["public", "private"]),
  oshiTagsVisibility: z.enum(["public", "private"]),
  galleryVisibility: z.enum(["public", "private"]),
  // oshiTags managed via OshiTagInput (FormProvider context) — RHF field
  oshiTags: z.array(z.string()),
  // dojinReject stored as string in radio input, converted to boolean on save
  dojinReject: z.enum(["false", "true"]),
});

type EditForm = z.infer<typeof EditSchema>;

function VisibilityToggle({
  value,
  onChange,
  label,
}: {
  value: "public" | "private";
  onChange: (v: "public" | "private") => void;
  label: string;
}) {
  const isPublic = value === "public";
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <span
        className={cn(
          "text-xs",
          isPublic ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {isPublic ? "公開" : "非公開"}
      </span>
      <Switch
        checked={isPublic}
        onCheckedChange={(checked) => onChange(checked ? "public" : "private")}
        aria-label={`${label}の公開設定`}
      />
    </label>
  );
}

function EditPage() {
  const navigate = useNavigate();
  const { personas, urlId } = Route.useLoaderData();
  const { personaId: searchPersonaId } = Route.useSearch();

  const defaultPersona =
    personas.find((p) =>
      searchPersonaId ? p.id === searchPersonaId : p.isDefault,
    ) ?? personas[0];

  if (!defaultPersona || !urlId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-gray-500">なふだがまだ設定されていません</p>
        <Button onClick={() => navigate({ to: "/profile/wizard" })} size="lg">
          なふだを作成する
        </Button>
      </main>
    );
  }

  const visibility = (defaultPersona.fieldVisibility ?? {}) as Record<
    string,
    string
  >;

  return (
    <EditForm
      personaId={defaultPersona.id}
      personaCount={personas.length}
      initialDisplayName={defaultPersona.displayName}
      initialLabel={defaultPersona.label ?? ""}
      initialPurpose={defaultPersona.purpose ?? null}
      initialBio={defaultPersona.bio ?? ""}
      initialAvatarUrl={defaultPersona.avatarUrl ?? ""}
      initialDisplayNameVisibility={
        (visibility.display_name as "public" | "private") ?? "public"
      }
      initialBioVisibility={
        (visibility.bio as "public" | "private") ?? "public"
      }
      initialAvatarVisibility={
        (visibility.avatar_url as "public" | "private") ?? "public"
      }
      initialSnsLinksVisibility={
        (visibility.sns_links as "public" | "private") ?? "public"
      }
      initialOshiTagsVisibility={
        (visibility.oshi_tags as "public" | "private") ?? "public"
      }
      initialGalleryVisibility={
        (visibility.gallery as "public" | "private") ?? "public"
      }
      initialOshiTags={defaultPersona.oshiTags}
      initialDojinReject={defaultPersona.dojinReject}
      initialSnsLinks={defaultPersona.snsLinks}
      initialGalleryPhotos={defaultPersona.galleryPhotos}
      initialNafudaLinks={defaultPersona.nafudaLinks}
      otherPersonas={personas
        .filter((p) => p.id !== defaultPersona.id)
        .map((p) => ({
          id: p.id,
          displayName: p.displayName,
          label: p.label ?? null,
          avatarUrl: p.avatarUrl ?? null,
        }))}
      initialStyleId={defaultPersona.styleId ?? null}
    />
  );
}

function EditForm({
  personaId,
  personaCount,
  initialDisplayName,
  initialLabel,
  initialPurpose,
  initialBio,
  initialAvatarUrl,
  initialDisplayNameVisibility,
  initialBioVisibility,
  initialAvatarVisibility,
  initialSnsLinksVisibility,
  initialOshiTagsVisibility,
  initialGalleryVisibility,
  initialOshiTags,
  initialDojinReject,
  initialSnsLinks,
  initialGalleryPhotos,
  initialNafudaLinks,
  otherPersonas,
  initialStyleId,
}: {
  personaId: string;
  personaCount: number;
  initialDisplayName: string;
  initialLabel: string;
  initialPurpose: string | null;
  initialBio: string;
  initialAvatarUrl: string;
  initialDisplayNameVisibility: "public" | "private";
  initialBioVisibility: "public" | "private";
  initialAvatarVisibility: "public" | "private";
  initialSnsLinksVisibility: "public" | "private";
  initialOshiTagsVisibility: "public" | "private";
  initialGalleryVisibility: "public" | "private";
  initialOshiTags: string[];
  initialDojinReject: boolean;
  initialSnsLinks: {
    id: string;
    platform: string;
    url: string;
    title?: string | null;
    displayOrder: number;
  }[];
  initialGalleryPhotos: {
    id: string;
    imageUrl: string;
    caption: string | null;
    displayOrder: number;
  }[];
  initialNafudaLinks: {
    targetPersonaId: string;
    displayOrder: number;
    targetDisplayName: string;
    targetAvatarUrl: string | null;
  }[];
  otherPersonas: {
    id: string;
    displayName: string;
    label: string | null;
    avatarUrl: string | null;
  }[];
  initialStyleId: string | null;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 保存ボタンは最下部にあり、エラーバナーは上部にある。保存時にエラーが
  // 画面外だと気づけないため、エラー発生時にバナーを画面内へスクロールする。
  // tick はエラーを出すたびに必ず増やす——同じメッセージの再発生でも
  // （未修正のまま再度「保存」を押した場合でも）確実にスクロールさせるため。
  const saveErrorRef = useRef<HTMLDivElement>(null);
  const [errorTick, setErrorTick] = useState(0);
  const showSaveError = (msg: string) => {
    setSaveError(msg);
    setErrorTick((t) => t + 1);
  };
  useEffect(() => {
    if (errorTick > 0) {
      saveErrorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [errorTick]);
  const [snsLinks, setSnsLinks] = useState<SnsLinkState[]>(() =>
    initialSnsLinks.map((l) => ({
      id: l.id,
      platform: l.platform as Platform,
      url: l.url,
      title: l.title ?? "",
      displayOrder: l.displayOrder,
      isNew: false,
    })),
  );
  const [deletedLinkIds, setDeletedLinkIds] = useState<string[]>([]);
  // なふだリンク: リンク先 personaId の順序付き配列（ADR-0015）
  const [nafudaLinkTargets, setNafudaLinkTargets] = useState<string[]>(() =>
    initialNafudaLinks.map((l) => l.targetPersonaId),
  );
  const personaById = new Map(otherPersonas.map((p) => [p.id, p]));
  const availablePersonas = otherPersonas.filter(
    (p) => !nafudaLinkTargets.includes(p.id),
  );
  const [hasPendingOshiInput, setHasPendingOshiInput] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(
    initialStyleId,
  );
  const [styleDirty, setStyleDirty] = useState(false);
  const [purpose, setPurpose] = useState<PurposeId | null>(
    isPurposeId(initialPurpose) ? initialPurpose : null,
  );
  const [purposeDirty, setPurposeDirty] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isLastPersona = personaCount <= 1;
  // 用途タイプに応じて SNS プラットフォームのサジェスト順を並べ替える
  const orderedPlatforms = orderPlatformsByPurpose(PLATFORMS, purpose);

  const methods = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      displayName: initialDisplayName,
      label: initialLabel,
      bio: initialBio,
      displayNameVisibility: initialDisplayNameVisibility,
      bioVisibility: initialBioVisibility,
      avatarVisibility: initialAvatarVisibility,
      snsLinksVisibility: initialSnsLinksVisibility,
      oshiTagsVisibility: initialOshiTagsVisibility,
      galleryVisibility: initialGalleryVisibility,
      oshiTags: initialOshiTags,
      dojinReject: initialDojinReject ? "true" : "false",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = methods;

  const snsLinksDirty =
    deletedLinkIds.length > 0 ||
    snsLinks.some((l) => {
      if (l.isNew) return true;
      const orig = initialSnsLinks.find((o) => o.id === l.id);
      return (
        !orig ||
        orig.platform !== l.platform ||
        orig.url !== l.url ||
        (orig.title ?? "") !== l.title ||
        orig.displayOrder !== l.displayOrder
      );
    });
  const nafudaLinksDirty =
    nafudaLinkTargets.length !== initialNafudaLinks.length ||
    nafudaLinkTargets.some(
      (id, i) => initialNafudaLinks[i]?.targetPersonaId !== id,
    );
  const anyDirty =
    isDirty ||
    snsLinksDirty ||
    nafudaLinksDirty ||
    styleDirty ||
    purposeDirty ||
    hasPendingOshiInput;

  const handleBack = () => {
    if (anyDirty) {
      if (!window.confirm("保存されていない変更があります。戻りますか？"))
        return;
    }
    router.history.back();
  };

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || null);
  const displayName =
    useWatch({
      control,
      name: "displayName",
      defaultValue: initialDisplayName,
    }) ?? "";
  const bio = useWatch({ control, name: "bio", defaultValue: "" }) ?? "";
  const [displayNameVisibility, setDisplayNameVisibility] = useState(
    initialDisplayNameVisibility,
  );
  const [bioVisibility, setBioVisibility] = useState(initialBioVisibility);
  const [avatarVisibility, setAvatarVisibility] = useState(
    initialAvatarVisibility,
  );
  const [snsLinksVisibility, setSnsLinksVisibility] = useState(
    initialSnsLinksVisibility,
  );
  const [oshiTagsVisibility, setOshiTagsVisibility] = useState(
    initialOshiTagsVisibility,
  );
  const [galleryVisibility, setGalleryVisibility] = useState(
    initialGalleryVisibility,
  );

  const addSnsLink = () => {
    setSnsLinks((prev) => [
      ...prev,
      {
        title: "",
        // 用途タイプのサジェスト筆頭を新規リンクの初期プラットフォームにする
        platform: (orderedPlatforms[0]?.value ?? "x") as Platform,
        url: "",
        displayOrder: prev.length,
        isNew: true,
      },
    ]);
  };

  const handleSelectPurpose = (p: PurposeId) => {
    setPurpose(p);
    setPurposeDirty(true);
    // 既存ラベルは絶対に上書きしない。空のときだけ用途由来の初期値を seed する（ADR-0010）
    if (!methods.getValues("label")) {
      setValue("label", PURPOSE_CONFIGS[p].labelSeed, { shouldDirty: true });
    }
  };

  const removeSnsLink = (index: number) => {
    const link = snsLinks[index];
    if (link.id) {
      setDeletedLinkIds((prev) => [...prev, link.id!]);
    }
    setSnsLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSnsLink = (index: number, direction: "up" | "down") => {
    const newLinks = [...snsLinks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;
    [newLinks[index], newLinks[targetIndex]] = [
      newLinks[targetIndex],
      newLinks[index],
    ];
    setSnsLinks(newLinks.map((l, i) => ({ ...l, displayOrder: i })));
  };

  const addNafudaLink = (targetId: string) => {
    if (!targetId) return;
    setNafudaLinkTargets((prev) =>
      prev.includes(targetId) ? prev : [...prev, targetId],
    );
  };

  const removeNafudaLink = (targetId: string) => {
    setNafudaLinkTargets((prev) => prev.filter((id) => id !== targetId));
  };

  const moveNafudaLink = (index: number, direction: "up" | "down") => {
    const next = [...nafudaLinkTargets];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setNafudaLinkTargets(next);
  };

  const updateSnsLinkField = (
    index: number,
    field: "platform" | "url" | "title",
    value: string,
  ) => {
    setSnsLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    );
  };

  const onSubmit = async (values: EditForm) => {
    const otherWithoutTitle = snsLinks.find(
      (l) => l.platform === "other" && !l.title.trim() && l.url.trim(),
    );
    if (otherWithoutTitle) {
      showSaveError("「その他」のSNSリンクには表示名を入力してください。");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      // Update persona fields and visibility
      await updatePersona({
        data: {
          personaId,
          displayName: values.displayName,
          label: values.label || null,
          purpose,
          bio: values.bio || null,
          fieldVisibility: {
            display_name: values.displayNameVisibility,
            bio: values.bioVisibility,
            avatar_url: values.avatarVisibility,
            sns_links: values.snsLinksVisibility,
            oshi_tags: values.oshiTagsVisibility,
            gallery: values.galleryVisibility,
          },
          styleId: selectedStyleId,
        },
      });

      await updateOshiTags({ data: { personaId, tags: values.oshiTags } });

      await updateDojinReject({
        data: { personaId, dojinReject: values.dojinReject === "true" },
      });

      // Delete removed SNS links
      for (const linkId of deletedLinkIds) {
        await deleteSnsLink({ data: { linkId } });
      }

      // Upsert SNS links (normalize username inputs to full URLs before saving)
      for (const link of snsLinks) {
        if (!link.url.trim()) continue;
        await upsertSnsLink({
          data: {
            personaId,
            linkId: link.isNew ? undefined : link.id,
            platform: link.platform,
            url: normalizeUrl(link.platform, link.url),
            title: link.title.trim() || undefined,
            displayOrder: link.displayOrder,
          },
        });
      }

      // なふだリンク: 順序付きで一括設定（ADR-0015）
      if (nafudaLinksDirty) {
        await setNafudaLinks({
          data: { personaId, targetPersonaIds: nafudaLinkTargets },
        });
      }

      await router.invalidate();
      navigate({ to: "/me" });
    } catch (err) {
      // サーバーが投げた具体的なメッセージ（nafuda.me 拒否など）をそのまま表示する
      showSaveError(
        err instanceof Error
          ? err.message
          : "保存に失敗しました。もう一度お試しください。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePersona({ data: { personaId } });
      await router.invalidate();
      navigate({ to: "/me" });
    } catch {
      setDeleteError("削除に失敗しました。もう一度お試しください。");
      setDeleting(false);
    }
  };

  const label = useWatch({ control, name: "label", defaultValue: "" });

  return (
    <FormProvider {...methods}>
      <main className="min-h-screen p-6 flex flex-col max-w-md mx-auto gap-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
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
          <h1 className="text-xl font-bold">
            {initialLabel || initialDisplayName} を編集
          </h1>
        </div>

        {saveError && (
          <div
            ref={saveErrorRef}
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          >
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Display name */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">表示名</label>
              <VisibilityToggle
                label="表示名"
                value={displayNameVisibility}
                onChange={(v) => {
                  setDisplayNameVisibility(v);
                  setValue("displayNameVisibility", v, { shouldDirty: true });
                }}
              />
            </div>
            <Input {...register("displayName")} />
            {errors.displayName && (
              <p className="text-xs text-red-600">
                {errors.displayName.message}
              </p>
            )}
          </div>

          {/* Label */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              ラベル{" "}
              <span className="text-xs text-gray-400 font-normal">
                （自分だけが見る用途メモ・任意）
              </span>
            </label>
            <div className="relative">
              <Input
                {...register("label")}
                placeholder={purposeLabelPlaceholder(purpose)}
                maxLength={20}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {(label ?? "").length}/20
              </span>
            </div>
            {errors.label && (
              <p className="text-xs text-red-600">{errors.label.message}</p>
            )}
          </div>

          {/* Purpose（用途タイプ） */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              用途タイプ{" "}
              <span className="text-xs text-gray-400 font-normal">
                （見せ方が変わります）
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PURPOSE_PICKER_ORDER.map((id) => {
                const cfg = PURPOSE_CONFIGS[id];
                const selected = purpose === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectPurpose(id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition
                    ${selected ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:border-gray-400"}`}
                  >
                    <span className="text-xl">{cfg.emoji}</span>
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            {purpose === null && (
              <p className="text-xs text-gray-400">
                未選択（従来表示）。選ぶとこのなふだの見せ方が用途に合わせて変わります。
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">自己紹介</label>
              <VisibilityToggle
                label="自己紹介"
                value={bioVisibility}
                onChange={(v) => {
                  setBioVisibility(v);
                  setValue("bioVisibility", v, { shouldDirty: true });
                }}
              />
            </div>
            <div className="relative">
              <textarea
                {...register("bio")}
                rows={3}
                maxLength={200}
                placeholder="推し活のきっかけや活動スタイルなど、自由に書いてください"
                className="w-full px-3 py-3 border rounded-lg text-base md:text-sm outline-none focus:ring-2 focus:ring-black resize-none"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                {bio.length}/200
              </span>
            </div>
            {errors.bio && (
              <p className="text-xs text-red-600">{errors.bio.message}</p>
            )}
          </div>

          {/* Avatar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">アバター</label>
              <VisibilityToggle
                label="アバター"
                value={avatarVisibility}
                onChange={(v) => {
                  setAvatarVisibility(v);
                  setValue("avatarVisibility", v, { shouldDirty: true });
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <AvatarUpload
                personaId={personaId}
                displayName={displayName}
                currentAvatarUrl={avatarUrl}
                onAvatarChange={setAvatarUrl}
              />
              <p className="text-xs text-gray-500">
                タップして写真を選択
                <br />
                切り取り後に保存されます
              </p>
            </div>
          </div>

          {/* Gallery */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">ギャラリー</label>
              <VisibilityToggle
                label="ギャラリー"
                value={galleryVisibility}
                onChange={(v) => {
                  setGalleryVisibility(v);
                  setValue("galleryVisibility", v, { shouldDirty: true });
                }}
              />
            </div>
            <GalleryUpload
              personaId={personaId}
              initialPhotos={initialGalleryPhotos}
            />
          </div>

          {/* Oshi tags */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {purposeEditTagLabel(purpose)}
              </label>
              <VisibilityToggle
                label={purposeEditTagLabel(purpose)}
                value={oshiTagsVisibility}
                onChange={(v) => {
                  setOshiTagsVisibility(v);
                  setValue("oshiTagsVisibility", v, { shouldDirty: true });
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {purposeEditTagHint(purpose)}自由に入力できます。入力して{" "}
              <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">
                Enter
              </kbd>{" "}
              で追加、×で削除。
            </p>
            <OshiTagInput
              name="oshiTags"
              onPendingChange={setHasPendingOshiInput}
            />
            {hasPendingOshiInput && (
              <p className="text-xs text-amber-600">
                Enter で確定してから保存してください
              </p>
            )}
          </div>

          {/* Dojin reject — 推し活(oshi)と既存(null)でのみ表示。非表示でも DB の値は保持する */}
          {purposeShowsDojinReject(purpose) && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">同担設定</h3>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    value="false"
                    {...register("dojinReject")}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    同担の方にも表示される（デフォルト）
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    value="true"
                    {...register("dojinReject")}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    同担の方の一覧に表示されたくない場合はオンにしてください
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* SNS links */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">SNSリンク</label>
              <VisibilityToggle
                label="SNSリンク"
                value={snsLinksVisibility}
                onChange={(v) => {
                  setSnsLinksVisibility(v);
                  setValue("snsLinksVisibility", v, { shouldDirty: true });
                }}
              />
            </div>

            {snsLinks.length === 0 && (
              <p className="text-xs text-gray-400">SNSリンクがありません</p>
            )}

            <div className="flex flex-col gap-2">
              {snsLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-1 p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={link.platform}
                      onChange={(e) =>
                        updateSnsLinkField(index, "platform", e.target.value)
                      }
                      className="flex-1 px-2 py-1.5 border rounded text-sm bg-white outline-none"
                    >
                      {orderedPlatforms.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11"
                        onClick={() => moveSnsLink(index, "up")}
                        disabled={index === 0}
                        aria-label="上に移動"
                      >
                        <ArrowUp className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11"
                        onClick={() => moveSnsLink(index, "down")}
                        disabled={index === snsLinks.length - 1}
                        aria-label="下に移動"
                      >
                        <ArrowDown className="size-5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 ml-3 text-red-600 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeSnsLink(index)}
                      aria-label="削除"
                    >
                      <X className="size-5" />
                    </Button>
                  </div>
                  <Input
                    value={link.url}
                    onChange={(e) =>
                      updateSnsLinkField(index, "url", e.target.value)
                    }
                    placeholder={getSnsPlaceholder(link.platform)}
                    className="bg-white"
                  />
                  <Input
                    value={link.title}
                    onChange={(e) =>
                      updateSnsLinkField(index, "title", e.target.value)
                    }
                    placeholder={
                      link.platform === "other"
                        ? "表示名（必須）"
                        : "表示名（省略可）"
                    }
                    className="bg-white"
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addSnsLink}
              className="mt-1 w-full border-dashed text-gray-500"
            >
              ＋ SNSリンクを追加
            </Button>
          </div>

          {/* なふだリンク（ADR-0015） */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              なふだリンク{" "}
              <span className="text-xs text-gray-400 font-normal">
                （自分の別のなふだへの導線）
              </span>
            </label>

            {otherPersonas.length === 0 ? (
              <p className="text-xs text-gray-400">
                リンクできる他のなふだがありません
              </p>
            ) : (
              <>
                {nafudaLinkTargets.length === 0 && (
                  <p className="text-xs text-gray-400">
                    なふだリンクがありません
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {nafudaLinkTargets.map((targetId, index) => {
                    const target = personaById.get(targetId);
                    if (!target) return null;
                    return (
                      <div
                        key={targetId}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50"
                      >
                        {target.avatarUrl ? (
                          <img
                            src={target.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span className="text-lg leading-none shrink-0">
                            📛
                          </span>
                        )}
                        <span className="flex-1 text-sm truncate">
                          {target.label || target.displayName}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11"
                            onClick={() => moveNafudaLink(index, "up")}
                            disabled={index === 0}
                            aria-label="上に移動"
                          >
                            <ArrowUp className="size-5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11"
                            onClick={() => moveNafudaLink(index, "down")}
                            disabled={index === nafudaLinkTargets.length - 1}
                            aria-label="下に移動"
                          >
                            <ArrowDown className="size-5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11 ml-3 text-red-600 hover:bg-red-50 hover:text-red-600"
                            onClick={() => removeNafudaLink(targetId)}
                            aria-label="削除"
                          >
                            <X className="size-5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {availablePersonas.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      addNafudaLink(e.target.value);
                      e.target.value = "";
                    }}
                    className="mt-1 w-full px-3 py-2 border border-dashed rounded-lg text-sm text-gray-500 bg-white outline-none"
                  >
                    <option value="">＋ なふだリンクを追加</option>
                    {availablePersonas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label || p.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>

          {/* なふだスタイル */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">なふだスタイル</label>
            <div className="grid grid-cols-3 gap-2">
              {/* デフォルト（なし） */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStyleId(null);
                  setStyleDirty(true);
                }}
                className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                  !selectedStyleId
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-full h-12 rounded-lg bg-white border border-gray-200" />
                <span className="text-xs text-gray-600">なし</span>
                {!selectedStyleId && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </button>

              {NAFUDA_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedStyleId(s.id);
                    setStyleDirty(true);
                  }}
                  className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                    selectedStyleId === s.id
                      ? "border-black"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="w-full h-12 rounded-lg"
                    style={{ background: s.background }}
                  />
                  {!s.isFree && (
                    <span className="absolute top-1 left-1 text-[9px] font-bold bg-linear-to-r from-yellow-400 to-amber-500 text-white px-1 py-0.5 rounded leading-none">
                      PRO
                    </span>
                  )}
                  <span className="text-xs text-gray-600">{s.name}</span>
                  {selectedStyleId === s.id && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M2 5l2 2 4-4"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving} size="lg" className="w-full">
            {saving ? "保存中..." : "保存する"}
          </Button>
        </form>

        {/* 危険ゾーン: なふだの削除（最後の1枚は退会に委ねる — ADR-0011） */}
        <div className="mt-2 pt-6 border-t border-gray-200 flex flex-col gap-2">
          {isLastPersona ? (
            <p className="text-xs text-gray-400">
              これは最後のなふだのため削除できません。アカウントごと消す場合は{" "}
              <Link to="/me" className="underline">
                マイページの「退会する」
              </Link>
              から手続きしてください。
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDeleteModal(true)}
              className="self-start h-auto p-0 text-sm text-red-600 underline hover:bg-transparent hover:text-red-700"
            >
              このなふだを削除する
            </Button>
          )}
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">なふだの削除</h2>
            <p className="text-sm text-gray-600 mb-3">
              なふだ「{initialLabel || initialDisplayName}
              」を削除します。以下のデータが完全に削除されます（復元できません）：
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc pl-4 space-y-1">
              <li>このなふだのつながり（相手側の記録も含む）</li>
              <li>このなふだのチェックイン履歴</li>
              <li>このなふだのSNSリンク・なふだリンク</li>
            </ul>
            {deleteError && (
              <p className="text-sm text-red-500 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "削除中..." : "削除する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </FormProvider>
  );
}
