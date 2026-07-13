import { NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { NAV_ITEMS, NAV_GROUP_LABELS, type NavGroup } from './nav'

const GROUP_ORDER: NavGroup[] = ['daily', 'strategy', 'system']

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-base-border bg-base-surface">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-base-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">Creator OS</span>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {GROUP_ORDER.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group)
          if (items.length === 0) return null
          return (
            <div key={group} className="mb-4 last:mb-0">
              {NAV_GROUP_LABELS[group] && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                  {NAV_GROUP_LABELS[group]}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-smooth ${
                        isActive
                          ? 'bg-accent/15 text-white'
                          : 'text-gray-400 hover:text-gray-100 hover:bg-base-surface2'
                      }`
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t border-base-border">
        <div className="rounded-xl bg-base-surface2 px-3 py-3 text-xs text-gray-400">
          <p className="font-semibold text-gray-200 mb-1">Growth priority</p>
          <p>TikTok → Twitch → YouTube</p>
        </div>
      </div>
    </aside>
  )
}
