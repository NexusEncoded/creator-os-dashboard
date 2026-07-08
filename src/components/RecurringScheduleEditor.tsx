import { useState } from 'react'
import { Plus, Trash2, RotateCcw, CalendarSync } from 'lucide-react'
import { Card } from './ui/Card'
import { useServerStorage } from '../hooks/useServerStorage'
import { RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule } from '../services/scheduleService'
import { resetWeeksToDefault } from '../services/calendarService'
import { buildWeekTemplates, type ScheduleTemplate } from '../data/schedule'
import { PLATFORM_METRICS } from '../data/platforms'
import { CONTENT_PILLARS } from '../data/pillars'
import type { CalendarEntry, ContentPillarId, PlatformId } from '../types'

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function newSlotId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type PendingReset = 'schedule' | 'calendar' | null

export function RecurringScheduleEditor() {
  const [schedule, setSchedule] = useServerStorage<ScheduleTemplate[]>(RECURRING_SCHEDULE_KEY, getDefaultRecurringSchedule)
  const [entries, setEntries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [pendingReset, setPendingReset] = useState<PendingReset>(null)

  function updateSlot(id: string, patch: Partial<ScheduleTemplate>) {
    setSchedule((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function deleteSlot(id: string) {
    setSchedule((prev) => prev.filter((t) => t.id !== id))
  }

  function addSlot(dayOfWeek: number) {
    setSchedule((prev) => [
      ...prev,
      {
        id: newSlotId(),
        dayOfWeek,
        time: '12:00',
        platform: 'main-tiktok',
        pillar: 'discipline-routine',
        contentType: 'TikTok Video',
        enabled: true,
      },
    ])
  }

  function confirmReset() {
    if (pendingReset === 'schedule') {
      setSchedule(buildWeekTemplates())
    } else if (pendingReset === 'calendar') {
      const { entries: next, summary } = resetWeeksToDefault(entries, new Date(), schedule)
      setEntries(next)
      setResetMessage(
        summary.weeksReset === 0
          ? `No weeks needed resetting — ${summary.weeksProtected} week${summary.weeksProtected === 1 ? '' : 's'} had real activity and were left alone.`
          : `Regenerated ${summary.weeksReset} week${summary.weeksReset === 1 ? '' : 's'}. ${summary.weeksProtected} week${summary.weeksProtected === 1 ? '' : 's'} with real activity ${summary.weeksProtected === 1 ? 'was' : 'were'} left untouched.`,
      )
      setTimeout(() => setResetMessage(null), 6000)
    }
    setPendingReset(null)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs text-gray-500 leading-relaxed">
          Title is blank by default — each week gets a fresh suggestion from that slot's pillar idea bank instead of
          repeating the same title forever. Type a title to pin it as fixed for every week instead (e.g. a named
          recurring segment).
        </p>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <button
            onClick={() => setPendingReset('calendar')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-smooth whitespace-nowrap"
          >
            <CalendarSync size={12} /> Reset calendar to this schedule
          </button>
          <button
            onClick={() => setPendingReset('schedule')}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-status-bad transition-smooth whitespace-nowrap"
          >
            <RotateCcw size={12} /> Reset schedule to defaults
          </button>
        </div>
      </div>
      {pendingReset && (
        <div className="mb-3 px-3 py-2.5 rounded-lg bg-status-bad/10 border border-status-bad/30 flex items-start justify-between gap-3">
          <p className="text-xs text-gray-200 leading-relaxed">
            {pendingReset === 'schedule'
              ? "Reset the recurring schedule to the built-in defaults? Any slots you've edited or added will be lost."
              : "Regenerate the calendar from this schedule for every week except the current one? Weeks with any posted/in-progress entry, or any entry you added or edited by hand, are left untouched — only untouched, still-planned auto-generated weeks get regenerated."}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={confirmReset}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-status-bad/20 text-status-bad hover:bg-status-bad/30 transition-smooth"
            >
              Confirm
            </button>
            <button
              onClick={() => setPendingReset(null)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-base-surface2 text-gray-300 hover:bg-base-surface transition-smooth"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {resetMessage && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent">
          {resetMessage}
        </div>
      )}
      <div className="space-y-3">
        {DAY_LABELS.map((label, dayOfWeek) => {
          const daySlots = schedule.filter((t) => t.dayOfWeek === dayOfWeek).sort((a, b) => a.time.localeCompare(b.time))
          return (
            <Card key={dayOfWeek} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-100">{label}</h3>
                <button
                  onClick={() => addSlot(dayOfWeek)}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-smooth"
                >
                  <Plus size={12} /> Add slot
                </button>
              </div>
              {daySlots.length === 0 && <p className="text-xs text-gray-500">No scheduled posts.</p>}
              <div className="space-y-2">
                {daySlots.map((slot) => {
                  const platformLane = PLATFORM_METRICS.find((p) => p.id === slot.platform)?.lane
                  const pillarOptions = CONTENT_PILLARS.filter((p) => p.lane === platformLane)
                  return (
                    <div
                      key={slot.id}
                      className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 ${slot.enabled ? 'bg-base-surface2' : 'bg-base-surface2/40 opacity-60'}`}
                    >
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={(e) => updateSlot(slot.id, { enabled: e.target.checked })}
                        className="accent-accent"
                        title="Enabled"
                      />
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateSlot(slot.id, { time: e.target.value })}
                        className="bg-base-surface border border-base-border rounded px-2 py-1 text-xs text-gray-100"
                      />
                      <select
                        value={slot.platform}
                        onChange={(e) => {
                          const platform = e.target.value as PlatformId
                          const newLane = PLATFORM_METRICS.find((p) => p.id === platform)?.lane
                          const stillValid = CONTENT_PILLARS.some((p) => p.id === slot.pillar && p.lane === newLane)
                          updateSlot(slot.id, {
                            platform,
                            pillar: stillValid ? slot.pillar : (CONTENT_PILLARS.find((p) => p.lane === newLane)?.id ?? slot.pillar),
                          })
                        }}
                        className="bg-base-surface border border-base-border rounded px-2 py-1 text-xs text-gray-100"
                      >
                        {PLATFORM_METRICS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.pillar}
                        onChange={(e) => updateSlot(slot.id, { pillar: e.target.value as ContentPillarId })}
                        className="bg-base-surface border border-base-border rounded px-2 py-1 text-xs text-gray-100"
                      >
                        {pillarOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={slot.contentType}
                        onChange={(e) => updateSlot(slot.id, { contentType: e.target.value })}
                        placeholder="Content type"
                        className="bg-base-surface border border-base-border rounded px-2 py-1 text-xs text-gray-100 w-28"
                      />
                      <input
                        type="text"
                        value={slot.title ?? ''}
                        onChange={(e) => updateSlot(slot.id, { title: e.target.value || undefined })}
                        placeholder="Auto-suggested each week — type to pin a fixed title"
                        title="Leave blank to get a fresh title suggested from this pillar's idea bank every week. Set one to keep the exact same title every time."
                        className="bg-base-surface border border-base-border rounded px-2 py-1 text-xs text-gray-100 flex-1 min-w-[220px] placeholder:text-gray-600"
                      />
                      <button onClick={() => deleteSlot(slot.id)} className="text-status-bad hover:text-status-bad/80 transition-smooth">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
