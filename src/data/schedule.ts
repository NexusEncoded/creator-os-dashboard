import type { CalendarEntry, ContentPillarId, PlatformId } from '../types'
import { PILLAR_IDEA_BANK } from './ideas'
import { getPillar } from './pillars'

export interface ScheduleTemplate {
  id: string
  dayOfWeek: number // 0 = Sunday ... 6 = Saturday
  time: string
  platform: PlatformId
  pillar: ContentPillarId
  contentType: string
  // Optional. Leave unset to get a fresh title auto-suggested from the
  // pillar's idea bank every week (so a recurring slot doesn't post the
  // literal same title forever) — set it to pin a fixed, always-identical
  // title instead, for genuine recurring series (e.g. a named weekly segment).
  title?: string
  enabled: boolean
}

function slotId(platform: PlatformId, dayOfWeek: number, time: string): string {
  return `${platform}-${dayOfWeek}-${time}`
}

// Main TikTok rotation matches the creator's real Notion posting flow:
// one pillar per day, at that pillar's researched best-performing time.
// Indexed by dayOfWeek (0 = Sun ... 6 = Sat). Titles are intentionally left
// out here — see generateWeekEntries, which suggests a fresh one from the
// pillar's idea bank each week instead of repeating the same text forever.
const mainTikTokDaily: { pillar: ContentPillarId; time: string }[] = [
  { pillar: 'story-reflection', time: '18:00' },
  { pillar: 'discipline-routine', time: '19:00' },
  { pillar: 'young-professional', time: '19:00' },
  { pillar: 'behind-the-content', time: '12:00' },
  { pillar: 'hot-takes', time: '19:00' },
  { pillar: 'vlog-teasers', time: '17:00' },
  { pillar: 'value-tips', time: '11:00' },
]

// Second daily Main TikTok slot — a deliberate test based on one real
// posted video (a relatable/rant-style clip) pulling ~24x reach relative to
// follower count. Placed at 8am since it needs zero advance filming (just
// talk to camera, post same day), unlike the primary slot's pillars which
// range from talking-head to fully pre-shot cinematic cuts. Defaults to
// Hot Takes; swaps to Story & Reflection on the one day (Thursday) where
// the primary slot is already Hot Takes, so the day doesn't double-tag.
const mainTikTokRant: { pillar: ContentPillarId }[] = [
  { pillar: 'hot-takes' },
  { pillar: 'hot-takes' },
  { pillar: 'hot-takes' },
  { pillar: 'hot-takes' },
  { pillar: 'story-reflection' },
  { pillar: 'hot-takes' },
  { pillar: 'hot-takes' },
]

// Clips TikTok "Best Pick" windows from the real posting-time research.
const clipsTikTokDaily: { pillar: ContentPillarId; time: string }[] = [
  { pillar: 'stream-highlights', time: '12:00' },
  { pillar: 'stream-highlights', time: '19:00' },
  { pillar: 'stream-highlights', time: '19:00' },
  { pillar: 'funny-fails', time: '12:00' },
  { pillar: 'community-moments', time: '19:00' },
  { pillar: 'funny-fails', time: '17:00' },
  { pillar: 'raw-unfiltered', time: '11:00' },
]

// Clips Instagram mirrors Clips TikTok ~45-60 min later (the "stagger
// rule" — prevents duplicate-content suppression, different caption style).
const clipsInstagramDaily = clipsTikTokDaily.map((c) => ({
  ...c,
  time: `${String(Number(c.time.split(':')[0]) + 1).padStart(2, '0')}:${c.time.split(':')[1]}`,
}))

const mainInstagramDays = [1, 3, 5] // Mon / Wed / Fri — cross-posted from that day's TikTok winner
const mainInstagramContent: Record<number, { pillar: ContentPillarId; time: string }> = {
  1: { pillar: 'discipline-routine', time: '20:00' },
  3: { pillar: 'behind-the-content', time: '13:00' },
  5: { pillar: 'vlog-teasers', time: '18:00' },
}

function makeStatic(dayOfWeek: number, time: string, platform: PlatformId, pillar: ContentPillarId, contentType: string, title?: string): ScheduleTemplate {
  return { id: slotId(platform, dayOfWeek, time), dayOfWeek, time, platform, pillar, contentType, title, enabled: true }
}

export const STATIC_TEMPLATES: ScheduleTemplate[] = [
  // Twitch — Tue 9:30pm, Thu 9:30pm, Sun 3:00pm (real researched start times)
  makeStatic(2, '21:30', 'twitch', 'stream-highlights', 'Livestream'),
  makeStatic(4, '21:30', 'twitch', 'stream-highlights', 'Livestream'),
  makeStatic(0, '15:00', 'twitch', 'stream-highlights', 'Livestream'),
  // Main TikTok simulcasts live with every Twitch stream — same event every
  // time, so this one keeps a fixed, always-identical title on purpose.
  makeStatic(2, '21:30', 'main-tiktok', 'young-professional', 'Live', 'TikTok Live (simulcast w/ Twitch)'),
  makeStatic(4, '21:30', 'main-tiktok', 'hot-takes', 'Live', 'TikTok Live (simulcast w/ Twitch)'),
  makeStatic(0, '15:00', 'main-tiktok', 'story-reflection', 'Live', 'TikTok Live (simulcast w/ Twitch)'),
  // Main YouTube — weekly Sunday vlog, uploaded in the 12-3pm ET indexing window
  makeStatic(0, '13:00', 'main-youtube', 'story-reflection', 'Vlog'),
]

// The default recurring schedule — also doubles as the seed value for the
// user-editable copy stored via useServerStorage('creator-os-recurring-schedule').
// Edit times/pillars/titles for individual slots in Settings rather than here
// once you've got real preferences; this only sets the starting point.
export function buildWeekTemplates(): ScheduleTemplate[] {
  const templates: ScheduleTemplate[] = [...STATIC_TEMPLATES]

  for (let d = 0; d < 7; d++) {
    templates.push(makeStatic(d, mainTikTokDaily[d].time, 'main-tiktok', mainTikTokDaily[d].pillar, 'TikTok Video'))
    templates.push(makeStatic(d, '08:00', 'main-tiktok', mainTikTokRant[d].pillar, 'Rant/Reaction'))
    templates.push(makeStatic(d, clipsTikTokDaily[d].time, 'clips-tiktok', clipsTikTokDaily[d].pillar, 'Clip'))
    templates.push(makeStatic(d, clipsInstagramDaily[d].time, 'clips-instagram', clipsInstagramDaily[d].pillar, 'Reel'))
  }

  for (const d of mainInstagramDays) {
    templates.push(makeStatic(d, mainInstagramContent[d].time, 'main-instagram', mainInstagramContent[d].pillar, 'Reel'))
  }

  return templates
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

// Resolves the actual title for a generated entry. An explicit tpl.title
// always wins (for slots meant to be identical every week, like the TikTok
// Live simulcast). Otherwise, a title is picked from the pillar's idea bank,
// rotating deterministically by week so re-rendering the same week always
// gives the same suggestion, but a new week gets a different one — this is
// what actually makes the schedule "recurring" without posting the same
// content topic on repeat forever.
function resolveTitle(tpl: ScheduleTemplate, weekIndex: number): string {
  if (tpl.title) return tpl.title
  const bank = PILLAR_IDEA_BANK[tpl.pillar]
  if (bank && bank.length > 0) {
    const idx = (weekIndex + tpl.dayOfWeek) % bank.length
    return bank[idx].title
  }
  return `${tpl.contentType} — ${getPillar(tpl.pillar)?.name ?? tpl.pillar}`
}

// Generates concrete calendar entries for the Sun-Sat week containing
// `anchor`. Pass the user's own edited recurring schedule (from
// services/scheduleService.ts) so seeding respects their real preferences —
// falls back to the built-in default if omitted.
export function generateWeekEntries(anchor: Date, templates: ScheduleTemplate[] = buildWeekTemplates()): CalendarEntry[] {
  const weekStart = getWeekStart(anchor)
  const weekIndex = Math.floor(weekStart.getTime() / MS_PER_WEEK)
  const entries: CalendarEntry[] = []

  for (const tpl of templates.filter((t) => t.enabled)) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + tpl.dayOfWeek)
    const dateStr = toDateStr(date)
    entries.push({
      id: `seed-${dateStr}-${tpl.platform}-${tpl.time}`,
      date: dateStr,
      time: tpl.time,
      platform: tpl.platform,
      pillar: tpl.pillar,
      contentType: tpl.contentType,
      title: resolveTitle(tpl, weekIndex),
      status: 'planned',
    })
  }

  return entries.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}
