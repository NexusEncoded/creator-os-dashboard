import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { PlatformCard } from '../components/PlatformCard'
import { QuotaTracker } from '../components/QuotaTracker'
import { getPlatformMetrics, getPlatformMetricsSync, refreshManualPlatform } from '../services/platformService'
import { buildFocusActions } from '../services/growthService'
import { buildChecklist, type CustomTask } from '../services/taskService'
import { toDateStr } from '../services/calendarService'
import { useServerStorage } from '../hooks/useServerStorage'
import { QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS, type Quota } from '../services/quotaService'
import { PlatformIcon } from '../components/ui/PlatformIcon'
import { Flame, Users, TrendingUp, CircleCheck, Check, ArrowRight } from 'lucide-react'
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
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [entries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [quotas] = useServerStorage<Record<PlatformId, Quota>>(QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS)
  const [customTasks] = useServerStorage<CustomTask[]>('creator-os-custom-tasks', [])
  const [completions, setCompletions] = useServerStorage<Record<string, Record<string, boolean>>>(
    'creator-os-task-completions',
    {},
  )
  const anchor = useMemo(() => new Date(), [])
  const todayStr = toDateStr(anchor)
  const todayChecklist = useMemo(() => {
    const items = buildChecklist(todayStr, anchor.getDay(), customTasks)
    const dayCompletions = completions[todayStr] ?? {}
    return items.map((item) => ({ ...item, done: dayCompletions[item.id] ?? false }))
  }, [todayStr, anchor, customTasks, completions])

  function toggleTodayTask(taskId: string) {
    setCompletions((prev) => {
      const dayMap = { ...(prev[todayStr] ?? {}) }
      dayMap[taskId] = !dayMap[taskId]
      return { ...prev, [todayStr]: dayMap }
    })
  }

  useEffect(() => {
    let cancelled = false
    getPlatformMetrics().then((live) => {
      if (!cancelled) setMetrics(live)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRefresh(id: string) {
    setRefreshingId(id)
    const updated = await refreshManualPlatform(id, metrics)
    if (updated) setMetrics((prev) => prev.map((m) => (m.id === id ? updated : m)))
    setRefreshingId(null)
  }

  const mainMetrics = metrics.filter((m) => m.lane === 'main')
  const clipsMetrics = metrics.filter((m) => m.lane === 'clips')

  // Only real, connected platforms count toward the headline totals — mixing
  // in mock followers from platforms that aren't connected/fetched yet would
  // make this the least honest number on the page, which defeats the point
  // of everything else here being labeled real vs. mock so carefully.
  const connectedMetrics = metrics.filter((m) => m.isLiveData)
  const totalFollowers = connectedMetrics.reduce((sum, m) => sum + m.followers, 0)
  const growthKnownMetrics = connectedMetrics.filter((m) => m.hasGrowthHistory)
  const totalWeeklyGrowth = growthKnownMetrics.reduce((sum, m) => sum + m.weeklyGrowth, 0)
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
          <p className="text-[11px] text-gray-500 mt-0.5">
            {connectedMetrics.length} of {metrics.length} platforms connected
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <TrendingUp size={14} /> Weekly Growth
          </div>
          {growthKnownMetrics.length > 0 ? (
            <p className="text-2xl font-bold text-status-good">
              {totalWeeklyGrowth >= 0 ? '+' : ''}
              {formatNumber(totalWeeklyGrowth)}
            </p>
          ) : (
            <p className="text-sm font-medium text-gray-500 mt-1.5">Gathering history</p>
          )}
          <p className="text-[11px] text-gray-500 mt-0.5">
            {growthKnownMetrics.length} of {connectedMetrics.length} connected platforms
          </p>
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

      {todayChecklist.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Today's Tasks</h2>
            <Link to="/calendar" className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-smooth">
              Full day view <ArrowRight size={12} />
            </Link>
          </div>
          <Card className="divide-y divide-base-border">
            {todayChecklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                <button
                  onClick={() => toggleTodayTask(item.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-smooth ${
                    item.done ? 'bg-accent border-accent' : 'border-gray-600'
                  }`}
                >
                  {item.done && <Check size={14} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{item.label}</p>
                  {item.custom && <p className="text-[11px] text-gray-500">Custom task</p>}
                </div>
                {item.platform && (
                  <span className="text-gray-500 flex-shrink-0">
                    <PlatformIcon platform={item.platform} size={16} />
                  </span>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="mb-6">
        <QuotaTracker />
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Main Brand — Personality / Lifestyle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mainMetrics.map((m) => (
            <PlatformCard
              key={m.id}
              metric={m}
              onRefresh={() => handleRefresh(m.id)}
              refreshing={refreshingId === m.id}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Clips / Entertainment Brand
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clipsMetrics.map((m) => (
            <PlatformCard
              key={m.id}
              metric={m}
              onRefresh={() => handleRefresh(m.id)}
              refreshing={refreshingId === m.id}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
