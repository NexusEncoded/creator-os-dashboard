import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-base-bg text-gray-100">
      <Sidebar />
      <div className="md:pl-64">
        <main className="px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8 max-w-7xl mx-auto">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  )
}
