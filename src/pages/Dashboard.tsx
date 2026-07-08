import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { PlatformCard } from '../components/PlatformCard'
import { QuotaTracker } from '../components/QuotaTracker'
import { getPlatformMetrics, getPlatformMetricsSync } from '../services/platformService'
import { buildFocusActions } from '../services/growthService'
import { useServerStorage } from '../hooks/useServerStorage'
import { QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS, type Quota } from '../services/quotaService'
import { Flame, Users, TrendingUp, CircleCheck } from 'lucide-react'
import type { CalendarEntry, PlatformId } from '../types'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function Dashboard() {
  // Renders instantly from mock data, then quietly upgrades any connected
  // platform's card to live numbers once the backend responds.
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

  const mainMetrics = metrics.filter((m) => m.lane === 'main')
  const clipsMetrics = metrics.filter((m) => m.lane === 'clips')

  const totalFollowers = metrics.reduce((sum, m) => sum + m.followers, 0)
  const totalWeeklyGrowth = metrics.reduce((sum, m) => sum + m.weeklyGrowth, 0)
  const onTrackCount = metrics.filter((m) => m.status === 'good').length
  const topFocus = useMemo(() => buildFocusActions(metrics, entries, quotas, anchor)[0], [metrics, entries, quotas, anchor])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live metrics across all 7 platforms — TikTok first, Twitch second, YouTube third."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Users size={14} /> Total Audience
          </div>
          <p className="text-2xl font-bold text-white">{formatNumber(totalFollowers)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <TrendingUp size={14} /> Weekly Growth
          </div>
          <p className="text-2xl font-bold text-status-good">+{formatNumber(totalWeeklyGrowth)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <CircleCheck size={14} /> Platforms On Track
          </div>
          <p className="text-2xl font-bold text-white">{onTrackCount} / {metrics.length}</p>
        </Card>
        <Card className="p-4 border-accent/40">
          <div className="flex items-center gap-2 text-accent text-xs mb-2">
            <Flame size={14} /> This Week's #1 Focus
          </div>
          <p className="text-sm font-semibold text-white leading-snug">{topFocus.action}</p>
        </Card>
      </div>

      <div className="mb-6">
        <QuotaTracker />
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Main Brand — Personality / Lifestyle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mainMetrics.map((m) => (
            <PlatformCard key={m.id} metric={m} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Clips / Entertainment Brand
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clipsMetrics.map((m) => (
            <PlatformCard key={m.id} metric={m} />
          ))}
        </div>
      </section>
    </div>
  )
}
