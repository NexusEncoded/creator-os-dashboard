import { useEffect, useMemo, useState } from 'react'
import { Flame, TrendingUp, TrendingDown, Youtube, Milestone, Info } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { PlatformIcon } from '../components/ui/PlatformIcon'
import { FUNNEL_STAGES } from '../data/growth'
import { buildFocusActions, buildGrowthInsights, buildWeeklyReport } from '../services/growthService'
import { GROWTH_MILESTONES, currentStageIndex } from '../data/milestones'
import { getPlatformMetrics, getPlatformMetricsSync, platformName } from '../services/platformService'
import { useServerStorage } from '../hooks/useServerStorage'
import { QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS, type Quota } from '../services/quotaService'
import { LifeGoals } from '../components/LifeGoals'
import type { CalendarEntry, PlatformId } from '../types'

const IMPACT_STYLE: Record<string, string> = {
  high: 'bg-status-bad/15 text-status-bad',
  medium: 'bg-status-watch/15 text-status-watch',
  low: 'bg-accent-blue/15 text-accent-blue',
}

export function Growth() {
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

  const focusActions = useMemo(() => buildFocusActions(metrics, entries, quotas, anchor), [metrics, entries, quotas, anchor])
  const growthInsights = useMemo(() => buildGrowthInsights(metrics), [metrics])
  const weeklyReport = useMemo(() => buildWeeklyReport(metrics, entries, anchor), [metrics, entries, anchor])
  const twitchGoal = metrics.find((m) => m.id === 'twitch')?.goal ?? 25000
  const twitchGoalLabel = twitchGoal.toLocaleString()
  const twitchOnTrackLabel = Math.round(twitchGoal * 0.8).toLocaleString()

  return (
    <div>
      <PageHeader
        title="Growth Strategy Center"
        subtitle="TikTok-first funnel strategy — data-informed moves for this week, not generic advice."
      />

      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <Flame size={14} className="text-accent" /> Focus Mode — #1 Action Per Platform
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {focusActions.map((fa) => (
            <Card key={fa.platform} className="p-4 flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform={fa.platform} size={18} color="#6C63FF" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{platformName(fa.platform)}</p>
                <p className="text-sm font-semibold text-gray-100 mb-1">{fa.action}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{fa.reason}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Recommendation Engine</h2>
        <div className="grid grid-cols-1 gap-3">
          {growthInsights.map((insight) => (
            <Card key={insight.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                {insight.platform !== 'cross-platform' && (
                  <div className="w-8 h-8 rounded-lg bg-base-surface2 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <PlatformIcon platform={insight.platform as PlatformId} size={16} />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-100">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.detail}</p>
                </div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-1 rounded-full flex-shrink-0 capitalize ${IMPACT_STYLE[insight.impact]}`}>
                {insight.impact} impact
              </span>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Cross-Platform Funnel — TikTok → Twitch → YouTube
        </h2>
        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Illustrative model, not measured — there's no click-through or referral tracking wired up between platforms,
          so these percentages are a starting assumption to reason from, not live analytics.
        </div>
        <Card className="p-5">
          <div className="space-y-4">
            {FUNNEL_STAGES.map((stage) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-100">{stage.stage}</span>
                  <span className="text-gray-400">{stage.value}%</span>
                </div>
                <div className="w-full bg-base-surface2 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-blue transition-smooth"
                    style={{ width: `${stage.value}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <Youtube size={14} className="text-status-bad" /> Live YouTube: Should You Stream Here Consistently?
        </h2>
        <Card className="p-5 border-status-watch/40">
          <p className="text-sm font-semibold text-white mb-2">Recommendation: Not yet — hold off on a fixed Live YouTube schedule.</p>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            Right now you're running three live formats a week (Twitch Tue/Thu/Sun + TikTok Live simulcast). Adding a fourth
            live commitment on YouTube before Twitch crosses its {twitchGoalLabel} goal would split your live-hosting energy
            across too many platforms and likely slow Twitch's momentum — the platform your growth hierarchy says should
            come second.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Instead, use Live YouTube as a <span className="text-gray-200 font-medium">VOD and recap archive</span>: post
            condensed best-of edits and reaction videos as they're completed, with no fixed schedule pressure. Revisit
            adding a dedicated YouTube live slot once Twitch is consistently hitting {twitchOnTrackLabel}+ followers and
            Tue/Thu/Sun streams are running without gaps for at least 8 straight weeks.
          </p>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Weekly Growth Report</h2>
        <Card className="p-5">
          <p className="text-sm text-gray-300 leading-relaxed mb-4">{weeklyReport.summary}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {weeklyReport.metrics.map((m) => (
              <div key={m.label} className="bg-base-surface2 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <div className={`flex items-center gap-1 text-lg font-bold ${m.trend === 'up' ? 'text-status-good' : 'text-status-bad'}`}>
                  {m.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <Milestone size={14} /> Growth Milestones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metrics.map((m) => {
            const stageIdx = currentStageIndex(m.followers)
            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PlatformIcon platform={m.id} size={16} color={m.brandColor} />
                  <p className="text-sm font-semibold text-gray-100">{m.name}</p>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {GROWTH_MILESTONES.map((stage, i) => (
                    <div
                      key={stage.label}
                      className={`flex-1 h-1.5 rounded-full ${i <= stageIdx ? 'bg-accent' : 'bg-base-surface2'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
                  {GROWTH_MILESTONES.map((stage, i) => (
                    <span key={stage.label} className={i === stageIdx ? 'text-accent font-medium' : ''}>
                      {stage.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{GROWTH_MILESTONES[stageIdx].focus}</p>
              </Card>
            )
          })}
        </div>
      </section>

      <LifeGoals />
    </div>
  )
}
