interface ProgressBarProps {
  value: number
  max: number
  color?: string
  height?: number
}

export function ProgressBar({ value, max, color = '#6C63FF', height = 8 }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="w-full bg-base-surface2 rounded-full overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-smooth"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}
