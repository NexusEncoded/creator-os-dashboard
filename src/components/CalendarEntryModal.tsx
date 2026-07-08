import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { CalendarEntry, CalendarStatus, ContentPillarId, PlatformId } from '../types'
import { PLATFORM_METRICS } from '../data/platforms'
import { CONTENT_PILLARS } from '../data/pillars'

interface Props {
  initialDate: string
  entry: CalendarEntry | null
  onClose: () => void
  onSave: (entry: CalendarEntry) => void
  onDelete?: (id: string) => void
}

const STATUS_OPTIONS: CalendarStatus[] = ['planned', 'in-progress', 'posted', 'missed']

export function CalendarEntryModal({ initialDate, entry, onClose, onSave, onDelete }: Props) {
  const [date, setDate] = useState(entry?.date ?? initialDate)
  const [time, setTime] = useState(entry?.time ?? '09:00')
  const [platform, setPlatform] = useState<PlatformId>(entry?.platform ?? 'main-tiktok')
  const [pillar, setPillar] = useState<ContentPillarId>(entry?.pillar ?? 'story-reflection')
  const [contentType, setContentType] = useState(entry?.contentType ?? 'TikTok Video')
  const [title, setTitle] = useState(entry?.title ?? '')
  const [status, setStatus] = useState<CalendarStatus>(entry?.status ?? 'planned')
  const [notes, setNotes] = useState(entry?.notes ?? '')

  function handleSave() {
    if (!title.trim()) return
    onSave({
      id: entry?.id ?? `entry-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      date,
      time,
      platform,
      pillar,
      contentType,
      title: title.trim(),
      status,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="bg-base-surface border border-base-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-border sticky top-0 bg-base-surface">
          <h3 className="font-semibold text-white">{entry ? 'Edit Content' : 'Add Content'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-smooth">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you posting?"
              className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformId)}
                className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
              >
                {PLATFORM_METRICS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pillar</label>
              <select
                value={pillar}
                onChange={(e) => setPillar(e.target.value as ContentPillarId)}
                className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
              >
                {CONTENT_PILLARS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Content Type</label>
              <input
                type="text"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                placeholder="e.g. Reel, Vlog, Clip"
                className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CalendarStatus)}
                className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100 capitalize"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('-', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-base-border">
          {entry && onDelete ? (
            <button
              onClick={() => onDelete(entry.id)}
              className="flex items-center gap-1.5 text-sm text-status-bad hover:text-red-400 transition-smooth"
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-base-surface2 transition-smooth"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-smooth"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
