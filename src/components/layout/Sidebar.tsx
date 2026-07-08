import { NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { NAV_ITEMS } from './nav'

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-base-border bg-base-surface">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-base-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">Creator OS</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
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
