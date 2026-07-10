import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, CalendarDays, Lightbulb, Layers, TrendingUp, BarChart3, Settings } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

// Tasks got folded into Calendar's Day view (non-negotiables + quick-add
// extras all live there now), so there's no separate Tasks nav item anymore.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/ideas', label: 'Content Ideas', icon: Lightbulb },
  { to: '/pillars', label: 'Pillars & Niche', icon: Layers },
  { to: '/growth', label: 'Growth Strategy', icon: TrendingUp },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Mobile bottom bar shows a trimmed set to avoid crowding small screens —
// picked by path rather than array position so this doesn't silently drift
// if NAV_ITEMS gets reordered.
const MOBILE_PATHS = ['/', '/calendar', '/ideas', '/growth', '/analytics']
export const MOBILE_NAV_ITEMS: NavItem[] = MOBILE_PATHS.map(
  (path) => NAV_ITEMS.find((item) => item.to === path)!,
)
