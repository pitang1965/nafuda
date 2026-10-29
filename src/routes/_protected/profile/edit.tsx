import {
  createFileRoute,
  useNavigate,
  useRouter,
  Link,
} from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, FormProvider, Controller } from "react-hook-form";
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
import { NAFUDA_STYLES, styleName } from "../../../lib/nafuda-styles";
import {
  PURPOSE_CONFIGS,
  PURPOSE_PICKER_ORDER,
  purposeLabel,
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
import { NafudaPreviewDialog } from "../../../components/NafudaPreviewDialog";
import { NafudaIcon } from "../../../components/NafudaIcon";
import type { NafudaCardProfile } from "../../../components/NafudaCardView";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowUp, ArrowDown, X, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "../../../lib/i18n/context";
import { LanguageToggle } from "../../../components/LanguageToggle";

export const Route = createFileRoute("/_protected/profile/edit")({
  validateSearch: (search: Record<string, unknown>) => ({
    personaId:
      typeof search.personaId === "string" ? search.personaId : undefined,
  }),
  loader: () => getOwnProfile(),
  staleTime: 0,
  // 未保存変更の確認（handleBack）を自前で持つ集中フローのため、シェルの
  // ヘッダー/ボトムナビを被せずガードを温存する。
  staticData: { hideChrome: true },
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
  { value: "suno", label: "Suno" },
  { value: "facebook", label: "Facebook" },
  { value: "minkara", label: "みんカラ" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "note", label: "note" },
  { value: "pixiv", label: "pixiv" },
  { value: "other", label: "その他" },
] as const;

type Platform = (typeof PLATFORMS)[number]["value"];

// プラットフォーム名のうちブランド固有名詞でないもの（翻訳が要るもの）だけキーで上書きする。
const PLATFORM_LABEL_KEYS: Partial<Record<Platform, string>> = {
  line_openchat: "edit.platformLineOpenchat",
  minkara: "edit.platformMinkara",
  other: "edit.platformOther",
};

function platformDisplayLabel(
  platform: Platform,
  fallbackLabel: string,
  t: (key: string) => string,
): string {
  const key = PLATFORM_LABEL_KEYS[platform];
  return key ? t(key) : fallbackLabel;
}

// Platforms where a bare username can be entered (no https:// required)
const USERNAME_BASE: Partial<Record<Platform, string>> = {
  x: "https://x.com/",
  instagram: "https://instagram.com/",
  tiktok: "https://tiktok.com/@",
  youtube: "https://youtube.com/@",
  suno: "https://suno.com/@",
  github: "https://github.com/",
  minkara: "https://minkara.carview.co.jp/userid/",
  linkedin: "https://www.linkedin.com/in/",
  note: "https://note.com/",
  pixiv: "https://www.pixiv.net/users/",
  // vanity URL を補完。profile.php?id=... を貼っても https://www.facebook.com/profile.php?id=...
  // になり成立する（http 始まりでないため base が前置される）。
  facebook: "https://www.facebook.com/",
};

function normalizeUrl(platform: Platform, input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("http")) return trimmed;
  const base = USERNAME_BASE[platform];
  return base ? `${base}${trimmed}` : trimmed;
}

// 正規化後の文字列が有効な https URL か。サーバの検証と同一ルール
// （javascript:/data: は https 前置チェックで弾かれる）。
function isValidHttpsUrl(url: string): boolean {
  try {
    new URL(url);
  } catch {
    return false;
  }
  return /^https:\/\//i.test(url);
}

function getSnsPlaceholder(
  platform: Platform,
  t: (key: string) => string,
): string {
  if (platform in USERNAME_BASE) return t("edit.snsUsernameOrUrlPlaceholder");
  if (platform === "discord") return "https://discord.gg/...";
  if (platform === "line_openchat") return "https://line.me/ti/g2/...";
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

// バリデーションメッセージは t() を使うため、スキーマはコンポーネント内で生成する。
function createEditSchema(t: (key: string) => string) {
  return z.object({
    displayName: z
      .string()
      .min(1, t("wizard.errorDisplayNameRequired"))
      .max(50, t("wizard.errorDisplayNameMax")),
    label: z.string().max(20, t("wizard.errorLabelMax")).optional().or(z.literal("")),
    bio: z.string().max(200, t("edit.errorBioMax")).optional().or(z.literal("")),
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
}

type EditForm = z.infer<ReturnType<typeof createEditSchema>>;

function VisibilityToggle({
  value,
  onChange,
  label,
}: {
  value: "public" | "private";
  onChange: (v: "public" | "private") => void;
  label: string;
}) {
  const t = useT();
  const isPublic = value === "public";
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <span
        className={cn(
          "text-xs",
          isPublic ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {isPublic ? t("edit.visibilityPublic") : t("edit.visibilityPrivate")}
      </span>
      <Switch
        checked={isPublic}
        onCheckedChange={(checked) => onChange(checked ? "public" : "private")}
        aria-label={t("edit.visibilityAriaLabel", { label })}
      />
    </label>
  );
}

function EditPage() {
  const t = useT();
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
        <p className="text-sm text-gray-500">{t("edit.noPersonaYet")}</p>
        <Button onClick={() => navigate({ to: "/profile/wizard" })} size="lg">
          {t("edit.createNafuda")}
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
  const t = useT();
  const { locale } = useLocale();
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
  // ギャラリーは GalleryUpload がローカルに持つため、プレビュー用に親へリフトする
  const [galleryPhotos, setGalleryPhotos] = useState(() =>
    [...initialGalleryPhotos].sort((a, b) => a.displayOrder - b.displayOrder),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
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

  // 言語切替への追従はせず、マウント時点のロケールでメッセージを固定する（意図的。wizard.tsxと同じ）。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const editSchema = useMemo(() => createEditSchema(t), []);

  const methods = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      displayName: initialDisplayName,
      label: initialLabel,
      bio: initialBio,
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

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleBack = () => {
    if (anyDirty) {
      setShowLeaveConfirm(true);
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
      showSaveError(t("edit.snsOtherTitleRequiredError"));
      return;
    }
    // SNSリンクのURLを保存前に一括検証（部分書き込みを避けるため mutation 前に行う）。
    for (const link of snsLinks) {
      if (!link.url.trim()) continue;
      if (!isValidHttpsUrl(normalizeUrl(link.platform, link.url))) {
        const platformEntry = PLATFORMS.find((p) => p.value === link.platform);
        const platformLabel = platformEntry
          ? platformDisplayLabel(platformEntry.value, platformEntry.label, t)
          : link.platform;
        showSaveError(
          t("edit.snsUrlInvalidError", { platform: platformLabel }),
        );
        return;
      }
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
        err instanceof Error ? err.message : t("edit.saveFailedGeneric"),
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
      setDeleteError(t("edit.deleteFailedGeneric"));
      setDeleting(false);
    }
  };

  const label = useWatch({ control, name: "label", defaultValue: "" });
  const oshiTags =
    useWatch({ control, name: "oshiTags", defaultValue: initialOshiTags }) ??
    [];

  // プレビュー用に「人から見た画面」を組む。公開範囲が非公開の項目は除外し、
  // SNS URL はユーザー名入力を正規化する（getPublicProfile のフィルタと同じ規則）。
  const previewProfile: NafudaCardProfile = {
    displayName,
    bio: bioVisibility === "private" ? null : bio || null,
    avatarUrl: avatarVisibility === "private" ? null : avatarUrl,
    oshiTags: oshiTagsVisibility === "private" ? [] : oshiTags,
    purpose,
    galleryPhotos:
      galleryVisibility === "private"
        ? []
        : galleryPhotos.map((p) => ({
            imageUrl: p.imageUrl,
            caption: p.caption,
          })),
    snsLinks:
      snsLinksVisibility === "private"
        ? []
        : snsLinks
            .filter((l) => l.url.trim())
            .map((l) => ({
              platform: l.platform,
              url: normalizeUrl(l.platform, l.url),
              title: l.title,
            })),
    nafudaLinks: nafudaLinkTargets
      .map((id) => personaById.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({ displayName: t.displayName, avatarUrl: t.avatarUrl })),
    styleId: selectedStyleId,
  };

  return (
    <FormProvider {...methods}>
      <main className="min-h-screen p-6 flex flex-col max-w-md mx-auto gap-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
            aria-label={t("common.back")}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">
            {t("edit.editingTitle", {
              name: initialLabel || initialDisplayName,
            })}
          </h1>
          <LanguageToggle />
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
            <label className="text-sm font-medium">
              {t("edit.displayNameLabel")}
            </label>
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
              {t("wizard.labelFieldLabel")}{" "}
              <span className="text-xs text-gray-400 font-normal">
                {t("wizard.labelFieldHint")}
              </span>
            </label>
            <div className="relative">
              <Input
                {...register("label")}
                placeholder={purposeLabelPlaceholder(purpose, locale)}
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
              {t("edit.purposeLabel")}{" "}
              <span className="text-xs text-gray-400 font-normal">
                {t("edit.purposeHint")}
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
                    <span className="text-sm font-medium">
                      {purposeLabel(id, locale)}
                    </span>
                  </button>
                );
              })}
            </div>
            {purpose === null && (
              <p className="text-xs text-gray-400">
                {t("edit.purposeUnselectedHint")}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t("edit.bioLabel")}</label>
              <VisibilityToggle
                label={t("edit.bioLabel")}
                value={bioVisibility}
                onChange={(v) => {
                  setBioVisibility(v);
                  setValue("bioVisibility", v, { shouldDirty: true });
                }}
              />
            </div>
            <div className="relative">
              <Textarea
                {...register("bio")}
                aria-invalid={!!errors.bio}
                maxLength={200}
                placeholder={t("edit.bioPlaceholder")}
                className="pb-6"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                {bio.length}/200
              </span>
            </div>
            <p className="text-xs text-gray-400">{t("edit.bioBulletHint")}</p>
            {errors.bio && (
              <p className="text-xs text-red-600">{errors.bio.message}</p>
            )}
          </div>

          {/* Avatar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t("edit.avatarLabel")}
              </label>
              <VisibilityToggle
                label={t("edit.avatarLabel")}
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
                {t("edit.avatarHint1")}
                <br />
                {t("edit.avatarHint2")}
              </p>
            </div>
          </div>

          {/* Gallery */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t("edit.galleryLabel")}
              </label>
              <VisibilityToggle
                label={t("edit.galleryLabel")}
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
              onChange={setGalleryPhotos}
            />
          </div>

          {/* Oshi tags */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {purposeEditTagLabel(purpose, locale)}
              </label>
              <VisibilityToggle
                label={purposeEditTagLabel(purpose, locale)}
                value={oshiTagsVisibility}
                onChange={(v) => {
                  setOshiTagsVisibility(v);
                  setValue("oshiTagsVisibility", v, { shouldDirty: true });
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {t("edit.tagInputHint", {
                tagHint: purposeEditTagHint(purpose, locale),
              })}
              <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">
                Enter
              </kbd>
              {t("edit.tagInputSuffix")}
            </p>
            <OshiTagInput
              name="oshiTags"
              purpose={purpose}
              onPendingChange={setHasPendingOshiInput}
            />
          </div>

          {/* Dojin reject — 推し活(oshi)と既存(null)でのみ表示。非表示でも DB の値は保持する */}
          {purposeShowsDojinReject(purpose) && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                {t("edit.dojinSettingTitle")}
              </h3>
              <Controller
                control={control}
                name="dojinReject"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-2"
                  >
                    <label
                      htmlFor="dojin-false"
                      className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <RadioGroupItem
                        id="dojin-false"
                        value="false"
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        {t("edit.dojinOptionShow")}
                      </span>
                    </label>
                    <label
                      htmlFor="dojin-true"
                      className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <RadioGroupItem
                        id="dojin-true"
                        value="true"
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        {t("edit.dojinOptionHide")}
                      </span>
                    </label>
                  </RadioGroup>
                )}
              />
            </div>
          )}

          {/* SNS links */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {t("edit.snsLinksLabel")}
              </label>
              <VisibilityToggle
                label={t("edit.snsLinksLabel")}
                value={snsLinksVisibility}
                onChange={(v) => {
                  setSnsLinksVisibility(v);
                  setValue("snsLinksVisibility", v, { shouldDirty: true });
                }}
              />
            </div>

            <p className="text-xs text-gray-500">{t("edit.snsLinksHint")}</p>

            {snsLinks.length === 0 && (
              <p className="text-xs text-gray-400">
                {t("edit.snsLinksEmpty")}
              </p>
            )}

            <div className="flex flex-col gap-2">
              {snsLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-1 p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Select
                      value={link.platform}
                      onValueChange={(v) =>
                        updateSnsLinkField(index, "platform", v)
                      }
                    >
                      <SelectTrigger className="h-11! flex-1 min-w-0 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {orderedPlatforms.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {platformDisplayLabel(p.value, p.label, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11"
                        onClick={() => moveSnsLink(index, "up")}
                        disabled={index === 0}
                        aria-label={t("edit.moveUp")}
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
                        aria-label={t("edit.moveDown")}
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
                      aria-label={t("edit.remove")}
                    >
                      <X className="size-5" />
                    </Button>
                  </div>
                  <Input
                    value={link.url}
                    onChange={(e) =>
                      updateSnsLinkField(index, "url", e.target.value)
                    }
                    placeholder={getSnsPlaceholder(link.platform, t)}
                    className="bg-white"
                  />
                  <Input
                    value={link.title}
                    onChange={(e) =>
                      updateSnsLinkField(index, "title", e.target.value)
                    }
                    placeholder={
                      link.platform === "other"
                        ? t("edit.snsTitlePlaceholderRequired")
                        : t("edit.snsTitlePlaceholderOptional")
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
              {t("edit.addSnsLink")}
            </Button>
          </div>

          {/* なふだリンク（ADR-0015） */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("edit.nafudaLinksLabel")}{" "}
              <span className="text-xs text-gray-400 font-normal">
                {t("edit.nafudaLinksHint")}
              </span>
            </label>

            {otherPersonas.length === 0 ? (
              <p className="text-xs text-gray-400">
                {t("edit.nafudaLinksNoneAvailable")}
              </p>
            ) : (
              <>
                {nafudaLinkTargets.length === 0 && (
                  <p className="text-xs text-gray-400">
                    {t("edit.nafudaLinksEmpty")}
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
                          <NafudaIcon className="size-8 shrink-0 text-gray-400" />
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
                            aria-label={t("edit.moveUp")}
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
                            aria-label={t("edit.moveDown")}
                          >
                            <ArrowDown className="size-5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11 ml-3 text-red-600 hover:bg-red-50 hover:text-red-600"
                            onClick={() => removeNafudaLink(targetId)}
                            aria-label={t("edit.remove")}
                          >
                            <X className="size-5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {availablePersonas.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="mt-1 w-full px-3 py-2 border border-dashed rounded-lg text-sm text-gray-500 bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                      {t("edit.addNafudaLink")}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                      {availablePersonas.map((p) => (
                        <DropdownMenuItem
                          key={p.id}
                          onSelect={() => addNafudaLink(p.id)}
                        >
                          {p.label || p.displayName}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>

          {/* なふだスタイル */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              {t("edit.styleLabel")}
            </label>
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
                <span className="text-xs text-gray-600">
                  {t("edit.styleNone")}
                </span>
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
                  <span className="text-xs text-gray-600">
                    {styleName(s, locale)}
                  </span>
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

          {/* 下固定アクションバー: スクロール不要で保存でき、プレビュー導線も常時表示 */}
          <div className="sticky bottom-0 -mx-6 mt-2 flex gap-2 border-t border-gray-200 bg-white/95 px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setPreviewOpen(true)}
            >
              {t("edit.preview")}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="flex-1"
            >
              {saving ? t("edit.saving") : t("edit.save")}
            </Button>
          </div>
        </form>

        {/* 危険ゾーン: なふだの削除（最後の1枚は退会に委ねる — ADR-0011） */}
        <div className="mt-2 pt-6 border-t border-gray-200 flex flex-col gap-2">
          {isLastPersona ? (
            <p className="text-xs text-gray-400">
              {t("edit.lastPersonaDeleteHintPrefix")}
              <Link to="/account" className="underline">
                {t("edit.accountDeleteLinkText")}
              </Link>
              {t("edit.lastPersonaDeleteHintSuffix")}
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDeleteModal(true)}
              className="self-start h-auto p-0 text-sm text-red-600 underline hover:bg-transparent hover:text-red-700"
            >
              {t("edit.deleteThisNafuda")}
            </Button>
          )}
        </div>
      </main>

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

      <NafudaPreviewDialog
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        profile={previewProfile}
        selectedStyleId={selectedStyleId}
        onSelectStyle={(id) => {
          setSelectedStyleId(id);
          setStyleDirty(true);
        }}
      />

      <AlertDialog
        open={showDeleteModal}
        onOpenChange={(o) => {
          if (!o) {
            setShowDeleteModal(false);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("edit.deleteNafudaTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  {t("edit.deleteConfirmText", {
                    name: initialLabel || initialDisplayName,
                  })}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-4">
                  <li>{t("edit.deleteListConnections")}</li>
                  <li>{t("edit.deleteListCheckins")}</li>
                  <li>{t("edit.deleteListLinks")}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1" disabled={deleting}>
              {t("edit.cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t("edit.deleting") : t("edit.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
}
