import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, CalendarDays, CheckSquare, Lightbulb, Layers, TrendingUp, BarChart3, Settings } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/ideas', label: 'Content Ideas', icon: Lightbulb },
  { to: '/pillars', label: 'Pillars & Niche', icon: Layers },
  { to: '/growth', label: 'Growth Strategy', icon: TrendingUp },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Mobile bottom bar shows a trimmed set to avoid crowding small screens.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  NAV_ITEMS[3],
  NAV_ITEMS[5],
]
