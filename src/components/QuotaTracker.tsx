import { Card } from './ui/Card'
import { ProgressBar } from './ui/ProgressBar'
import { PlatformIcon } from './ui/PlatformIcon'
import { useServerStorage } from '../hooks/useServerStorage'
import { PLATFORM_METRICS } from '../data/platforms'
import { getQuotas, countPostedThisWeek } from '../services/quotaService'
import type { CalendarEntry } from '../types'

function statusColor(actual: number, goal: number, minimum: number): string {
  if (actual >= goal) return '#22C55E'
  if (actual >= minimum) return '#F59E0B'
  return '#EF4444'
}

export function QuotaTracker() {
  const [entries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const quotas = getQuotas()
  const actuals = countPostedThisWeek(entries, new Date())

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-white">This Week's Posting Quota</p>
        <p className="text-xs text-gray-500">Actual vs. goal (dot = minimum)</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {PLATFORM_METRICS.map((m) => {
          const quota = quotas[m.id]
          const actual = actuals[m.id] ?? 0
          const color = statusColor(actual, quota.goal, quota.minimum)
          return (
            <div key={m.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <PlatformIcon platform={m.id} size={13} color={m.brandColor} />
                  {m.name}
                </span>
                <span className="font-medium" style={{ color }}>
                  {actual} / {quota.goal}
                </span>
              </div>
              <div className="relative">
                <ProgressBar value={actual} max={quota.goal} color={color} height={6} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-gray-200"
                  style={{ left: `${Math.min(100, (quota.minimum / quota.goal) * 100)}%` }}
                  title={`Minimum: ${quota.minimum}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
