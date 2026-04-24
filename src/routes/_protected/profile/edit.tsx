import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getOwnProfile, updatePersona, upsertSnsLink, deleteSnsLink } from '../../../server/functions/profile'
import { updateOshiTags, updateDojinReject } from '../../../server/functions/oshi'
import { InitialsAvatar } from '../../../components/InitialsAvatar'
import { OshiTagInput } from '../../../components/OshiTagInput'

export const Route = createFileRoute('/_protected/profile/edit')({
  loader: () => getOwnProfile(),
  component: EditPage,
})

const PLATFORMS = [
  { value: 'x', label: 'X (Twitter)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'discord', label: 'Discord' },
  { value: 'line_openchat', label: 'LINEオープンチャット' },
  { value: 'github', label: 'GitHub' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'other', label: 'その他' },
] as const

type Platform = typeof PLATFORMS[number]['value']

interface SnsLinkState {
  id?: string
  platform: Platform
  url: string
  displayOrder: number
  isNew: boolean
}

const EditSchema = z.object({
  displayName: z.string().min(1, '表示名を入力してください').max(50, '50文字以下'),
  avatarUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  useAutoAvatar: z.boolean(),
  displayNameVisibility: z.enum(['public', 'private']),
  avatarVisibility: z.enum(['public', 'private']),
  snsLinksVisibility: z.enum(['public', 'private']),
  oshiTagsVisibility: z.enum(['public', 'private']),
  // oshiTags managed via OshiTagInput (FormProvider context) — RHF field
  oshiTags: z.array(z.string()).default([]),
  // dojinReject stored as string in radio input, converted to boolean on save
  dojinReject: z.enum(['false', 'true']).default('false'),
})

type EditForm = z.infer<typeof EditSchema>

function VisibilityToggle({
  value,
  onChange,
}: {
  value: 'public' | 'private'
  onChange: (v: 'public' | 'private') => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(value === 'public' ? 'private' : 'public')}
      title={value === 'public' ? '公開中（タップで非公開に）' : '非公開（タップで公開に）'}
      className="text-lg select-none"
    >
      {value === 'public' ? '👁' : '🔒'}
    </button>
  )
}

function EditPage() {
  const navigate = useNavigate()
  const { personas, urlId } = Route.useLoaderData()

  // Use default persona (or first) for editing
  const defaultPersona = personas.find(p => p.isDefault) ?? personas[0]

  if (!defaultPersona || !urlId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-gray-500">プロフィールがまだ設定されていません</p>
        <button
          onClick={() => navigate({ to: '/profile/wizard' })}
          className="px-6 py-3 bg-black text-white rounded-lg text-sm"
        >
          プロフィールを作成する
        </button>
      </div>
    )
  }

  const visibility = (defaultPersona.fieldVisibility ?? {}) as Record<string, string>

  return (
    <EditForm
      personaId={defaultPersona.id}
      initialDisplayName={defaultPersona.displayName}
      initialAvatarUrl={defaultPersona.avatarUrl ?? ''}
      initialDisplayNameVisibility={(visibility.display_name as 'public' | 'private') ?? 'public'}
      initialAvatarVisibility={(visibility.avatar_url as 'public' | 'private') ?? 'public'}
      initialSnsLinksVisibility={(visibility.sns_links as 'public' | 'private') ?? 'public'}
      initialOshiTagsVisibility={(visibility.oshi_tags as 'public' | 'private') ?? 'public'}
      initialOshiTags={defaultPersona.oshiTags}
      initialDojinReject={defaultPersona.dojinReject}
    />
  )
}

function EditForm({
  personaId,
  initialDisplayName,
  initialAvatarUrl,
  initialDisplayNameVisibility,
  initialAvatarVisibility,
  initialSnsLinksVisibility,
  initialOshiTagsVisibility,
  initialOshiTags,
  initialDojinReject,
}: {
  personaId: string
  initialDisplayName: string
  initialAvatarUrl: string
  initialDisplayNameVisibility: 'public' | 'private'
  initialAvatarVisibility: 'public' | 'private'
  initialSnsLinksVisibility: 'public' | 'private'
  initialOshiTagsVisibility: 'public' | 'private'
  initialOshiTags: string[]
  initialDojinReject: boolean
}) {
  const navigate = useNavigate()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [snsLinks, setSnsLinks] = useState<SnsLinkState[]>([])
  const [deletedLinkIds, setDeletedLinkIds] = useState<string[]>([])
  const [oshiSaving, setOshiSaving] = useState(false)
  const [oshiSaveError, setOshiSaveError] = useState<string | null>(null)
  const [oshiSaved, setOshiSaved] = useState(false)

  const methods = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      displayName: initialDisplayName,
      avatarUrl: initialAvatarUrl,
      useAutoAvatar: !initialAvatarUrl,
      displayNameVisibility: initialDisplayNameVisibility,
      avatarVisibility: initialAvatarVisibility,
      snsLinksVisibility: initialSnsLinksVisibility,
      oshiTagsVisibility: initialOshiTagsVisibility,
      oshiTags: initialOshiTags,
      dojinReject: initialDojinReject ? 'true' : 'false',
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = methods

  const displayName = watch('displayName') ?? ''
  const useAutoAvatar = watch('useAutoAvatar')
  const displayNameVisibility = watch('displayNameVisibility')
  const avatarVisibility = watch('avatarVisibility')
  const snsLinksVisibility = watch('snsLinksVisibility')
  const oshiTagsVisibility = watch('oshiTagsVisibility')

  const addSnsLink = () => {
    setSnsLinks(prev => [...prev, {
      platform: 'x',
      url: '',
      displayOrder: prev.length,
      isNew: true,
    }])
  }

  const removeSnsLink = (index: number) => {
    const link = snsLinks[index]
    if (link.id) {
      setDeletedLinkIds(prev => [...prev, link.id!])
    }
    setSnsLinks(prev => prev.filter((_, i) => i !== index))
  }

  const moveSnsLink = (index: number, direction: 'up' | 'down') => {
    const newLinks = [...snsLinks]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newLinks.length) return
    ;[newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]]
    setSnsLinks(newLinks.map((l, i) => ({ ...l, displayOrder: i })))
  }

  const updateSnsLinkField = (index: number, field: 'platform' | 'url', value: string) => {
    setSnsLinks(prev => prev.map((l, i) =>
      i === index ? { ...l, [field]: value } : l
    ))
  }

  // Save oshi tags separately (explicit save button)
  const handleSaveOshiTags = async () => {
    setOshiSaveError(null)
    setOshiSaving(true)
    setOshiSaved(false)
    try {
      const tags = methods.getValues('oshiTags')
      await updateOshiTags({ data: { personaId, tags } })
      setOshiSaved(true)
      setTimeout(() => setOshiSaved(false), 2000)
    } catch {
      setOshiSaveError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setOshiSaving(false)
    }
  }

  // dojin_reject — immediate save on radio change (feels instant per CONTEXT.md)
  const handleDojinRejectChange = async (value: 'true' | 'false') => {
    setValue('dojinReject', value)
    try {
      await updateDojinReject({ data: { personaId, dojinReject: value === 'true' } })
    } catch {
      // Silent fail — user can retry via main save
    }
  }

  const onSubmit = async (values: EditForm) => {
    setSaveError(null)
    setSaving(true)
    try {
      // Update persona fields and visibility
      await updatePersona({
        data: {
          personaId,
          displayName: values.displayName,
          avatarUrl: values.useAutoAvatar ? null : (values.avatarUrl || null),
          fieldVisibility: {
            display_name: values.displayNameVisibility,
            avatar_url: values.avatarVisibility,
            sns_links: values.snsLinksVisibility,
            oshi_tags: values.oshiTagsVisibility,
          },
        },
      })

      // Delete removed SNS links
      for (const linkId of deletedLinkIds) {
        await deleteSnsLink({ data: { linkId } })
      }

      // Upsert SNS links
      for (const link of snsLinks) {
        if (!link.url.trim()) continue
        await upsertSnsLink({
          data: {
            personaId,
            linkId: link.isNew ? undefined : link.id,
            platform: link.platform,
            url: link.url,
            displayOrder: link.displayOrder,
          },
        })
      }

      navigate({ to: '/home' })
    } catch {
      setSaveError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const dojinRejectValue = watch('dojinReject')

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen p-6 flex flex-col max-w-md mx-auto gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">プロフィールを編集</h1>
          <button
            onClick={() => navigate({ to: '/home' })}
            className="text-sm text-gray-500"
          >
            ✕ 閉じる
          </button>
        </div>

        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{saveError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

          {/* Display name */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">表示名</label>
              <VisibilityToggle
                value={displayNameVisibility}
                onChange={(v) => setValue('displayNameVisibility', v)}
              />
            </div>
            <input
              {...register('displayName')}
              className="w-full px-3 py-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
            />
            {errors.displayName && <p className="text-xs text-red-600">{errors.displayName.message}</p>}
          </div>

          {/* Avatar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">アバター</label>
              <VisibilityToggle
                value={avatarVisibility}
                onChange={(v) => setValue('avatarVisibility', v)}
              />
            </div>
            <div className="flex items-center gap-3">
              <InitialsAvatar name={displayName || '?'} size={48} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('useAutoAvatar')} className="rounded" />
                <span className="text-sm">イニシャルアバターを使う</span>
              </label>
            </div>
            {!useAutoAvatar && (
              <div>
                <input
                  {...register('avatarUrl')}
                  placeholder="https://example.com/avatar.png"
                  className="w-full px-3 py-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
                />
                {errors.avatarUrl && <p className="text-xs text-red-600">{errors.avatarUrl.message}</p>}
              </div>
            )}
          </div>

          {/* Oshi tags */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">推しタグ</label>
              <VisibilityToggle
                value={oshiTagsVisibility}
                onChange={(v) => setValue('oshiTagsVisibility', v)}
              />
            </div>
            <p className="text-xs text-gray-500">推しの名前・ジャンルを登録しましょう</p>
            <OshiTagInput name="oshiTags" />
            {oshiSaveError && <p className="text-xs text-red-600">{oshiSaveError}</p>}
            <button
              type="button"
              onClick={handleSaveOshiTags}
              disabled={oshiSaving}
              className="self-start px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              {oshiSaving ? '保存中...' : oshiSaved ? '保存しました' : '推しタグを保存'}
            </button>
          </div>

          {/* Dojin reject — immediate save on radio change */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">同担設定</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  value="false"
                  checked={dojinRejectValue === 'false'}
                  onChange={() => void handleDojinRejectChange('false')}
                  className="mt-0.5"
                />
                <span className="text-sm">同担の方にも表示される（デフォルト）</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  value="true"
                  checked={dojinRejectValue === 'true'}
                  onChange={() => void handleDojinRejectChange('true')}
                  className="mt-0.5"
                />
                <span className="text-sm">同担の方の一覧に表示されたくない場合はオンにしてください</span>
              </label>
            </div>
          </div>

          {/* SNS links */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">SNSリンク</label>
              <VisibilityToggle
                value={snsLinksVisibility}
                onChange={(v) => setValue('snsLinksVisibility', v)}
              />
            </div>

            {snsLinks.length === 0 && (
              <p className="text-xs text-gray-400">SNSリンクがありません</p>
            )}

            <div className="flex flex-col gap-2">
              {snsLinks.map((link, index) => (
                <div key={index} className="flex flex-col gap-1 p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <select
                      value={link.platform}
                      onChange={(e) => updateSnsLinkField(index, 'platform', e.target.value)}
                      className="flex-1 px-2 py-1.5 border rounded text-sm bg-white outline-none"
                    >
                      {PLATFORMS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveSnsLink(index, 'up')}
                        disabled={index === 0}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSnsLink(index, 'down')}
                        disabled={index === snsLinks.length - 1}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSnsLink(index)}
                        className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <input
                    value={link.url}
                    onChange={(e) => updateSnsLinkField(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 border rounded text-sm bg-white outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSnsLink}
              className="mt-1 w-full py-2.5 border border-dashed rounded-lg text-sm text-gray-500 hover:bg-gray-50"
            >
              ＋ SNSリンクを追加
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-40"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </form>
      </div>
    </FormProvider>
  )
}
