import type { AnalyticsInsight, CalendarEntry, ContentPillarId, PlatformId, PlatformMetric } from '../types'
import { CONTENT_PILLARS } from '../data/pillars'
import { DEFAULT_QUOTAS, countPostedThisWeek, type Quota } from './quotaService'

// "isLiveData" only means a real fetch has actually succeeded — Apify-backed
// platforms (TikTok/Instagram) can be genuinely connected (a username saved)
// but still waiting on an explicit refresh, which is meaningfully different
// from never having been connected at all.
function isConnectedPlatform(m: PlatformMetric): boolean {
  return Boolean(m.isLiveData || m.notFetched || m.liveError)
}

export interface PillarFrequencyRow {
  pillar: ContentPillarId
  lane: 'main' | 'clips'
  name: string
  postedCount: number
  maxInLane: number
  note: string
}

// Real per-video/per-post performance (watch-through, saves, etc.) isn't
// something any of the connected APIs expose at that granularity — so
// "pillar performance" here means the one thing that genuinely is real: how
// often each pillar actually gets posted, straight from Calendar entries
// marked "Posted". A pillar that never gets posted is a bigger problem than
// a low engagement score would have told you anyway.
export function buildPillarFrequency(entries: CalendarEntry[]): PillarFrequencyRow[] {
  const counts = new Map<ContentPillarId, number>()
  for (const e of entries) {
    if (e.status !== 'posted') continue
    counts.set(e.pillar, (counts.get(e.pillar) ?? 0) + 1)
  }

  const rows = CONTENT_PILLARS.map((p) => ({
    pillar: p.id,
    lane: p.lane,
    name: p.name,
    postedCount: counts.get(p.id) ?? 0,
  }))

  const maxMain = Math.max(1, ...rows.filter((r) => r.lane === 'main').map((r) => r.postedCount))
  const maxClips = Math.max(1, ...rows.filter((r) => r.lane === 'clips').map((r) => r.postedCount))

  return rows
    .map((r) => ({
      ...r,
      maxInLane: r.lane === 'main' ? maxMain : maxClips,
      note:
        r.postedCount === 0
          ? 'Never posted yet — mark a Calendar entry "Posted" to start tracking this pillar.'
          : `Posted ${r.postedCount} time${r.postedCount === 1 ? '' : 's'}, from your real Calendar history.`,
    }))
    .sort((a, b) => b.postedCount - a.postedCount)
}

export interface PlatformSnapshotRow {
  id: PlatformId
  name: string
  isLiveData: boolean
  metricLabel: string
  metricValue: number
}

// Ranks platforms by whatever real recent-activity number each one's API
// actually exposes (see services/platformService.ts for what each label
// honestly measures) — not a normalized "engagement score", since the
// underlying numbers aren't comparable like-for-like across platforms.
export function buildPlatformSnapshot(metrics: PlatformMetric[]): PlatformSnapshotRow[] {
  return [...metrics]
    .sort((a, b) => {
      if (a.isLiveData !== b.isLiveData) return a.isLiveData ? -1 : 1
      return b.totalViews - a.totalViews
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      isLiveData: Boolean(m.isLiveData),
      metricLabel: m.isLiveData ? m.viewsLabel : m.notFetched ? 'Connected — not fetched yet' : 'Not connected — mock data',
      metricValue: m.totalViews,
    }))
}

export function buildAnalyticsInsights(
  pillarRows: PillarFrequencyRow[],
  metrics: PlatformMetric[],
  quotas: Record<PlatformId, Quota>,
  entries: CalendarEntry[],
  anchor: Date,
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = []

  for (const lane of ['main', 'clips'] as const) {
    const laneRows = pillarRows.filter((r) => r.lane === lane)
    const topPosted = laneRows.filter((r) => r.postedCount > 0).sort((a, b) => b.postedCount - a.postedCount)[0]
    if (topPosted) {
      insights.push({
        id: `an-top-${lane}`,
        category: 'Working',
        title: `${topPosted.name} is your most-posted ${lane} pillar`,
        detail: `${topPosted.postedCount} post${topPosted.postedCount === 1 ? '' : 's'} logged as "Posted" on the Calendar — real posting frequency, not a modeled score.`,
        sentiment: 'positive',
      })
    }
    const neverPosted = laneRows.filter((r) => r.postedCount === 0)
    if (neverPosted.length > 0) {
      insights.push({
        id: `an-unused-${lane}`,
        category: 'Needs Adjustment',
        title: `${neverPosted.length} ${lane} pillar${neverPosted.length === 1 ? '' : 's'} never posted`,
        detail: `${neverPosted.map((r) => r.name).join(', ')} — either these need to actually get made, or they should come out of the rotation in Settings.`,
        sentiment: 'negative',
      })
    }
  }

  const connectedSorted = metrics.filter((m) => m.isLiveData).sort((a, b) => b.totalViews - a.totalViews)
  if (connectedSorted.length > 0) {
    const top = connectedSorted[0]
    insights.push({
      id: 'an-top-platform',
      category: 'Working',
      title: `${top.name} leads on recent activity`,
      detail: `${top.totalViews.toLocaleString()} ${top.viewsLabel} — the highest of your connected platforms right now.`,
      sentiment: 'positive',
    })
  }

  const postedThisWeek = countPostedThisWeek(entries, anchor)
  const shortfalls = metrics.filter((m) => {
    const quota = quotas[m.id] ?? DEFAULT_QUOTAS[m.id]
    return (postedThisWeek[m.id] ?? 0) < quota.minimum
  })
  if (shortfalls.length > 0) {
    insights.push({
      id: 'an-quota-shortfall',
      category: 'Needs Adjustment',
      title: `${shortfalls.length} platform${shortfalls.length === 1 ? ' is' : 's are'} under this week's posting floor`,
      detail: `${shortfalls.map((m) => m.name).join(', ')} — below the minimum set in Settings → Weekly Posting Quota.`,
      sentiment: 'negative',
    })
  }

  const notConnected = metrics.filter((m) => !isConnectedPlatform(m))
  if (notConnected.length > 0) {
    insights.push({
      id: 'an-not-connected',
      category: 'Opportunity',
      title: `${notConnected.length} platform${notConnected.length === 1 ? '' : 's'} not connected yet`,
      detail: `Connect ${notConnected.map((m) => m.name).join(', ')} in Settings to bring real activity data into this page.`,
      sentiment: 'neutral',
    })
  }

  const notFetched = metrics.filter((m) => m.notFetched)
  if (notFetched.length > 0) {
    insights.push({
      id: 'an-not-fetched',
      category: 'Opportunity',
      title: `${notFetched.length} connected platform${notFetched.length === 1 ? '' : 's'} not fetched yet`,
      detail: `${notFetched.map((m) => m.name).join(', ')} ${notFetched.length === 1 ? 'is' : 'are'} connected but still showing mock data — fetch ${notFetched.length === 1 ? 'it' : 'them'} from the Dashboard to bring real activity data into this page.`,
      sentiment: 'neutral',
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'an-empty',
      category: 'Opportunity',
      title: 'Not enough real history yet',
      detail: 'Post content, mark Calendar entries "Posted", and connect your platforms in Settings to start seeing real insights here.',
      sentiment: 'neutral',
    })
  }

  return insights
}
