import { API_BASE } from './connectionsService'

// The calendar itself now syncs to the backend automatically via
// useServerStorage (see hooks/useServerStorage.ts) — this just points at
// the read-only ICS feed the backend serves from that same synced data,
// for the optional Google Calendar subscription in Settings.
// API_BASE is empty when requests are proxied through Vite's dev server
// (see vite.config.ts) — in that case, resolve against the current origin
// so the copied/downloaded URL is a real absolute link, not a bare path.
export function icsFeedUrl(): string {
  const base = API_BASE || window.location.origin
  return `${base}/api/calendar.ics`
}
