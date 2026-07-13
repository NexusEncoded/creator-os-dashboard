import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  CalendarDays,
  Check,
  Trash2,
  X,
  Lock,
  Pencil,
  Lightbulb,
} from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { CalendarEntryModal } from '../components/CalendarEntryModal'
import { PlatformIcon } from '../components/ui/PlatformIcon'
import { useServerStorage } from '../hooks/useServerStorage'
import type { CalendarEntry, CalendarStatus, ContentPillarId, PlatformId, TaskItem } from '../types'
import { getWeekStart } from '../data/schedule'
import { clearDay, clearWeek, ensureWeekSeeded, formatTime12h, getWeekDates, toDateStr } from '../services/calendarService'
import { RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule } from '../services/scheduleService'
import {
  buildChecklist,
  buildStreamChecklists,
  contentTasksForDate,
  combinedCompletionPct,
  type CustomTask,
} from '../services/taskService'
import { PLATFORM_METRICS } from '../data/platforms'
import { CONTENT_PILLARS, getPillar } from '../data/pillars'
import { PRELOADED_IDEA_POOL, PILLAR_IDEA_BANK } from '../data/ideas'
import type { ScheduleTemplate } from '../data/schedule'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const STATUS_DOT: Record<CalendarStatus, string> = {
  planned: 'bg-gray-400',
  'in-progress': 'bg-status-watch',
  posted: 'bg-status-good',
  missed: 'bg-status-bad',
}

// Entries seeded from the recurring schedule (see Settings) are the
// "non-negotiables" — the fixed commitments that happen every week whether
// or not you add anything else. Everything else (typed in, picked from an
// idea, or AI-suggested via Fill Week) is an "extra." This is the same
// distinction resetWeeksToDefault already relies on to know what's safe to
// regenerate — surfaced here instead of just used internally.
function isNonNegotiable(entry: CalendarEntry): boolean {
  return entry.id.startsWith('seed-')
}

function platformColor(id: string) {
  return PLATFORM_METRICS.find((p) => p.id === id)?.brandColor ?? '#6C63FF'
}

function platformShortName(id: string) {
  return PLATFORM_METRICS.find((p) => p.id === id)?.name ?? id
}

function getMonthGridWeeks(anchor: Date): Date[] {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const gridStart = getWeekStart(firstOfMonth)
  const gridEndWeekStart = getWeekStart(lastOfMonth)
  const weeks: Date[] = []
  const cur = new Date(gridStart)
  while (cur.getTime() <= gridEndWeekStart.getTime()) {
    weeks.push(new Date(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return weeks
}

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

function ContentRow({
  item,
  locked,
  onTogglePosted,
  onEdit,
  onDelete,
}: {
  item: CalendarEntry
  locked: boolean
  onTogglePosted: (id: string) => void
  onEdit: (entry: CalendarEntry) => void
  onDelete?: (id: string) => void
}) {
  const done = item.status === 'posted'
  const pillar = getPillar(item.pillar)
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 group">
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
      {locked ? (
        <span title="Non-negotiable — edit via Settings > Recurring Schedule to change permanently" className="text-gray-600 flex-shrink-0">
          <Lock size={13} />
        </span>
      ) : (
        <>
          <button
            onClick={() => onEdit(item)}
            className="text-gray-600 hover:text-accent transition-smooth flex-shrink-0 opacity-0 group-hover:opacity-100"
          >
            <Pencil size={14} />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="text-gray-600 hover:text-status-bad transition-smooth flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function CalendarPage() {
  const [entries, setEntries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [customTasks, setCustomTasks] = useServerStorage<CustomTask[]>('creator-os-custom-tasks', [])
  const [completions, setCompletions] = useServerStorage<Record<string, Record<string, boolean>>>(
    'creator-os-task-completions',
    {},
  )
  const [recurringSchedule] = useServerStorage<ScheduleTemplate[]>(RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [anchor, setAnchor] = useState(() => new Date())
  const [modal, setModal] = useState<{ date: string; entry: CalendarEntry | null } | null>(null)
  const [fillMessage, setFillMessage] = useState<string | null>(null)
  const [confirmClearDay, setConfirmClearDay] = useState<string | null>(null)
  const [confirmClearWeek, setConfirmClearWeek] = useState(false)
  const [quickPillar, setQuickPillar] = useState<ContentPillarId>('story-reflection')
  const [customExtraTitle, setCustomExtraTitle] = useState('')
  const [newTaskLabel, setNewTaskLabel] = useState('')
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<'once' | 'daily' | 'weekly'>('once')
  const [searchParams, setSearchParams] = useSearchParams()

  const dateStr = toDateStr(anchor)
  const dayOfWeek = anchor.getDay()
  const weekStart = useMemo(() => getWeekStart(anchor), [anchor])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  // Arriving from Pillars' "Plan this pillar" link — land on Day view with
  // that pillar pre-picked in the quick-add section instead of making
  // someone re-select it, then drop the param so it doesn't stick around.
  useEffect(() => {
    const paramPillar = searchParams.get('pillar')
    if (!paramPillar) return
    if (CONTENT_PILLARS.some((p) => p.id === paramPillar)) {
      setQuickPillar(paramPillar as ContentPillarId)
      setViewMode('day')
      setTimeout(() => document.getElementById('add-extra')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (viewMode === 'month') {
      const weeks = getMonthGridWeeks(anchor)
      setEntries((prev) => weeks.reduce((acc, w) => ensureWeekSeeded(acc, w, recurringSchedule), prev))
    } else {
      setEntries((prev) => ensureWeekSeeded(prev, anchor, recurringSchedule))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, anchor.toDateString(), recurringSchedule])

  function entriesFor(ds: string) {
    return entries.filter((e) => e.date === ds).sort((a, b) => a.time.localeCompare(b.time))
  }

  function handleSave(entry: CalendarEntry) {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id)
      return exists ? prev.map((e) => (e.id === entry.id ? entry : e)) : [...prev, entry]
    })
    setModal(null)
  }

  function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setModal(null)
  }

  function togglePosted(id: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: e.status === 'posted' ? 'planned' : 'posted' } : e)),
    )
  }

  function handleClearDay(ds: string) {
    setEntries((prev) => clearDay(prev, ds))
    setConfirmClearDay(null)
  }

  function handleClearWeek() {
    setEntries((prev) => clearWeek(prev, anchor))
    setConfirmClearWeek(false)
  }

  // Quick-add for Day view: skips the full modal — picks a sensible time so
  // repeated quick-adds on the same day don't all stack at the same slot,
  // everything else defaults from the idea/pillar and can still be refined
  // later by clicking the entry (opens the same full modal).
  function addExtra(title: string, platform: PlatformId, pillar: ContentPillarId, contentType: string) {
    const todaysExtras = entriesFor(dateStr).filter((e) => !isNonNegotiable(e))
    const hour = 12 + (todaysExtras.length % 10)
    setEntries((prev) => [
      ...prev,
      {
        id: `entry-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        date: dateStr,
        time: `${String(hour).padStart(2, '0')}:00`,
        platform,
        pillar,
        contentType,
        title,
        status: 'planned',
      },
    ])
  }

  function addCustomExtra() {
    if (!customExtraTitle.trim()) return
    const pillarInfo = getPillar(quickPillar)
    addQuickFromPillar(customExtraTitle.trim(), pillarInfo?.platforms[0] ?? 'main-tiktok', 'Custom')
    setCustomExtraTitle('')
  }

  function addQuickFromPillar(title: string, platform: PlatformId, contentType: string) {
    addExtra(title, platform, quickPillar, contentType)
  }

  function fillWeek() {
    // Computed synchronously against the current `entries` state (rather than
    // inside the setEntries updater) so the "added" count used for the
    // confirmation message always matches what's actually written to state.
    // React 18 Strict Mode invokes state updater functions twice to check
    // purity, which would otherwise double-count a mutable counter closed
    // over by the updater.
    const next = [...entries]
    let added = 0
    const weekEntries = weekDates.map((d) => ({ date: toDateStr(d), items: next.filter((e) => e.date === toDateStr(d)) }))

    const hasLiveYoutube = weekEntries.some((w) => w.items.some((i) => i.platform === 'live-youtube'))
    if (!hasLiveYoutube) {
      const lightest = [...weekEntries].sort((a, b) => a.items.length - b.items.length)[0]
      next.push({
        id: `fill-${Date.now()}-yt`,
        date: lightest.date,
        time: '20:00',
        platform: 'live-youtube',
        pillar: 'vod-recaps',
        contentType: 'Stream Theme',
        title: 'VOD recap: condensed best-of from this week’s streams',
        status: 'planned',
        notes: 'Suggested by Fill Week AI',
      })
      added += 1
    }

    weekEntries.forEach((w, idx) => {
      const current = next.filter((e) => e.date === w.date)
      if (current.length < 4) {
        const idea = PRELOADED_IDEA_POOL[idx % PRELOADED_IDEA_POOL.length]
        const alreadyHas = current.some((e) => e.title === idea.title)
        if (!alreadyHas) {
          next.push({
            id: `fill-${Date.now()}-${idx}`,
            date: w.date,
            time: '19:00',
            platform: idea.platform,
            pillar: idea.pillar,
            contentType: idea.format,
            title: idea.title,
            status: 'planned',
            notes: 'Suggested by Fill Week AI',
          })
          added += 1
        }
      }
    })

    setEntries(next)
    setFillMessage(added > 0 ? `Added ${added} AI-suggested slot${added === 1 ? '' : 's'} to this week.` : 'This week is already fully scheduled.')
    setTimeout(() => setFillMessage(null), 4000)
  }

  function toggleTask(taskId: string) {
    setCompletions((prev) => {
      const dayMap = { ...(prev[dateStr] ?? {}) }
      dayMap[taskId] = !dayMap[taskId]
      return { ...prev, [dateStr]: dayMap }
    })
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

  function navigate(step: number) {
    const next = new Date(anchor)
    if (viewMode === 'day') next.setDate(next.getDate() + step)
    else if (viewMode === 'week') next.setDate(next.getDate() + step * 7)
    else next.setMonth(next.getMonth() + step)
    setAnchor(next)
  }

  const monthWeeks = viewMode === 'month' ? getMonthGridWeeks(anchor) : []
  const currentMonth = anchor.getMonth()

  // Day view data
  const dayEntries = entriesFor(dateStr)
  const nonNegotiables = dayEntries.filter(isNonNegotiable)
  const extras = dayEntries.filter((e) => !isNonNegotiable(e))
  const checklist = useMemo(() => {
    const items = buildChecklist(dateStr, dayOfWeek, customTasks)
    const dayCompletions = completions[dateStr] ?? {}
    return items.map((item) => ({ ...item, done: dayCompletions[item.id] ?? false }))
  }, [dateStr, dayOfWeek, customTasks, completions])
  const streamChecklists = useMemo(() => {
    const built = buildStreamChecklists(dayOfWeek)
    if (!built) return null
    const dayCompletions = completions[dateStr] ?? {}
    const applyDone = (items: TaskItem[]) => items.map((item) => ({ ...item, done: dayCompletions[item.id] ?? false }))
    return { pre: applyDone(built.pre), post: applyDone(built.post) }
  }, [dateStr, dayOfWeek, completions])
  const dayPct = combinedCompletionPct(dayEntries, checklist)
  const ideasForQuickPillar = PILLAR_IDEA_BANK[quickPillar] ?? []

  return (
    <div>
      <PageHeader
        title="Content Calendar"
        subtitle="Non-negotiables from your recurring schedule, plus whatever you add on top — one place for planning and doing."
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-base-surface2 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${viewMode === 'day' ? 'bg-accent text-white' : 'text-gray-400'}`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${viewMode === 'week' ? 'bg-accent text-white' : 'text-gray-400'}`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${viewMode === 'month' ? 'bg-accent text-white' : 'text-gray-400'}`}
              >
                Month
              </button>
            </div>
            <button
              onClick={fillWeek}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth"
            >
              <Sparkles size={16} /> Fill Week
            </button>
            <button
              onClick={() => setConfirmClearWeek(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-status-bad/15 text-status-bad hover:bg-status-bad/25 transition-smooth"
            >
              <Trash2 size={16} /> Clear Week
            </button>
          </div>
        }
      />

      {fillMessage && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-accent/10 border border-accent/30 text-sm text-accent">
          {fillMessage}
        </div>
      )}

      {confirmClearWeek && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-status-bad/10 border border-status-bad/30 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-200">
            Delete every entry in this week ({weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})? This can't be undone.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleClearWeek}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-status-bad/20 text-status-bad hover:bg-status-bad/30 transition-smooth"
            >
              Clear Week
            </button>
            <button
              onClick={() => setConfirmClearWeek(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-base-surface2 text-gray-300 hover:bg-base-surface transition-smooth"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-base-surface2 text-gray-400 transition-smooth">
            <ChevronLeft size={18} />
          </button>
          <span className="flex items-center gap-2 font-semibold text-white min-w-[180px]">
            <CalendarDays size={16} className="text-gray-500" />
            {viewMode === 'day'
              ? anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
              : viewMode === 'week'
                ? `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-base-surface2 text-gray-400 transition-smooth">
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={() => setAnchor(new Date())}
          className="text-sm text-gray-400 hover:text-white transition-smooth"
        >
          Today
        </button>
      </div>

      {viewMode === 'day' && (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-6">
            {weekDates.map((d) => {
              const ds = toDateStr(d)
              const isSelected = ds === dateStr
              return (
                <button
                  key={ds}
                  onClick={() => setAnchor(d)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-smooth ${
                    isSelected ? 'border-accent bg-accent/10' : 'border-base-border bg-base-surface hover:bg-base-surface2'
                  }`}
                >
                  <span className="text-xs text-gray-500">{DAY_LABELS[d.getDay()]}</span>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-accent' : 'text-gray-200'}`}>{d.getDate()}</span>
                  <span className="text-[10px] text-gray-500">{pctForDate(d)}%</span>
                </button>
              )
            })}
          </div>

          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-white">{DAY_LABELS_FULL[dayOfWeek]}</p>
              <span className="text-sm font-semibold text-accent">{dayPct}% complete</span>
            </div>
            <ProgressBar value={dayPct} max={100} color="#6C63FF" height={6} />
          </Card>

          <div className="mb-6">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <Lock size={12} /> Non-Negotiables
            </p>
            {nonNegotiables.length === 0 ? (
              <Card className="p-5 text-center">
                <p className="text-sm text-gray-500">Nothing fixed for this day.</p>
              </Card>
            ) : (
              <Card className="divide-y divide-base-border">
                {nonNegotiables.map((item) => (
                  <ContentRow key={item.id} item={item} locked onTogglePosted={togglePosted} onEdit={(e) => setModal({ date: dateStr, entry: e })} />
                ))}
              </Card>
            )}
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Extras</p>
            {extras.length === 0 ? (
              <Card className="p-5 text-center">
                <p className="text-sm text-gray-500">Nothing extra added yet — pick something below.</p>
              </Card>
            ) : (
              <Card className="divide-y divide-base-border">
                {extras.map((item) => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    locked={false}
                    onTogglePosted={togglePosted}
                    onEdit={(e) => setModal({ date: dateStr, entry: e })}
                    onDelete={handleDelete}
                  />
                ))}
              </Card>
            )}
          </div>

          <Card id="add-extra" className="p-5 mb-6">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white mb-3">
              <Lightbulb size={15} className="text-accent" /> Add something extra
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CONTENT_PILLARS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setQuickPillar(p.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-smooth ${
                    quickPillar === p.id ? 'bg-accent text-white' : 'bg-base-surface2 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ideasForQuickPillar.map((idea) => (
                <button
                  key={idea.title}
                  onClick={() => addQuickFromPillar(idea.title, idea.platform, idea.format)}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left bg-base-surface2 text-gray-300 border border-transparent hover:border-accent/40 hover:text-white transition-smooth"
                >
                  + {idea.title}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customExtraTitle}
                onChange={(e) => setCustomExtraTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomExtra()}
                placeholder="Or type your own..."
                className="flex-1 bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
              />
              <button
                onClick={addCustomExtra}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-smooth"
              >
                <Plus size={16} /> Add
              </button>
              <button
                onClick={() => setModal({ date: dateStr, entry: null })}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-base-surface2 transition-smooth"
              >
                Custom entry...
              </button>
            </div>
          </Card>

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
        </div>
      )}

      {viewMode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDates.map((date) => {
            const ds = toDateStr(date)
            const items = entriesFor(ds)
            const isToday = ds === toDateStr(new Date())
            return (
              <Card key={ds} className={`p-3 flex flex-col gap-2 min-h-[220px] ${isToday ? 'border-accent/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <button onClick={() => { setAnchor(date); setViewMode('day') }} className="text-left">
                    <p className="text-xs text-gray-500">{DAY_LABELS[date.getDay()]}</p>
                    <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-white'}`}>{date.getDate()}</p>
                  </button>
                  <div className="flex items-center gap-0.5">
                    {items.length > 0 && (
                      <button
                        onClick={() => setConfirmClearDay(ds)}
                        title="Clear this day"
                        className="p-1 rounded-md text-gray-500 hover:text-status-bad hover:bg-base-surface2 transition-smooth"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setModal({ date: ds, entry: null })}
                      className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-base-surface2 transition-smooth"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                {confirmClearDay === ds && (
                  <div className="flex flex-col gap-1.5 px-2 py-2 rounded-lg bg-status-bad/10 border border-status-bad/30">
                    <p className="text-[11px] text-gray-200">Clear all {items.length} entries for this day?</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleClearDay(ds)}
                        className="flex-1 px-2 py-1 rounded text-[11px] font-medium bg-status-bad/20 text-status-bad hover:bg-status-bad/30 transition-smooth"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setConfirmClearDay(null)}
                        className="p-1 rounded text-gray-400 hover:text-white transition-smooth"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  {items.map((item) => {
                    const isPosted = item.status === 'posted'
                    const locked = isNonNegotiable(item)
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-smooth hover:opacity-90"
                        style={{ backgroundColor: `${platformColor(item.platform)}1A`, borderLeft: `3px solid ${platformColor(item.platform)}` }}
                      >
                        <button
                          onClick={() => togglePosted(item.id)}
                          title={isPosted ? 'Mark not posted' : 'Mark posted'}
                          className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0 border transition-smooth ${
                            isPosted ? 'bg-status-good border-status-good' : 'border-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {isPosted && <Check size={11} className="text-white" />}
                        </button>
                        <button onClick={() => setModal({ date: ds, entry: item })} className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium text-gray-200 flex items-center gap-1">
                              {formatTime12h(item.time)}
                              {locked && <Lock size={9} className="text-gray-500" />}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status]}`} />
                          </div>
                          <p className={`truncate ${isPosted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{item.title}</p>
                          <p className="text-gray-500 truncate">{platformShortName(item.platform)} · {getPillar(item.pillar)?.name}</p>
                        </button>
                      </div>
                    )
                  })}
                  {items.length === 0 && <p className="text-xs text-gray-600 italic">No content scheduled</p>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {viewMode === 'month' && (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 font-medium">
            {DAY_LABELS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          {monthWeeks.map((weekStartDate) => {
            const days = getWeekDates(weekStartDate)
            return (
              <div key={weekStartDate.toISOString()} className="grid grid-cols-7 gap-2">
                {days.map((date) => {
                  const ds = toDateStr(date)
                  const items = entriesFor(ds)
                  const inMonth = date.getMonth() === currentMonth
                  const isToday = ds === toDateStr(new Date())
                  return (
                    <Card
                      key={ds}
                      onClick={() => { setAnchor(date); setViewMode('day') }}
                      className={`p-2 min-h-[92px] cursor-pointer transition-smooth hover:border-accent/40 ${inMonth ? '' : 'opacity-40'} ${isToday ? 'border-accent/50' : ''}`}
                    >
                      <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-accent' : 'text-gray-300'}`}>{date.getDate()}</p>
                      <div className="flex flex-col gap-1">
                        {items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setModal({ date: ds, entry: item })
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1"
                            style={{ backgroundColor: `${platformColor(item.platform)}22`, color: platformColor(item.platform) }}
                          >
                            {isNonNegotiable(item) && <Lock size={8} className="flex-shrink-0" />}
                            {item.title}
                          </div>
                        ))}
                        {items.length > 3 && <p className="text-[10px] text-gray-500">+{items.length - 3} more</p>}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <CalendarEntryModal
          initialDate={modal.date}
          entry={modal.entry}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
