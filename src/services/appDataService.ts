import { API_BASE } from './connectionsService'

// Free-tier hosts (e.g. Render) spin the backend down after idle periods —
// the first request after that can take 15-30s to wake it back up. This
// matters a lot for fetchAppData specifically: useServerStorage only
// attempts hydration once per key on mount, so a premature timeout here
// means a device silently never picks up real synced data, not just a
// slow load.
const TIMEOUT_MS = 20000

export async function fetchAppData<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api/data/${key}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return null
    const json = await res.json()
    return (json.value ?? null) as T | null
  } catch {
    return null
  }
}

export async function pushAppData<T>(key: string, value: T): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/data/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    // backend offline — local copy (see useServerStorage) is still authoritative
  }
}
