import type { PlatformStatus } from '../../types'

const STATUS_CONFIG: Record<PlatformStatus, { label: string; bg: string; text: string; dot: string }> = {
  good: { label: 'On Track', bg: 'bg-status-good/15', text: 'text-status-good', dot: 'bg-status-good' },
  watch: { label: 'Needs Attention', bg: 'bg-status-watch/15', text: 'text-status-watch', dot: 'bg-status-watch' },
  bad: { label: 'Lagging', bg: 'bg-status-bad/15', text: 'text-status-bad', dot: 'bg-status-bad' },
}

export function StatusBadge({ status }: { status: PlatformStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
