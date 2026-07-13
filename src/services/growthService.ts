import type { CalendarEntry, FocusAction, GrowthInsight, PlatformId, PlatformMetric } from '../types'
import { DEFAULT_QUOTAS, countPostedThisWeek, type Quota } from './quotaService'

// "isLiveData" only means a real fetch has actually succeeded — Apify-backed
// platforms (TikTok/Instagram) can be genuinely connected (a username saved)
// but still waiting on an explicit refresh (see PlatformCard's "Fetch now"),
// or briefly erroring. Both of those are meaningfully different from never
// having been connected at all, and were getting flattened into the same
// "not connected — mock data" messaging.
function isConnectedPlatform(m: PlatformMetric): boolean {
  return Boolean(m.isLiveData || m.notFetched || m.liveError)
}

// Qualitative posting-strategy advice per platform, grounded in the real
// weekly schedule (see data/schedule.ts) — this is workflow guidance, not a
// claim about measured analytics. Combined below with real, data-driven
// signals (quota shortfalls, real weekly growth, status vs. goal) rather
// than standing in for them.
const STRATEGY_NOTES: Partial<Record<PlatformId, string>> = {
  'clips-tiktok': 'Post the stream highlight clip within 60 minutes of ending a stream — same-day posts consistently reach further than next-day posts.',
  twitch: 'Hold the Tue/Thu 9:30 PM and Sun 3:00 PM start times with zero exceptions — recurring viewers drop off fast when start times move around.',
  'main-tiktok': 'Keep simulcasting every Twitch stream to TikTok Live — it is the cheapest discovery funnel into Twitch you have.',
  'main-youtube': 'Batch-film B-roll during the week so Sunday editing stays under 3 hours and the upload never slips.',
  'main-instagram': 'Repurpose the best-performing TikTok of the week into a Reel the same day instead of writing new Instagram content from scratch.',
  'live-youtube': 'Hold off on a fixed live schedule here — use it as a VOD/recap archive until Twitch is consistently past its goal.',
}

export function buildFocusActions(
  metrics: PlatformMetric[],
  entries: CalendarEntry[],
  quotas: Record<PlatformId, Quota>,
  anchor: Date,
): FocusAction[] {
  const postedThisWeek = countPostedThisWeek(entries, anchor)

  return metrics.map((m) => {
    const quota = quotas[m.id] ?? DEFAULT_QUOTAS[m.id]
    const posted = postedThisWeek[m.id] ?? 0
    const strategy = STRATEGY_NOTES[m.id]

    if (m.notFetched) {
      return {
        platform: m.id,
        action: strategy ?? `Click "Fetch now" on ${m.name}'s Dashboard card to pull real numbers.`,
        reason: strategy
          ? `Connected, but not fetched yet — this is workflow strategy rather than a signal from your real ${m.name} account.`
          : `Connected, but not fetched yet — this card is still showing mock data until you refresh it.`,
      }
    }

    if (!m.isLiveData) {
      return {
        platform: m.id,
        action: strategy ?? `Connect ${m.name} in Settings to unlock a data-driven focus action here.`,
        reason: strategy
          ? `Not connected yet, so this is workflow strategy rather than a signal from your real ${m.name} account.`
          : `Not connected yet — this card is still showing mock data.`,
      }
    }

    if (posted < quota.minimum) {
      const remaining = quota.minimum - posted
      return {
        platform: m.id,
        action: `Post ${remaining} more time${remaining === 1 ? '' : 's'} on ${m.name} before the week resets.`,
        reason: `${posted}/${quota.goal} posted this week — below the ${quota.minimum} floor.${strategy ? ` ${strategy}` : ''}`,
      }
    }

    return {
      platform: m.id,
      action: strategy ?? `Keep the current ${m.name} posting rhythm going.`,
      reason: m.hasGrowthHistory
        ? `On pace this week (${posted}/${quota.goal} posted, ${m.weeklyGrowthPct >= 0 ? '+' : ''}${m.weeklyGrowthPct}% followers over 7 days).`
        : `On pace this week (${posted}/${quota.goal} posted). Real weekly growth will show here once a week of follower history builds up.`,
    }
  })
}

export function buildGrowthInsights(metrics: PlatformMetric[]): GrowthInsight[] {
  const insights: GrowthInsight[] = []
  const connected = metrics.filter((m) => m.isLiveData)
  const withHistory = connected.filter((m) => m.hasGrowthHistory)

  if (withHistory.length > 0) {
    const fastest = [...withHistory].sort((a, b) => b.weeklyGrowthPct - a.weeklyGrowthPct)[0]
    if (fastest.weeklyGrowth !== 0) {
      insights.push({
        id: 'insight-fastest-grower',
        platform: fastest.id,
        title: `${fastest.name} is growing fastest this week`,
        detail: `${fastest.weeklyGrowth >= 0 ? '+' : ''}${fastest.weeklyGrowth.toLocaleString()} followers (${fastest.weeklyGrowthPct >= 0 ? '+' : ''}${fastest.weeklyGrowthPct}%) over the last 7 days — real numbers from your connected account.`,
        impact: 'high',
      })
    }
  }

  for (const m of connected) {
    if (m.status === 'bad') {
      insights.push({
        id: `insight-behind-${m.id}`,
        platform: m.id,
        title: `${m.name} is behind its follower goal`,
        detail: `${m.followers.toLocaleString()} of ${m.goal.toLocaleString()} — well below pace. Worth checking whether the goal or the posting rhythm needs to change.`,
        impact: 'high',
      })
    }
  }

  const notConnected = metrics.filter((m) => !isConnectedPlatform(m))
  if (notConnected.length > 0) {
    insights.push({
      id: 'insight-not-connected',
      platform: 'cross-platform',
      title: `${notConnected.length} platform${notConnected.length === 1 ? '' : 's'} still showing mock data`,
      detail: `Connect ${notConnected.map((m) => m.name).join(', ')} in Settings to replace ${notConnected.length === 1 ? 'it' : 'them'} with real growth insights.`,
      impact: 'medium',
    })
  }

  const notFetched = metrics.filter((m) => m.notFetched)
  if (notFetched.length > 0) {
    insights.push({
      id: 'insight-not-fetched',
      platform: 'cross-platform',
      title: `${notFetched.length} connected platform${notFetched.length === 1 ? '' : 's'} not fetched yet`,
      detail: `${notFetched.map((m) => m.name).join(', ')} ${notFetched.length === 1 ? 'is' : 'are'} connected but still showing mock data — click "Fetch now" on ${notFetched.length === 1 ? 'its' : 'their'} Dashboard card to pull real numbers.`,
      impact: 'medium',
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'insight-gathering',
      platform: 'cross-platform',
      title: 'Still gathering data',
      detail: 'Once your connected platforms build up a week of follower history, real growth insights will appear here.',
      impact: 'low',
    })
  }

  return insights
}

interface WeeklyReportMetric {
  label: string
  value: string
  trend: 'up' | 'down'
}

export interface WeeklyReport {
  summary: string
  metrics: WeeklyReportMetric[]
}

export function buildWeeklyReport(metrics: PlatformMetric[], entries: CalendarEntry[], anchor: Date): WeeklyReport {
  const reallyConnected = metrics.filter(isConnectedPlatform)
  const connected = metrics.filter((m) => m.isLiveData)
  const withHistory = connected.filter((m) => m.hasGrowthHistory)
  const totalGrowth = withHistory.reduce((sum, m) => sum + m.weeklyGrowth, 0)
  const postedThisWeek = countPostedThisWeek(entries, anchor)
  const totalPosted = Object.values(postedThisWeek).reduce((sum: number, n) => sum + (n ?? 0), 0)
  const behindPace = connected.filter((m) => m.status === 'bad').length

  let summary: string
  if (reallyConnected.length === 0) {
    summary =
      'No platforms are connected yet, so everything below is mock data. Connect at least one platform in Settings to start seeing a real weekly report.'
  } else if (withHistory.length === 0) {
    summary = `${reallyConnected.length} platform${reallyConnected.length === 1 ? ' is' : 's are'} connected, but there isn't a week of follower history yet — real growth numbers will appear here in a few days${connected.length < reallyConnected.length ? ' once fetched' : ''}. In the meantime, you've posted ${totalPosted} time${totalPosted === 1 ? '' : 's'} across all platforms this week.`
  } else {
    const leader = [...withHistory].sort((a, b) => b.weeklyGrowthPct - a.weeklyGrowthPct)[0]
    summary = `${leader.name} is leading growth this week at ${leader.weeklyGrowthPct >= 0 ? '+' : ''}${leader.weeklyGrowthPct}%. ${
      behindPace > 0
        ? `${behindPace} platform${behindPace === 1 ? ' is' : 's are'} behind its follower goal.`
        : 'All connected platforms are on pace toward their goals.'
    } You've posted ${totalPosted} time${totalPosted === 1 ? '' : 's'} across all platforms this week.`
  }

  return {
    summary,
    metrics: [
      {
        label: 'Followers gained (connected, 7-day history)',
        value: withHistory.length > 0 ? `${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toLocaleString()}` : 'Gathering data',
        trend: totalGrowth >= 0 ? 'up' : 'down',
      },
      {
        label: 'Platforms connected',
        value: `${reallyConnected.length} of ${metrics.length}`,
        trend: reallyConnected.length > 0 ? 'up' : 'down',
      },
      {
        label: 'Posts published this week',
        value: `${totalPosted}`,
        trend: 'up',
      },
      {
        label: 'Platforms behind goal pace',
        value: `${behindPace} of ${connected.length || metrics.length}`,
        trend: behindPace === 0 ? 'up' : 'down',
      },
    ],
  }
}
