import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowUpRight, ArrowDownRight, Radio, AlertCircle } from 'lucide-react'
import type { PlatformMetric } from '../types'
import { Card } from './ui/Card'
import { ProgressBar } from './ui/ProgressBar'
import { StatusBadge } from './ui/StatusBadge'
import { PlatformIcon } from './ui/PlatformIcon'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function PlatformCard({ metric }: { metric: PlatformMetric }) {
  const pctToGoal = Math.min(100, Math.round((metric.followers / metric.goal) * 100))
  const isGrowthPositive = metric.weeklyGrowth >= 0
  const growthPending = metric.isLiveData && metric.hasGrowthHistory === false

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${metric.brandColor}22` }}
          >
            <PlatformIcon platform={metric.id} color={metric.brandColor} size={18} />
          </div>
          <div>
            <p className="font-semibold text-white leading-tight flex items-center gap-1.5">
              {metric.name}
              {metric.isLiveData && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-status-good/15 text-status-good">
                  LIVE
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 capitalize">{metric.lane} brand</p>
          </div>
        </div>
        <StatusBadge status={metric.status} />
      </div>

      {metric.liveNote && (
        <div className="flex items-center gap-1.5 text-xs text-status-bad -mt-2">
          <Radio size={12} className="animate-pulse" /> {metric.liveNote}
        </div>
      )}
      {metric.liveError && (
        <div className="flex items-start gap-1.5 text-xs text-status-watch -mt-2">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {metric.liveError}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-white tracking-tight">{formatNumber(metric.followers)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            followers
            {metric.subscriberCount !== undefined && (
              <span className="text-gray-400"> · {formatNumber(metric.subscriberCount)} subs</span>
            )}
          </p>
        </div>
        {growthPending ? (
          <p className="text-xs text-gray-500 max-w-[7rem] text-right leading-snug">Gathering history — real weekly growth in a few days</p>
        ) : (
          <div className={`flex items-center gap-1 text-sm font-medium ${isGrowthPositive ? 'text-status-good' : 'text-status-bad'}`}>
            {isGrowthPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {formatNumber(Math.abs(metric.weeklyGrowth))} ({metric.weeklyGrowthPct}%)
          </div>
        )}
      </div>

      <div className="h-14 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.brandColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={metric.brandColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ background: '#1E232D', border: '1px solid #262C38', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(value: number) => [formatNumber(value), 'Followers']}
            />
            <Area type="monotone" dataKey="value" stroke={metric.brandColor} strokeWidth={2} fill={`url(#grad-${metric.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">{metric.viewsLabel}</p>
          <p className="font-semibold text-gray-100">{formatNumber(metric.totalViews)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Engagement rate{metric.isLiveData ? ' (est.)' : ''}</p>
          <p className="font-semibold text-gray-100" title={metric.isLiveData ? "Placeholder — none of the connected APIs expose a true engagement-rate figure" : undefined}>
            {metric.engagementRate}%
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Progress to {formatNumber(metric.goal)} goal</span>
          <span className="text-gray-300 font-medium">{pctToGoal}%</span>
        </div>
        <ProgressBar value={metric.followers} max={metric.goal} color={metric.brandColor} />
      </div>
    </Card>
  )
}
