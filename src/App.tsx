import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { useTheme } from './hooks/useTheme'
import { Dashboard } from './pages/Dashboard'
import { CalendarPage } from './pages/Calendar'
import { Tasks } from './pages/Tasks'
import { Ideas } from './pages/Ideas'
import { Pillars } from './pages/Pillars'
import { Growth } from './pages/Growth'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'

export default function App() {
  useTheme()

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/ideas" element={<Ideas />} />
        <Route path="/pillars" element={<Pillars />} />
        <Route path="/growth" element={<Growth />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
