import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Sparkles, CalendarDays, Check } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { CalendarEntryModal } from '../components/CalendarEntryModal'
import { useServerStorage } from '../hooks/useServerStorage'
import type { CalendarEntry, CalendarStatus } from '../types'
import { getWeekStart } from '../data/schedule'
import { ensureWeekSeeded, getWeekDates, toDateStr } from '../services/calendarService'
import { RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule } from '../services/scheduleService'
import { PLATFORM_METRICS } from '../data/platforms'
import { getPillar } from '../data/pillars'
import { PRELOADED_IDEA_POOL } from '../data/ideas'
import type { ScheduleTemplate } from '../data/schedule'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_DOT: Record<CalendarStatus, string> = {
  planned: 'bg-gray-400',
  'in-progress': 'bg-status-watch',
  posted: 'bg-status-good',
  missed: 'bg-status-bad',
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

export function CalendarPage() {
  const [entries, setEntries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [recurringSchedule] = useServerStorage<ScheduleTemplate[]>(RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [modal, setModal] = useState<{ date: string; entry: CalendarEntry | null } | null>(null)
  const [fillMessage, setFillMessage] = useState<string | null>(null)

  const weekStart = useMemo(() => getWeekStart(anchor), [anchor])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  useEffect(() => {
    if (viewMode === 'week') {
      setEntries((prev) => ensureWeekSeeded(prev, anchor, recurringSchedule))
    } else {
      const weeks = getMonthGridWeeks(anchor)
      setEntries((prev) => weeks.reduce((acc, w) => ensureWeekSeeded(acc, w, recurringSchedule), prev))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, anchor.toDateString(), recurringSchedule])

  function entriesFor(dateStr: string) {
    return entries.filter((e) => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time))
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

  function navigate(step: number) {
    const next = new Date(anchor)
    if (viewMode === 'week') next.setDate(next.getDate() + step * 7)
    else next.setMonth(next.getMonth() + step)
    setAnchor(next)
  }

  const monthWeeks = viewMode === 'month' ? getMonthGridWeeks(anchor) : []
  const currentMonth = anchor.getMonth()

  return (
    <div>
      <PageHeader
        title="Content Calendar"
        subtitle="Sunday through Saturday, pre-populated with your Twitch, YouTube, and daily posting schedule."
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-base-surface2 rounded-lg p-1">
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
          </div>
        }
      />

      {fillMessage && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-accent/10 border border-accent/30 text-sm text-accent">
          {fillMessage}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-base-surface2 text-gray-400 transition-smooth">
            <ChevronLeft size={18} />
          </button>
          <span className="flex items-center gap-2 font-semibold text-white min-w-[180px]">
            <CalendarDays size={16} className="text-gray-500" />
            {viewMode === 'week'
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

      {viewMode === 'week' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDates.map((date) => {
            const dateStr = toDateStr(date)
            const items = entriesFor(dateStr)
            const isToday = dateStr === toDateStr(new Date())
            return (
              <Card key={dateStr} className={`p-3 flex flex-col gap-2 min-h-[220px] ${isToday ? 'border-accent/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{DAY_LABELS[date.getDay()]}</p>
                    <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-white'}`}>{date.getDate()}</p>
                  </div>
                  <button
                    onClick={() => setModal({ date: dateStr, entry: null })}
                    className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-base-surface2 transition-smooth"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((item) => {
                    const isPosted = item.status === 'posted'
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
                        <button onClick={() => setModal({ date: dateStr, entry: item })} className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium text-gray-200">{item.time}</span>
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
      ) : (
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
                  const dateStr = toDateStr(date)
                  const items = entriesFor(dateStr)
                  const inMonth = date.getMonth() === currentMonth
                  const isToday = dateStr === toDateStr(new Date())
                  return (
                    <Card
                      key={dateStr}
                      onClick={() => setModal({ date: dateStr, entry: null })}
                      className={`p-2 min-h-[92px] cursor-pointer transition-smooth hover:border-accent/40 ${inMonth ? '' : 'opacity-40'} ${isToday ? 'border-accent/50' : ''}`}
                    >
                      <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-accent' : 'text-gray-300'}`}>{date.getDate()}</p>
                      <div className="flex flex-col gap-1">
                        {items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setModal({ date: dateStr, entry: item })
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded truncate"
                            style={{ backgroundColor: `${platformColor(item.platform)}22`, color: platformColor(item.platform) }}
                          >
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
