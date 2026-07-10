import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Pencil } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { CalendarEntryModal } from '../components/CalendarEntryModal'
import { useServerStorage } from '../hooks/useServerStorage'
import {
  buildChecklist,
  buildStreamChecklists,
  completionPct,
  contentTasksForDate,
  combinedCompletionPct,
  type CustomTask,
} from '../services/taskService'
import { toDateStr, ensureWeekSeeded, formatTime12h } from '../services/calendarService'
import { RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule } from '../services/scheduleService'
import { getWeekStart } from '../data/schedule'
import type { ScheduleTemplate } from '../data/schedule'
import { PlatformIcon } from '../components/ui/PlatformIcon'
import { getPillar } from '../data/pillars'
import type { CalendarEntry, TaskItem } from '../types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ChecklistCard({
  items,
  onToggle,
  onRemoveCustom,
}: {
  items: TaskItem[]
  onToggle: (id: string) => void
  onRemoveCustom?: (id: string) => void
}) {
  return (
    <Card className="divide-y divide-base-border">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
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
          </div>
          {item.platform && (
            <span className="text-gray-500 flex-shrink-0">
              <PlatformIcon platform={item.platform} size={16} />
            </span>
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
      ))}
      {items.length === 0 && <p className="px-5 py-6 text-sm text-gray-500 text-center">No tasks for this day yet.</p>}
    </Card>
  )
}

function ContentChecklistCard({
  items,
  onTogglePosted,
  onEdit,
}: {
  items: CalendarEntry[]
  onTogglePosted: (id: string) => void
  onEdit: (entry: CalendarEntry) => void
}) {
  if (items.length === 0) {
    return (
      <Card className="p-5 text-center">
        <p className="text-sm text-gray-500">Nothing scheduled for this day yet.</p>
        <p className="text-xs text-gray-600 mt-1">Plan it on the Calendar page, or use "Fill Week" there.</p>
      </Card>
    )
  }

  return (
    <Card className="divide-y divide-base-border">
      {items.map((item) => {
        const done = item.status === 'posted'
        const pillar = getPillar(item.pillar)
        return (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 group">
            <button
              onClick={() => onTogglePosted(item.id)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-smooth ${
                done ? 'bg-status-good border-status-good' : 'border-gray-600'
              }`}
            >
              {done && <Check size={14} className="text-white" />}
            </button>
            <button onClick={() => onEdit(item)} className="flex-1 min-w-0 text-left">
              <p className={`text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{item.title}</p>
              <p className="text-xs text-gray-500 truncate">
                {formatTime12h(item.time)} · {pillar?.name ?? item.pillar} · {item.contentType}
              </p>
            </button>
            <span className="text-gray-500 flex-shrink-0">
              <PlatformIcon platform={item.platform} size={16} />
            </span>
            <button
              onClick={() => onEdit(item)}
              className="text-gray-600 hover:text-accent transition-smooth flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <Pencil size={14} />
            </button>
          </div>
        )
      })}
    </Card>
  )
}

export function Tasks() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [entries, setEntries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [customTasks, setCustomTasks] = useServerStorage<CustomTask[]>('creator-os-custom-tasks', [])
  const [completions, setCompletions] = useServerStorage<Record<string, Record<string, boolean>>>(
    'creator-os-task-completions',
    {},
  )
  const [recurringSchedule] = useServerStorage<ScheduleTemplate[]>(RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule)
  const [newTaskLabel, setNewTaskLabel] = useState('')
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<'once' | 'daily' | 'weekly'>('once')
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null)

  const dateStr = toDateStr(selectedDate)
  const dayOfWeek = selectedDate.getDay()

  // Mirrors Calendar.tsx's own seeding so Tasks works even if you land here
  // before ever opening the Calendar page.
  useEffect(() => {
    setEntries((prev) => ensureWeekSeeded(prev, selectedDate, recurringSchedule))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate.toDateString(), recurringSchedule])

  const contentItems = useMemo(() => contentTasksForDate(dateStr, entries), [dateStr, entries])

  const checklist = useMemo(() => {
    const items = buildChecklist(dateStr, dayOfWeek, customTasks)
    const dayCompletions = completions[dateStr] ?? {}
    return items.map((item) => ({ ...item, done: dayCompletions[item.id] ?? false }))
  }, [dateStr, dayOfWeek, customTasks, completions])

  const pct = combinedCompletionPct(contentItems, checklist)

  const streamChecklists = useMemo(() => {
    const built = buildStreamChecklists(dayOfWeek)
    if (!built) return null
    const dayCompletions = completions[dateStr] ?? {}
    const applyDone = (items: TaskItem[]) => items.map((item) => ({ ...item, done: dayCompletions[item.id] ?? false }))
    return { pre: applyDone(built.pre), post: applyDone(built.post) }
  }, [dateStr, dayOfWeek, completions])

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate])
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }),
    [weekStart],
  )

  function toggleTask(taskId: string) {
    setCompletions((prev) => {
      const dayMap = { ...(prev[dateStr] ?? {}) }
      dayMap[taskId] = !dayMap[taskId]
      return { ...prev, [dateStr]: dayMap }
    })
  }

  function togglePosted(entryId: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, status: e.status === 'posted' ? 'planned' : 'posted' } : e)),
    )
  }

  function saveEntry(updated: CalendarEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setEditingEntry(null)
  }

  function addCustomTask() {
    if (!newTaskLabel.trim()) return
    const task: CustomTask = {
      id: `custom-${Date.now()}`,
      label: newTaskLabel.trim(),
      recurring: newTaskRecurrence,
      dayOfWeek: newTaskRecurrence === 'weekly' ? dayOfWeek : undefined,
      date: newTaskRecurrence === 'once' ? dateStr : undefined,
    }
    setCustomTasks((prev) => [...prev, task])
    setNewTaskLabel('')
  }

  function removeCustomTask(id: string) {
    setCustomTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function pctForDate(d: Date) {
    const ds = toDateStr(d)
    const dow = d.getDay()
    const items = buildChecklist(ds, dow, customTasks)
    const dayCompletions = completions[ds] ?? {}
    const withDone = items.map((i) => ({ ...i, done: dayCompletions[i.id] ?? false }))
    return combinedCompletionPct(contentTasksForDate(ds, entries), withDone)
  }

  return (
    <div>
      <PageHeader
        title="Tasks & Checklist"
        subtitle="Today's real content, pulled from your Calendar — check it off here or there, same data."
      />

      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDates.map((d) => {
          const ds = toDateStr(d)
          const isSelected = ds === dateStr
          const dayPct = pctForDate(d)
          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-smooth ${
                isSelected ? 'border-accent bg-accent/10' : 'border-base-border bg-base-surface hover:bg-base-surface2'
              }`}
            >
              <span className="text-xs text-gray-500">{DAY_LABELS[d.getDay()]}</span>
              <span className={`text-sm font-semibold ${isSelected ? 'text-accent' : 'text-gray-200'}`}>{d.getDate()}</span>
              <span className="text-[10px] text-gray-500">{dayPct}%</span>
            </button>
          )
        })}
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })} className="p-1.5 rounded-lg hover:bg-base-surface2 text-gray-400">
              <ChevronLeft size={16} />
            </button>
            <p className="font-semibold text-white">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })} className="p-1.5 rounded-lg hover:bg-base-surface2 text-gray-400">
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-sm font-semibold text-accent">{pct}% complete</span>
        </div>
        <ProgressBar value={pct} max={100} color="#6C63FF" height={6} />
      </Card>

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Today's Content</p>
        <ContentChecklistCard items={contentItems} onTogglePosted={togglePosted} onEdit={setEditingEntry} />
      </div>

      {checklist.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Other Tasks</p>
          <ChecklistCard items={checklist} onToggle={toggleTask} onRemoveCustom={removeCustomTask} />
        </div>
      )}

      {streamChecklists && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Pre-Stream Checklist</p>
            <ChecklistCard items={streamChecklists.pre} onToggle={toggleTask} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Post-Stream Checklist</p>
            <ChecklistCard items={streamChecklists.post} onToggle={toggleTask} />
          </div>
        </div>
      )}

      <Card className="p-5">
        <p className="text-sm font-semibold text-white mb-3">Add a custom task</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newTaskLabel}
            onChange={(e) => setNewTaskLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
            placeholder="e.g. Reply to top 10 Twitch DMs"
            className="flex-1 bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
          />
          <select
            value={newTaskRecurrence}
            onChange={(e) => setNewTaskRecurrence(e.target.value as 'once' | 'daily' | 'weekly')}
            className="bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
          >
            <option value="once">Just today</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every {DAY_LABELS[dayOfWeek]}</option>
          </select>
          <button
            onClick={addCustomTask}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-smooth"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </Card>

      {editingEntry && (
        <CalendarEntryModal
          initialDate={editingEntry.date}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={saveEntry}
        />
      )}
    </div>
  )
}
