import { tasksForDay, isStreamDay, PRE_STREAM_TASKS, POST_STREAM_TASKS } from '../data/tasks'
import type { CalendarEntry, TaskItem } from '../types'

export interface CustomTask {
  id: string
  label: string
  recurring: 'daily' | 'weekly' | 'once'
  dayOfWeek?: number // used when recurring === 'weekly'
  date?: string // used when recurring === 'once', format YYYY-MM-DD
}

export function buildChecklist(dateStr: string, dayOfWeek: number, customTasks: CustomTask[]): TaskItem[] {
  const templateItems: TaskItem[] = tasksForDay(dayOfWeek).map((t) => ({
    id: t.id,
    label: t.label,
    platform: t.platform,
    done: false,
    custom: false,
  }))

  const applicableCustom = customTasks.filter((c) => {
    if (c.recurring === 'daily') return true
    if (c.recurring === 'weekly') return c.dayOfWeek === dayOfWeek
    return c.date === dateStr
  })

  const customItems: TaskItem[] = applicableCustom.map((c) => ({
    id: c.id,
    label: c.label,
    done: false,
    custom: true,
  }))

  return [...templateItems, ...customItems]
}

export function buildStreamChecklists(dayOfWeek: number): { pre: TaskItem[]; post: TaskItem[] } | null {
  if (!isStreamDay(dayOfWeek)) return null
  const toItems = (templates: typeof PRE_STREAM_TASKS): TaskItem[] =>
    templates.map((t) => ({ id: t.id, label: t.label, platform: t.platform, done: false, custom: false }))
  return { pre: toItems(PRE_STREAM_TASKS), post: toItems(POST_STREAM_TASKS) }
}

export function completionPct(items: TaskItem[]): number {
  if (items.length === 0) return 0
  const done = items.filter((i) => i.done).length
  return Math.round((done / items.length) * 100)
}

// The real "what do I need to post today" list — pulled straight from the
// Calendar instead of a generic duplicate label, so the title/pillar/time
// shown here is the actual planned content, and checking it off marks that
// same Calendar entry posted (single source of truth, no separate tracking).
export function contentTasksForDate(dateStr: string, calendarEntries: CalendarEntry[]): CalendarEntry[] {
  return calendarEntries.filter((e) => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time))
}

export function combinedCompletionPct(contentItems: CalendarEntry[], manualItems: TaskItem[]): number {
  const total = contentItems.length + manualItems.length
  if (total === 0) return 0
  const done = contentItems.filter((i) => i.status === 'posted').length + manualItems.filter((i) => i.done).length
  return Math.round((done / total) * 100)
}
