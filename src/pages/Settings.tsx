import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Moon, Sun, KeyRound, CheckCircle2, XCircle, RefreshCw, Target, CalendarClock, CalendarCog, Copy, Check } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { RecurringScheduleEditor } from '../components/RecurringScheduleEditor'
import { useTheme } from '../hooks/useTheme'
import { useServerStorage } from '../hooks/useServerStorage'
import { getConnectionStatus, connectUrl, disconnect, saveManualUsername } from '../services/connectionsService'
import { GOALS_STORAGE_KEY, DEFAULT_GOALS } from '../services/goalsService'
import { QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS, type Quota } from '../services/quotaService'
import { icsFeedUrl } from '../services/calendarSyncService'
import { PLATFORM_METRICS } from '../data/platforms'
import type { BackendPlatform, BackendSlot, ConnectionState, ConnectionStatus, PlatformId } from '../types'

interface ConnectionRow {
  platform: BackendPlatform
  slot: BackendSlot
  label: string
  note: string
  envVars: string
  type: 'oauth' | 'manual'
}

const ROWS: ConnectionRow[] = [
  { platform: 'twitch', slot: 'default', label: 'Twitch', note: 'Powers Twitch followers and live/viewer status.', envVars: 'TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET', type: 'oauth' },
  { platform: 'youtube', slot: 'main', label: 'YouTube — Main', note: 'Powers Main YouTube subscriber and view counts.', envVars: 'YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET', type: 'oauth' },
  { platform: 'youtube', slot: 'live', label: 'YouTube — Live', note: 'Powers Live YouTube subscriber counts. If prompted, pick a different channel than Main.', envVars: 'YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET', type: 'oauth' },
  { platform: 'tiktok', slot: 'main', label: 'TikTok — Main', note: 'Scraped via Apify from your public profile — just type the username, no login required.', envVars: 'APIFY_API_TOKEN', type: 'manual' },
  { platform: 'tiktok', slot: 'clips', label: 'TikTok — Clips', note: 'Scraped via Apify from your public profile — just type the username, no login required.', envVars: 'APIFY_API_TOKEN', type: 'manual' },
  { platform: 'instagram', slot: 'main', label: 'Instagram — Main', note: 'Scraped via Apify from your public profile — just type the username, no login required.', envVars: 'APIFY_API_TOKEN', type: 'manual' },
  { platform: 'instagram', slot: 'clips', label: 'Instagram — Clips', note: 'Scraped via Apify from your public profile — just type the username, no login required.', envVars: 'APIFY_API_TOKEN', type: 'manual' },
]

function rowKey(row: ConnectionRow) {
  return `${row.platform}-${row.slot}`
}

function stateFor(status: ConnectionStatus | null, row: ConnectionRow): ConnectionState | undefined {
  if (!status) return undefined
  const entry = status[row.platform]
  if (!entry) return undefined
  if (row.slot === 'default') return entry as ConnectionState
  return (entry as Record<string, ConnectionState>)[row.slot]
}

export function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [goals, setGoals] = useServerStorage<Record<PlatformId, number>>(GOALS_STORAGE_KEY, DEFAULT_GOALS)
  const [quotas, setQuotas] = useServerStorage<Record<PlatformId, Quota>>(QUOTAS_STORAGE_KEY, DEFAULT_QUOTAS)
  const [copiedIcs, setCopiedIcs] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [checkingBackend, setCheckingBackend] = useState(true)
  const [usernameInputs, setUsernameInputs] = useState<Record<string, string>>({})
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const connectedBanner = searchParams.get('connected')
  const errorBanner = searchParams.get('connect_error')

  async function refreshStatus() {
    setCheckingBackend(true)
    const result = await getConnectionStatus()
    setStatus(result)
    setCheckingBackend(false)
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  useEffect(() => {
    if (connectedBanner || errorBanner) {
      const params = new URLSearchParams(searchParams)
      params.delete('connected')
      params.delete('connect_error')
      const timeout = setTimeout(() => setSearchParams(params, { replace: true }), 5000)
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedBanner, errorBanner])

  async function handleDisconnect(row: ConnectionRow) {
    await disconnect(row.platform, row.slot)
    refreshStatus()
  }

  async function handleSaveUsername(row: ConnectionRow) {
    const key = rowKey(row)
    const username = (usernameInputs[key] ?? '').trim()
    if (!username) return
    setSaving((prev) => ({ ...prev, [key]: true }))
    setManualErrors((prev) => ({ ...prev, [key]: '' }))
    const result = await saveManualUsername(row.platform, row.slot, username)
    setSaving((prev) => ({ ...prev, [key]: false }))
    if (!result.ok) {
      setManualErrors((prev) => ({ ...prev, [key]: result.error ?? 'Failed to save' }))
    }
    refreshStatus()
  }

  async function handleCopyIcs() {
    try {
      await navigator.clipboard.writeText(icsFeedUrl())
      setCopiedIcs(true)
      setTimeout(() => setCopiedIcs(false), 2000)
    } catch {
      // clipboard API unavailable — user can still select the text manually
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Appearance and live data connections." />

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Appearance</h2>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-100">Theme</p>
            <p className="text-xs text-gray-500 mt-0.5">Dark mode is the primary experience; light mode is available if you prefer it.</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-base-surface2 text-gray-100 hover:bg-accent/15 hover:text-accent transition-smooth"
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <Target size={14} /> Follower Goals
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          The On Track / Needs Attention / Lagging badge on each Dashboard card is measured against these goals once a
          platform is live-connected. Set your own targets — the numbers here are just starter placeholders.
        </p>
        <Card className="divide-y divide-base-border">
          {PLATFORM_METRICS.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-sm font-medium text-gray-100">{m.name}</p>
              <input
                type="number"
                min={0}
                value={goals[m.id] ?? m.goal}
                onChange={(e) => setGoals((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))}
                className="bg-base-surface2 border border-base-border rounded-lg px-2.5 py-1.5 text-sm text-gray-100 w-32 text-right"
              />
            </div>
          ))}
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <Target size={14} /> Weekly Posting Quota
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Powers the "This Week's Posting Quota" tracker on the Dashboard. Goal is your target; Minimum is the floor
          below which a platform shows red. Actual counts come from Calendar entries marked "Posted" this week.
        </p>
        <Card className="divide-y divide-base-border">
          {PLATFORM_METRICS.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-sm font-medium text-gray-100">{m.name}</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  Goal
                  <input
                    type="number"
                    min={0}
                    value={quotas[m.id]?.goal ?? DEFAULT_QUOTAS[m.id].goal}
                    onChange={(e) =>
                      setQuotas((prev) => ({
                        ...prev,
                        [m.id]: { ...(prev[m.id] ?? DEFAULT_QUOTAS[m.id]), goal: Number(e.target.value) },
                      }))
                    }
                    className="bg-base-surface2 border border-base-border rounded-lg px-2 py-1.5 text-sm text-gray-100 w-16 text-right"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  Min
                  <input
                    type="number"
                    min={0}
                    value={quotas[m.id]?.minimum ?? DEFAULT_QUOTAS[m.id].minimum}
                    onChange={(e) =>
                      setQuotas((prev) => ({
                        ...prev,
                        [m.id]: { ...(prev[m.id] ?? DEFAULT_QUOTAS[m.id]), minimum: Number(e.target.value) },
                      }))
                    }
                    className="bg-base-surface2 border border-base-border rounded-lg px-2 py-1.5 text-sm text-gray-100 w-16 text-right"
                  />
                </label>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <CalendarCog size={14} /> Recurring Schedule
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          This is what auto-fills the Calendar and Tasks pages each week. Edit times, swap platforms/pillars, toggle a
          slot off without deleting it, or add new recurring slots. Changes apply the next time a new week is seeded —
          weeks already generated keep their existing entries.
        </p>
        <RecurringScheduleEditor />
      </section>

      <section className="mb-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
          <CalendarClock size={14} /> Google Calendar Sync
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          This backend runs on your own machine, so <code className="text-gray-400">localhost</code> isn't reachable
          by Google's servers for an auto-refreshing subscription — that only works once this URL is exposed
          publicly (e.g. via a tunnel like ngrok or Cloudflare Tunnel, then subscribe with that public URL in
          Google Calendar Settings → Add calendar → From URL). Until then, download the file and import it manually
          whenever you want your calendar updated.
        </p>
        <Card className="p-4 flex items-center gap-2 mb-3">
          <code className="flex-1 text-xs text-gray-300 bg-base-surface2 rounded-lg px-3 py-2 truncate">{icsFeedUrl()}</code>
          <button
            onClick={handleCopyIcs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth flex-shrink-0"
          >
            {copiedIcs ? <Check size={14} /> : <Copy size={14} />}
            {copiedIcs ? 'Copied' : 'Copy'}
          </button>
        </Card>
        <a
          href={`${icsFeedUrl()}?download=1`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-base-surface2 text-gray-200 hover:bg-base-surface transition-smooth"
        >
          <CalendarClock size={14} /> Download .ics file (works right now, import into any calendar app)
        </a>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <KeyRound size={14} /> Live Data Connections
          </h2>
          <button onClick={refreshStatus} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-smooth">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {connectedBanner && (
          <div className="mb-3 px-4 py-2.5 rounded-lg bg-status-good/10 border border-status-good/30 text-sm text-status-good">
            Connected {connectedBanner.replace(':', ' — ')} successfully.
          </div>
        )}
        {errorBanner && (
          <div className="mb-3 px-4 py-2.5 rounded-lg bg-status-bad/10 border border-status-bad/30 text-sm text-status-bad">
            Connection failed: {errorBanner}
          </div>
        )}

        {checkingBackend && status === null && (
          <div className="mb-3 px-4 py-2.5 rounded-lg bg-base-surface2 text-sm text-gray-400">
            Checking for the local backend at http://localhost:8787...
          </div>
        )}
        {!checkingBackend && status === null && (
          <div className="mb-3 px-4 py-2.5 rounded-lg bg-status-watch/10 border border-status-watch/30 text-sm text-status-watch">
            Backend isn't reachable. Run <code>npm run dev</code> inside <code>server/</code> to enable live connections —
            every card will keep working on mock data in the meantime.
          </div>
        )}

        <Card className="divide-y divide-base-border">
          {ROWS.map((row) => {
            const state = stateFor(status, row)
            const key = rowKey(row)
            return (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-100">{row.label}</p>
                    {state?.connected ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-status-good">
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : state?.configured ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-status-watch">Not connected</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                        <XCircle size={12} /> Not configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{row.note}</p>
                  {!state?.configured && (
                    <code className="text-[11px] px-1.5 py-0.5 mt-1 inline-block rounded bg-base-surface2 text-gray-500">
                      Set {row.envVars} in server/.env
                    </code>
                  )}
                  {row.type === 'manual' && state?.configured && !state?.connected && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={usernameInputs[key] ?? ''}
                        onChange={(e) => setUsernameInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername(row)}
                        placeholder={`${row.platform === 'tiktok' ? 'TikTok' : 'Instagram'} username (no @)`}
                        className="bg-base-surface2 border border-base-border rounded-lg px-2.5 py-1.5 text-xs text-gray-100 w-44"
                      />
                      <button
                        onClick={() => handleSaveUsername(row)}
                        disabled={saving[key]}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth"
                      >
                        {saving[key] ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                  {manualErrors[key] && <p className="text-[11px] text-status-bad mt-1">{manualErrors[key]}</p>}
                </div>
                {state?.connected ? (
                  <button
                    onClick={() => handleDisconnect(row)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-status-bad/15 text-status-bad hover:bg-status-bad/25 transition-smooth self-start sm:self-auto"
                  >
                    Disconnect
                  </button>
                ) : row.type === 'oauth' ? (
                  <a
                    href={state?.configured ? connectUrl(row.platform, row.slot) : undefined}
                    aria-disabled={!state?.configured}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth self-start sm:self-auto ${
                      state?.configured
                        ? 'bg-accent/15 text-accent hover:bg-accent/25'
                        : 'bg-base-surface2 text-gray-600 cursor-not-allowed pointer-events-none'
                    }`}
                  >
                    Connect
                  </a>
                ) : null}
              </div>
            )
          })}
        </Card>
        <p className="text-xs text-gray-500 mt-3">
          See <code className="text-gray-400">server/SETUP.md</code> for exactly how to get each platform's credentials.
        </p>
      </section>
    </div>
  )
}
