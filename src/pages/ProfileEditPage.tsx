import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { MOCK_PROFILE } from '../data/mockData'
import type { SnsLink } from '../data/mockData'

const PLATFORMS: SnsLink['platform'][] = ['x', 'instagram', 'discord', 'line_openchat', 'tiktok', 'youtube']
const PLATFORM_LABELS: Record<SnsLink['platform'], string> = {
  x: 'X',
  instagram: 'Instagram',
  discord: 'Discord',
  line_openchat: 'LINE オープンチャット',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

interface EditableLink extends SnsLink {
  id: string
  isEditing: boolean
}

function newLink(): EditableLink {
  return { id: crypto.randomUUID(), platform: 'x', url: '', handle: '', isEditing: true }
}

export function ProfileEditPage() {
  const navigate = useNavigate()
  const [handle, setHandle] = useState(MOCK_PROFILE.handle)
  const [bio, setBio] = useState(MOCK_PROFILE.bio ?? '')
  const [tagsInput, setTagsInput] = useState(MOCK_PROFILE.oshiTags.join(' '))
  const [links, setLinks] = useState<EditableLink[]>(
    MOCK_PROFILE.snsLinks.map((l) => ({ ...l, id: crypto.randomUUID(), isEditing: false }))
  )

  function updateLink(id: string, patch: Partial<EditableLink>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function deleteLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  function addLink() {
    setLinks((prev) => [...prev, newLink()])
  }

  function handleSave() {
    navigate('/me')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center px-4">
      <header className="w-full max-w-md flex items-center py-4">
        <Link to="/me" className="flex items-center gap-1 text-sm text-pink-400 hover:text-pink-600">
          <span>‹</span>
          <span>戻る</span>
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700">
          プロフィールを編集
        </h1>
      </header>

      <div className="w-full max-w-md flex flex-col gap-6 pt-4 pb-12">

        {/* ハンドル名 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">ハンドル名</label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
          />
        </div>

        {/* 自己紹介 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">自己紹介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none bg-white"
          />
        </div>

        {/* 推しタグ */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">推しタグ</label>
          <p className="text-xs text-gray-400">スペース区切りで入力（例: #田中推し #Aグループ）</p>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
          />
        </div>

        {/* リンク */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-gray-500">リンク</label>

          {links.map((link) => (
            <div key={link.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {link.isEditing ? (
                /* 編集モード */
                <div className="flex flex-col gap-3 p-4">
                  <select
                    value={link.platform}
                    onChange={(e) => updateLink(link.id, { platform: e.target.value as SnsLink['platform'] })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="ハンドル名（例: @your_handle）"
                    value={link.handle}
                    onChange={(e) => updateLink(link.id, { handle: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <input
                    type="url"
                    placeholder="URL（例: https://x.com/your_handle）"
                    value={link.url}
                    onChange={(e) => updateLink(link.id, { url: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <div className="flex justify-between">
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => updateLink(link.id, { isEditing: false })}
                      className="text-xs text-pink-500 hover:text-pink-700 font-medium"
                    >
                      完了
                    </button>
                  </div>
                </div>
              ) : (
                /* 表示モード */
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{PLATFORM_LABELS[link.platform]}</p>
                    <p className="text-xs text-gray-400 truncate">{link.handle || link.url}</p>
                  </div>
                  <button
                    onClick={() => updateLink(link.id, { isEditing: true })}
                    className="text-xs text-gray-400 hover:text-pink-500 px-2 py-1"
                  >
                    編集
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addLink}
            className="w-full py-3 border-2 border-dashed border-pink-200 text-pink-400 hover:border-pink-400 hover:text-pink-500 rounded-2xl text-sm font-medium transition-colors"
          >
            + リンクを追加
          </button>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full shadow-md transition-colors mt-2"
        >
          保存する
        </button>

        <p className="text-xs text-gray-300 text-center">
          ※ デモ版：保存はされません
        </p>
      </div>
    </div>
  )
}
