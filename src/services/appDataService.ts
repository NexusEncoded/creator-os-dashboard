import { API_BASE } from './connectionsService'

export async function fetchAppData<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api/data/${key}`, { signal: AbortSignal.timeout(5000) })
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
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // backend offline — local copy (see useServerStorage) is still authoritative
  }
}
