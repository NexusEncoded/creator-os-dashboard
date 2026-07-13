import { Link } from 'react-router-dom'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowUpRight, ArrowDownRight, Radio, AlertCircle, RefreshCw, CloudDownload } from 'lucide-react'
import type { PlatformMetric } from '../types'
import { Card } from './ui/Card'
import { ProgressBar } from './ui/ProgressBar'
import { StatusBadge } from './ui/StatusBadge'
import { PlatformIcon } from './ui/PlatformIcon'

// A raw "401 Invalid Credentials" API dump doesn't tell anyone what to do —
// this is almost always an expired/revoked OAuth token, and the fix is
// always the same (reconnect in Settings), regardless of which platform's
// API phrased the error differently.
function isAuthError(message: string): boolean {
  return /401|invalid.?credentials|unauthenticated|unauthorized/i.test(message)
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

interface PlatformCardProps {
  metric: PlatformMetric
  onRefresh?: () => void
  refreshing?: boolean
}

export function PlatformCard({ metric, onRefresh, refreshing }: PlatformCardProps) {
  const pctToGoal = Math.min(100, Math.round((metric.followers / metric.goal) * 100))
  const isGrowthPositive = metric.weeklyGrowth >= 0
  const growthPending = metric.isLiveData && metric.hasGrowthHistory === false

  const header = (
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
            {metric.isLiveData && !metric.isManualRefresh && (
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
  )

  if (metric.notFetched) {
    return (
      <Card className="p-5 flex flex-col gap-4">
        {header}
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <CloudDownload size={28} className="text-gray-600" />
          <div>
            <p className="text-sm font-medium text-gray-200">Not fetched yet</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-[16rem]">
              Scraping this costs real Apify usage, so it only runs when you ask — click refresh to pull real numbers.
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Fetching...' : 'Fetch now'}
          </button>
        </div>
      </Card>
    )
  }

  // A failed live fetch leaves no real data to show — showing the mock
  // follower count/chart/etc. right next to an error message would look
  // like real data that just happens to have a warning attached, when
  // there's actually nothing behind it at all.
  if (metric.liveError && !metric.isLiveData) {
    const authError = isAuthError(metric.liveError)
    // Retry only actually does something for Apify-backed platforms
    // (refreshManualPlatform knows how to re-fetch those) — OAuth platforms
    // (Twitch/YouTube) auto-fetch on every page load already, so a broken
    // OAuth token needs reconnecting in Settings, not a "Retry" button that
    // would silently do nothing.
    return (
      <Card className="p-5 flex flex-col gap-4">
        {header}
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <AlertCircle size={28} className="text-status-watch" />
          <div>
            <p className="text-sm font-medium text-gray-200">
              {authError ? 'Connection needs to be refreshed' : 'Fetch failed'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-[18rem]">
              {authError
                ? `Your ${metric.name} login has expired or been revoked — reconnect it in Settings to pull real numbers again.`
                : metric.liveError}
            </p>
            {authError && (
              <details className="mt-2 text-left">
                <summary className="text-[11px] text-gray-600 cursor-pointer hover:text-gray-400">Show technical details</summary>
                <p className="text-[11px] text-gray-600 mt-1 max-w-[18rem] break-words">{metric.liveError}</p>
              </details>
            )}
          </div>
          {authError ? (
            <Link
              to="/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth"
            >
              Reconnect in Settings
            </Link>
          ) : (
            metric.isManualRefresh &&
            onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Retrying...' : 'Retry'}
              </button>
            )
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      {header}

      {metric.isManualRefresh && metric.isLiveData && (
        <div className="flex items-center justify-between -mt-2">
          <p className="text-[11px] text-gray-500">
            {metric.stale && metric.lastFetchedAt ? `Last fetched ${timeAgo(metric.lastFetchedAt)}` : 'Fetched just now'}
          </p>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-accent transition-smooth disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Fetching...' : 'Refresh'}
          </button>
        </div>
      )}

      {metric.liveNote && (
        <div className="flex items-center gap-1.5 text-xs text-status-bad -mt-2">
          <Radio size={12} className="animate-pulse" /> {metric.liveNote}
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
