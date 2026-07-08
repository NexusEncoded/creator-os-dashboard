import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { AUDIENCE_DEMOGRAPHICS, RECOMMENDED_POSTING_TIMES } from '../data/analytics'
import { buildAnalyticsInsights, buildPillarFrequency, buildPlatformSnapshot } from '../services/analyticsService'
import { getPlatformMetrics, getPlatformMetricsSync } from '../services/platformService'
import { useServerStorage } from '../hooks/useServerStorage'
import { QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS, type Quota } from '../services/quotaService'
import { ThumbsUp, AlertTriangle, Lightbulb, Clock, Info } from 'lucide-react'
import type { CalendarEntry, PlatformId } from '../types'

const SENTIMENT_STYLE: Record<string, { icon: typeof ThumbsUp; color: string; bg: string }> = {
  positive: { icon: ThumbsUp, color: 'text-status-good', bg: 'bg-status-good/15' },
  negative: { icon: AlertTriangle, color: 'text-status-bad', bg: 'bg-status-bad/15' },
  neutral: { icon: Lightbulb, color: 'text-accent', bg: 'bg-accent/15' },
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function Analytics() {
  const [metrics, setMetrics] = useState(() => getPlatformMetricsSync())
  const [entries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [quotas] = useServerStorage<Record<PlatformId, Quota>>(QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS)
  const anchor = useMemo(() => new Date(), [])

  useEffect(() => {
    let cancelled = false
    getPlatformMetrics().then((live) => {
      if (!cancelled) setMetrics(live)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const pillarRows = useMemo(() => buildPillarFrequency(entries), [entries])
  const platformSnapshot = useMemo(() => buildPlatformSnapshot(metrics), [metrics])
  const insights = useMemo(
    () => buildAnalyticsInsights(pillarRows, metrics, quotas, entries, anchor),
    [pillarRows, metrics, quotas, entries, anchor],
  )

  return (
    <div>
      <PageHeader
        title="Niche Analysis"
        subtitle="What's actually working across both brands, and where the next gain is hiding."
      />

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Pillar Posting Frequency</h2>
        <p className="text-xs text-gray-500 mb-3">
          Real counts from Calendar entries marked "Posted" — not a modeled quality score. None of the connected APIs
          expose per-post watch-through or save rates, so frequency is the honest signal available here.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">Main Brand</p>
            <div className="space-y-3">
              {pillarRows.filter((p) => p.lane === 'main').map((p) => (
                <div key={p.pillar}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-100 font-medium">{p.name}</span>
                    <span className="text-gray-400">{p.postedCount}</span>
                  </div>
                  <ProgressBar value={p.postedCount} max={p.maxInLane} color="#6C63FF" height={6} />
                  <p className="text-xs text-gray-500 mt-1">{p.note}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">Clips / Entertainment Brand</p>
            <div className="space-y-3">
              {pillarRows.filter((p) => p.lane === 'clips').map((p) => (
                <div key={p.pillar}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-100 font-medium">{p.name}</span>
                    <span className="text-gray-400">{p.postedCount}</span>
                  </div>
                  <ProgressBar value={p.postedCount} max={p.maxInLane} color="#9146FF" height={6} />
                  <p className="text-xs text-gray-500 mt-1">{p.note}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Platform Snapshot</h2>
        <p className="text-xs text-gray-500 mb-3">
          Ranked by each platform's own real recent-activity number — these aren't comparable apples-to-apples across
          platforms (see the label on each row for what's actually being measured), so treat this as "what's moving
          right now" per account, not a single unified leaderboard.
        </p>
        <Card className="divide-y divide-base-border">
          {platformSnapshot.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-100">{p.name}</span>
                {p.isLiveData && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-status-good/15 text-status-good">
                    LIVE
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-100">{p.isLiveData ? formatNumber(p.metricValue) : '—'}</p>
                <p className="text-xs text-gray-500">{p.metricLabel}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Audience Demographics</h2>
        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Illustrative, not measured — none of the connected APIs (Twitch Helix, YouTube Data API, Apify TikTok/Instagram
          scrapers) expose real audience demographics without deeper analytics access this app deliberately avoids.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(AUDIENCE_DEMOGRAPHICS).map((aud) => (
            <Card key={aud.label} className="p-5">
              <p className="text-sm font-semibold text-white mb-1">{aud.label}</p>
              <p className="text-xs text-gray-500 mb-4">Primary age range: {aud.ageRange}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Gender split</p>
                  <p className="text-gray-300">Women {aud.genderSplit.women}%</p>
                  <p className="text-gray-300">Men {aud.genderSplit.men}%</p>
                  <p className="text-gray-300">Other {aud.genderSplit.other}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Device</p>
                  <p className="text-gray-300">Mobile {aud.device.mobile}%</p>
                  <p className="text-gray-300">Desktop {aud.device.desktop}%</p>
                  <p className="text-gray-300">Tablet {aud.device.tablet}%</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1.5">Top regions</p>
                <div className="flex flex-wrap gap-1.5">
                  {aud.topRegions.map((r) => (
                    <span key={r} className="text-xs px-2 py-1 rounded-full bg-base-surface2 text-gray-300">{r}</span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <Clock size={14} /> Recommended Posting Times
        </h2>
        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Starting assumptions grounded in the real weekly schedule (Settings → Recurring Schedule), not a measured
          per-post analysis — no connected API exposes a "best time to post" figure for this account.
        </div>
        <Card className="divide-y divide-base-border">
          {RECOMMENDED_POSTING_TIMES.map((r) => (
            <div key={r.platform} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-5 py-3.5">
              <span className="text-sm font-medium text-gray-100">{r.platform}</span>
              <div className="flex flex-wrap gap-1.5">
                {r.windows.map((w) => (
                  <span key={w} className="text-xs px-2 py-1 rounded-full bg-base-surface2 text-gray-400">{w}</span>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">What's Working vs. What Needs Adjustment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight) => {
            const cfg = SENTIMENT_STYLE[insight.sentiment]
            const Icon = cfg.icon
            return (
              <Card key={insight.id} className="p-4 flex gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5">{insight.category}</p>
                  <p className="text-sm font-semibold text-gray-100">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.detail}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
