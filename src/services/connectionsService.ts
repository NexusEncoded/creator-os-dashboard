import type { BackendPlatform, BackendSlot, ConnectionStatus } from '../types'

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

export async function getConnectionStatus(): Promise<ConnectionStatus | null> {
  try {
    // Free-tier hosts (e.g. Render) spin the backend down after idle
    // periods — the first request after that can take 15-30s to wake it
    // back up, so this needs real headroom rather than a snappy-UI timeout.
    const res = await fetch(`${API_BASE}/api/status`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    return (await res.json()) as ConnectionStatus
  } catch {
    return null
  }
}

export function connectUrl(platform: BackendPlatform, slot: BackendSlot = 'default'): string {
  return slot === 'default' ? `${API_BASE}/auth/${platform}` : `${API_BASE}/auth/${platform}?slot=${slot}`
}

export async function disconnect(platform: BackendPlatform, slot: BackendSlot = 'default'): Promise<boolean> {
  try {
    const url =
      slot === 'default'
        ? `${API_BASE}/api/disconnect/${platform}`
        : `${API_BASE}/api/disconnect/${platform}?slot=${slot}`
    const res = await fetch(url, { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

export async function saveManualUsername(
  platform: BackendPlatform,
  slot: BackendSlot,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/manual/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, username }),
    })
    const json = await res.json()
    if (!res.ok) return { ok: false, error: json.error ?? 'Failed to save username' }
    if (json.error) return { ok: false, error: json.error }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Backend unreachable' }
  }
}
