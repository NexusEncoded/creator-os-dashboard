import { useState } from 'react'
import { Check, Trash2, NotebookPen } from 'lucide-react'
import { Card } from './ui/Card'
import { PlatformIcon } from './ui/PlatformIcon'
import type { TaskItem } from '../types'

interface ChecklistCardProps {
  items: TaskItem[]
  onToggle: (id: string) => void
  onRemoveCustom?: (id: string) => void
  // Optional per-item free text — e.g. jotting down the actual stream title
  // once you've picked it, instead of the checklist only ever being a
  // checkbox. Omit onNoteChange entirely to hide the note affordance where
  // it doesn't make sense.
  notes?: Record<string, string>
  onNoteChange?: (id: string, value: string) => void
}

export function ChecklistCard({ items, onToggle, onRemoveCustom, notes, onNoteChange }: ChecklistCardProps) {
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)

  return (
    <Card className="divide-y divide-base-border">
      {items.map((item) => {
        const note = notes?.[item.id] ?? ''
        const noteOpen = openNoteId === item.id
        return (
          <div key={item.id} className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggle(item.id)}
                className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-smooth ${
                  item.done ? 'bg-accent border-accent' : 'border-gray-600'
                }`}
              >
                {item.done && <Check size={14} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{item.label}</p>
                {note && !noteOpen && <p className="text-xs text-accent truncate mt-0.5">{note}</p>}
              </div>
              {item.platform && (
                <span className="text-gray-500 flex-shrink-0">
                  <PlatformIcon platform={item.platform} size={16} />
                </span>
              )}
              {onNoteChange && (
                <button
                  onClick={() => setOpenNoteId(noteOpen ? null : item.id)}
                  title={note ? 'Edit note' : 'Add a note'}
                  className={`flex-shrink-0 transition-smooth ${note ? 'text-accent' : 'text-gray-600 hover:text-gray-300'}`}
                >
                  <NotebookPen size={15} />
                </button>
              )}
              {item.custom && onRemoveCustom && (
                <button
                  onClick={() => onRemoveCustom(item.id)}
                  className="text-gray-600 hover:text-status-bad transition-smooth flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            {noteOpen && onNoteChange && (
              <input
                type="text"
                autoFocus
                value={note}
                onChange={(e) => onNoteChange(item.id, e.target.value)}
                onBlur={() => setOpenNoteId(null)}
                onKeyDown={(e) => e.key === 'Enter' && setOpenNoteId(null)}
                placeholder="e.g. Stream title, game/category..."
                className="mt-2 w-full bg-base-surface2 border border-base-border rounded-lg px-3 py-1.5 text-xs text-gray-100"
              />
            )}
          </div>
        )
      })}
      {items.length === 0 && <p className="px-5 py-6 text-sm text-gray-500 text-center">No tasks for this day yet.</p>}
    </Card>
  )
}
