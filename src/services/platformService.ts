import { PLATFORM_METRICS } from '../data/platforms'
import type { PlatformMetric } from '../types'
import { API_BASE } from './connectionsService'
import { getGoals, computeStatus } from './goalsService'
import { fetchAppData, pushAppData } from './appDataService'

/**
 * Data layer boundary for platform metrics.
 *
 * Live data flows through the local backend in server/ (see server/SETUP.md):
 *  - YouTube Data API v3 (channels.list, part=statistics) -> main-youtube / live-youtube
 *  - TikTok via Apify (clockworks/tiktok-scraper) -> main-tiktok / clips-tiktok
 *  - Twitch Helix API (Get Channel Followers, Get Streams) -> twitch
 *  - Instagram via Apify (apify/instagram-profile-scraper) -> main-instagram / clips-instagram
 *
 * YouTube/TikTok/Instagram each support two connected accounts (main +
 * clips-or-live); Twitch has just one. Every page consumes this through
 * getPlatformMetrics(), which always resolves — if the backend is offline or
 * a given slot isn't connected yet, that card silently falls back to mock
 * data instead of breaking the page.
 *
 * The "views" stat is real where a real number exists, but what it actually
 * measures varies by platform — none of these APIs expose a true
 * "views this week" figure without deeper analytics access than this app
 * uses, so each one is labeled for what it honestly is:
 *  - YouTube: lifetime total channel views (not weekly)
 *  - TikTok: summed playCount across the last 10 videos (not a fixed window)
 *  - Twitch: current viewer count, only while actually live
 *  - Instagram: likes+comments across the last ~12 posts (an engagement
 *    proxy, not real reach/impressions — Instagram doesn't expose those
 *    without the official Insights API this app deliberately avoids)
 */
interface SlotMetrics {
  connected: boolean
  followers?: number
  subscribers?: number
  totalViews?: number
  recentViews?: number
  recentVideoCount?: number
  recentEngagement?: number
  recentPostCount?: number
  error?: string
  // Only ever set for Apify-backed (tiktok/instagram) slots — see
  // server/index.js. The background poll behind /api/metrics never spends
  // Apify budget on its own, so these slots come back as either the last
  // real fetch (marked stale) or never-yet-fetched, instead of always fresh.
  notFetched?: boolean
  stale?: boolean
  lastFetchedAt?: number
}

interface BackendMetricsResponse {
  twitch?: {
    connected: boolean
    followers?: number
    subscribers?: number
    isLive?: boolean
    viewerCount?: number
    error?: string
  }
  youtube?: { main?: SlotMetrics; live?: SlotMetrics }
  tiktok?: { main?: SlotMetrics; clips?: SlotMetrics }
  instagram?: { main?: SlotMetrics; clips?: SlotMetrics }
}

async function fetchBackendMetrics(): Promise<BackendMetricsResponse | null> {
  try {
    // Apify-backed platforms (TikTok/Instagram) can take 5-15s per cold call,
    // and the backend caches results afterward — but the very first request
    // after a backend restart still has to pay that cost, so this timeout
    // needs real headroom rather than a snappy-UI-sized one.
    const res = await fetch(`${API_BASE}/api/metrics`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    return (await res.json()) as BackendMetricsResponse
  } catch {
    return null
  }
}

interface ViewsOverride {
  value: number
  label: string
}

function applyLive(
  base: PlatformMetric,
  followers: number | undefined,
  error: string | undefined,
  goal: number,
  liveNote?: string,
  views?: ViewsOverride,
  subscriberCount?: number,
): PlatformMetric {
  if (error) return { ...base, liveError: error }
  if (followers === undefined) return base
  return {
    ...base,
    followers,
    goal,
    status: computeStatus(followers, goal),
    isLiveData: true,
    liveNote,
    subscriberCount,
    ...(views ? { totalViews: views.value, viewsLabel: views.label } : {}),
  }
}

function applySlot(
  base: PlatformMetric,
  slot: SlotMetrics | undefined,
  goal: number,
  views?: ViewsOverride,
  isManualRefresh = false,
): PlatformMetric {
  if (!slot?.connected) return base
  if (slot.notFetched) return { ...base, isLiveData: false, notFetched: true, isManualRefresh }
  const withLive = applyLive(base, slot.followers ?? slot.subscribers, slot.error, goal, undefined, views)
  if (isManualRefresh) {
    return { ...withLive, isManualRefresh, ...(slot.stale ? { stale: true, lastFetchedAt: slot.lastFetchedAt } : {}) }
  }
  return withLive
}

// Real week-over-week growth needs a time series, and a single live API call
// only ever returns a point-in-time follower count. So each time live
// metrics are fetched, today's count gets appended to a small history log
// (synced to the backend like everything else in useServerStorage) — once a
// snapshot from ~7 days ago exists, weeklyGrowth/weeklyGrowthPct become real
// instead of the mock placeholders. Until then hasGrowthHistory stays false
// and callers should say so honestly rather than showing "+0%".
const FOLLOWER_HISTORY_KEY = 'creator-os-follower-history'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const HALF_DAY_MS = 12 * 60 * 60 * 1000

interface HistoryPoint {
  date: string
  followers: number
}
type FollowerHistory = Partial<Record<string, HistoryPoint[]>>

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

async function recordAndDiffGrowth(liveMetrics: PlatformMetric[]): Promise<Map<string, { delta: number; pct: number }>> {
  const history = (await fetchAppData<FollowerHistory>(FOLLOWER_HISTORY_KEY)) ?? {}
  const today = todayStr()
  let changed = false

  for (const m of liveMetrics) {
    if (!m.isLiveData) continue
    const points = history[m.id] ?? []
    if (points.some((p) => p.date === today)) continue
    history[m.id] = [...points, { date: today, followers: m.followers }].slice(-90)
    changed = true
  }
  if (changed) await pushAppData(FOLLOWER_HISTORY_KEY, history)

  const now = Date.now()
  const result = new Map<string, { delta: number; pct: number }>()
  for (const m of liveMetrics) {
    if (!m.isLiveData) continue
    const points = history[m.id] ?? []
    let best: HistoryPoint | null = null
    for (const p of points) {
      const t = new Date(p.date).getTime()
      if (now - t >= SEVEN_DAYS_MS - HALF_DAY_MS && (!best || t > new Date(best.date).getTime())) {
        best = p
      }
    }
    if (best) {
      const delta = m.followers - best.followers
      result.set(m.id, { delta, pct: best.followers > 0 ? Number(((delta / best.followers) * 100).toFixed(1)) : 0 })
    }
  }
  return result
}

export async function getPlatformMetrics(): Promise<PlatformMetric[]> {
  const live = await fetchBackendMetrics()
  if (!live) return PLATFORM_METRICS

  const goals = getGoals()

  const mapped = PLATFORM_METRICS.map((metric) => {
    const goal = goals[metric.id] ?? metric.goal
    switch (metric.id) {
      case 'twitch': {
        if (!live.twitch?.connected) return metric
        const views = live.twitch.isLive
          ? { value: live.twitch.viewerCount ?? 0, label: 'watching now' }
          : undefined
        return applyLive(
          metric,
          live.twitch.followers,
          live.twitch.error,
          goal,
          live.twitch.isLive ? `Live now — ${live.twitch.viewerCount ?? 0} watching` : undefined,
          views,
          live.twitch.subscribers,
        )
      }
      case 'main-youtube':
      case 'live-youtube': {
        const slot = metric.id === 'main-youtube' ? live.youtube?.main : live.youtube?.live
        const views = slot?.totalViews !== undefined ? { value: slot.totalViews, label: 'total views (lifetime)' } : undefined
        return applySlot(metric, slot, goal, views)
      }
      case 'main-tiktok':
      case 'clips-tiktok': {
        const slot = metric.id === 'main-tiktok' ? live.tiktok?.main : live.tiktok?.clips
        const views =
          slot?.recentViews !== undefined
            ? { value: slot.recentViews, label: `views (last ${slot.recentVideoCount ?? 10} posts)` }
            : undefined
        return applySlot(metric, slot, goal, views, true)
      }
      case 'main-instagram':
      case 'clips-instagram': {
        const slot = metric.id === 'main-instagram' ? live.instagram?.main : live.instagram?.clips
        const views =
          slot?.recentEngagement !== undefined
            ? { value: slot.recentEngagement, label: `likes+comments (last ${slot.recentPostCount ?? 12} posts)` }
            : undefined
        return applySlot(metric, slot, goal, views, true)
      }
      default:
        return metric
    }
  })

  const growth = await recordAndDiffGrowth(mapped)
  return mapped.map((m) => {
    if (!m.isLiveData) return m
    const g = growth.get(m.id)
    if (!g) return { ...m, weeklyGrowth: 0, weeklyGrowthPct: 0, hasGrowthHistory: false }
    return { ...m, weeklyGrowth: g.delta, weeklyGrowthPct: g.pct, hasGrowthHistory: true }
  })
}

const MANUAL_PLATFORM_MAP: Partial<Record<string, { platform: string; slot: string }>> = {
  'main-tiktok': { platform: 'tiktok', slot: 'main' },
  'clips-tiktok': { platform: 'tiktok', slot: 'clips' },
  'main-instagram': { platform: 'instagram', slot: 'main' },
  'clips-instagram': { platform: 'instagram', slot: 'clips' },
}

// Explicitly triggers a real (paid) Apify scrape for one TikTok/Instagram
// slot and returns its updated metric — the only path that spends Apify
// budget for these platforms now that the background poll doesn't. Pass in
// the current metrics list so an unrelated platform's real weekly-growth
// numbers aren't recomputed against a stale snapshot.
export async function refreshManualPlatform(id: string, currentMetrics: PlatformMetric[]): Promise<PlatformMetric | null> {
  const target = MANUAL_PLATFORM_MAP[id]
  const base = PLATFORM_METRICS.find((m) => m.id === id)
  if (!target || !base) return null

  try {
    const res = await fetch(`${API_BASE}/api/metrics/${target.platform}?slot=${target.slot}`, {
      method: 'POST',
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const slot = (await res.json()) as SlotMetrics
    const goals = getGoals()
    const goal = goals[base.id] ?? base.goal
    const views =
      slot.recentViews !== undefined
        ? { value: slot.recentViews, label: `views (last ${slot.recentVideoCount ?? 10} posts)` }
        : slot.recentEngagement !== undefined
          ? { value: slot.recentEngagement, label: `likes+comments (last ${slot.recentPostCount ?? 12} posts)` }
          : undefined
    let updated = applySlot(base, slot, goal, views, true)

    if (updated.isLiveData) {
      const growth = await recordAndDiffGrowth(currentMetrics.map((m) => (m.id === id ? updated : m)))
      const g = growth.get(id)
      updated = g ? { ...updated, weeklyGrowth: g.delta, weeklyGrowthPct: g.pct, hasGrowthHistory: true } : updated
    }

    return updated
  } catch {
    return null
  }
}

export function getPlatformMetricsSync(): PlatformMetric[] {
  return PLATFORM_METRICS
}

export function getPlatformById(id: string): PlatformMetric | undefined {
  return PLATFORM_METRICS.find((p) => p.id === id)
}

export function platformName(id: string): string {
  return PLATFORM_METRICS.find((p) => p.id === id)?.name ?? id
}
