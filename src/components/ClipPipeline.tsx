import { useState } from 'react'
import { Plus, Trash2, Scissors } from 'lucide-react'
import { Card } from './ui/Card'
import { useServerStorage } from '../hooks/useServerStorage'
import type { ClipItem, ClipStatus } from '../types'

const STATUS_LABELS: Record<ClipStatus, string> = {
  'needs-editing': 'Needs Editing',
  ready: 'Ready to Post',
  posted: 'Posted',
}

const STATUS_ORDER: ClipStatus[] = ['needs-editing', 'ready', 'posted']

const STATUS_STYLE: Record<ClipStatus, string> = {
  'needs-editing': 'bg-status-bad/15 text-status-bad',
  ready: 'bg-status-watch/15 text-status-watch',
  posted: 'bg-status-good/15 text-status-good',
}

const PLATFORM_CHECKS: { key: keyof ClipItem['postedTo']; label: string }[] = [
  { key: 'clipsTikTok', label: 'Clips TikTok' },
  { key: 'clipsInstagram', label: 'Clips IG' },
  { key: 'youtubeShorts', label: 'YT Shorts' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ClipPipeline() {
  const [clips, setClips] = useServerStorage<ClipItem[]>('creator-os-clips', [])
  const [title, setTitle] = useState('')
  const [sourceDate, setSourceDate] = useState(today())

  function addClip() {
    if (!title.trim()) return
    const clip: ClipItem = {
      id: `clip-${Date.now()}`,
      title: title.trim(),
      sourceDate,
      status: 'needs-editing',
      postedTo: { clipsTikTok: false, clipsInstagram: false, youtubeShorts: false },
      createdAt: new Date().toISOString(),
    }
    setClips((prev) => [clip, ...prev])
    setTitle('')
  }

  function updateClip(id: string, patch: Partial<ClipItem>) {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function togglePlatform(id: string, key: keyof ClipItem['postedTo']) {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const postedTo = { ...c.postedTo, [key]: !c.postedTo[key] }
        const allPosted = Object.values(postedTo).every(Boolean)
        return { ...c, postedTo, status: allPosted ? 'posted' : c.status === 'posted' ? 'ready' : c.status }
      }),
    )
  }

  function removeClip(id: string) {
    setClips((prev) => prev.filter((c) => c.id !== id))
  }

  const sorted = [...clips].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Scissors size={16} className="text-gray-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Clip Pipeline</h2>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        One edit, every platform. Track each clip from raw footage through the platforms it still needs to go out to.
      </p>

      <Card className="p-5 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addClip()}
            placeholder="Clip title, e.g. Chat loses it over the clutch play"
            className="flex-1 bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
          />
          <input
            type="date"
            value={sourceDate}
            onChange={(e) => setSourceDate(e.target.value)}
            className="bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
          />
          <button
            onClick={addClip}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-smooth"
          >
            <Plus size={16} /> Add Clip
          </button>
        </div>
      </Card>

      {sorted.length > 0 && (
        <Card className="divide-y divide-base-border">
          {sorted.map((clip) => (
            <div key={clip.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-100 truncate">{clip.title}</p>
                <p className="text-xs text-gray-500">From stream on {clip.sourceDate}</p>
              </div>
              <select
                value={clip.status}
                onChange={(e) => updateClip(clip.id, { status: e.target.value as ClipStatus })}
                className={`text-xs font-medium px-2 py-1.5 rounded-lg border-none ${STATUS_STYLE[clip.status]}`}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s} className="bg-base-surface2 text-gray-100">
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3 flex-shrink-0">
                {PLATFORM_CHECKS.map((p) => (
                  <label key={p.key} className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clip.postedTo[p.key]}
                      onChange={() => togglePlatform(clip.id, p.key)}
                      className="accent-accent"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <button
                onClick={() => removeClip(clip.id)}
                className="text-gray-600 hover:text-status-bad transition-smooth flex-shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
