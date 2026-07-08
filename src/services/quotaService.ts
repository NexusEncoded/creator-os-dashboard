import type { CalendarEntry, PlatformId } from '../types'

export const QUOTAS_STORAGE_KEY = 'creator-os-quotas'

export interface Quota {
  goal: number
  minimum: number
}

// Seeded from the creator's own posting rhythm (streams Tue/Thu/Sun, daily
// TikTok/clips, weekly vlog) — same spirit as a "goal vs realistic minimum"
// posting tracker, editable in Settings.
export const DEFAULT_QUOTAS: Record<PlatformId, Quota> = {
  twitch: { goal: 3, minimum: 2 },
  // Bumped to 14 (2x/day) for the rant-focused posting test — the extra
  // slot is the low-prep Hot Takes/Story rant, stacked on top of the
  // existing 1x/day pillar rotation. Revert to 7/5 if the test doesn't pan out.
  'main-tiktok': { goal: 14, minimum: 10 },
  'clips-tiktok': { goal: 5, minimum: 4 },
  'main-instagram': { goal: 3, minimum: 2 },
  'clips-instagram': { goal: 5, minimum: 3 },
  'main-youtube': { goal: 1, minimum: 1 },
  'live-youtube': { goal: 3, minimum: 2 },
}

export function getQuotas(): Record<PlatformId, Quota> {
  try {
    const stored = window.localStorage.getItem(QUOTAS_STORAGE_KEY)
    if (!stored) return DEFAULT_QUOTAS
    return { ...DEFAULT_QUOTAS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_QUOTAS
  }
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

// Counts calendar entries marked "posted" within the Sun-Sat week containing
// `anchor`, grouped by platform — the tracker's "actual" column comes
// straight from the same Calendar data already being maintained, no new
// data entry required.
export function countPostedThisWeek(entries: CalendarEntry[], anchor: Date): Record<PlatformId, number> {
  const weekStart = getWeekStart(anchor)
  const weekDates = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return toDateStr(d)
    }),
  )

  const counts: Partial<Record<PlatformId, number>> = {}
  for (const entry of entries) {
    if (entry.status !== 'posted') continue
    if (!weekDates.has(entry.date)) continue
    counts[entry.platform] = (counts[entry.platform] ?? 0) + 1
  }
  return counts as Record<PlatformId, number>
}
