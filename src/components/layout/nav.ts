import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, CalendarDays, Lightbulb, Layers, TrendingUp, BarChart3, Settings } from 'lucide-react'

export type NavGroup = 'daily' | 'strategy' | 'system'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  group: NavGroup
}

// "daily" = the stuff worth opening every day; "strategy" = weekly/monthly
// check-ins, not a constant-attention page; "system" = setup/config. Purely
// a display grouping in the sidebar (see Sidebar.tsx) — doesn't affect
// routing. Tasks got folded into Calendar's Day view (non-negotiables +
// quick-add extras all live there now), so there's no separate Tasks item.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'daily' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, group: 'daily' },
  { to: '/ideas', label: 'Content Ideas', icon: Lightbulb, group: 'strategy' },
  { to: '/pillars', label: 'Pillars & Niche', icon: Layers, group: 'strategy' },
  { to: '/growth', label: 'Growth Strategy', icon: TrendingUp, group: 'strategy' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, group: 'strategy' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'system' },
]

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  daily: 'Daily',
  strategy: 'Strategy',
  system: '',
}

// Mobile bottom bar shows a trimmed set to avoid crowding small screens —
// picked by path rather than array position so this doesn't silently drift
// if NAV_ITEMS gets reordered.
const MOBILE_PATHS = ['/', '/calendar', '/ideas', '/growth', '/analytics']
export const MOBILE_NAV_ITEMS: NavItem[] = MOBILE_PATHS.map(
  (path) => NAV_ITEMS.find((item) => item.to === path)!,
)
