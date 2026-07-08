import { useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { fetchAppData, pushAppData } from '../services/appDataService'

function isEmpty<T>(value: T): boolean {
  if (Array.isArray(value)) return value.length === 0
  return value === null || value === undefined
}

/**
 * Same API as useLocalStorage, but backed by the server (Redis in
 * production — see server/lib/kvStore.js) so the same data shows up across
 * browsers/devices instead of being stuck in whichever one you happened to
 * use.
 *
 * The server is the source of truth across devices — local storage is just
 * a fast-render cache:
 *  - Renders instantly from whatever's cached locally (no loading flash).
 *  - On mount, and again whenever this tab regains focus/visibility, it
 *    fetches the server's copy and adopts it if non-empty — that's what
 *    actually picks up edits made on another device. If the server is
 *    unreachable or has nothing saved yet, the local value is left alone.
 *  - Any local change pushes to the server (debounced) so the next device
 *    to load or refocus picks it up in turn.
 */
export function useServerStorage<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useLocalStorage<T>(key, initialValue)
  const hydrated = useRef(false)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    let cancelled = false

    function pull() {
      fetchAppData<T>(key).then((serverValue) => {
        if (cancelled) return
        if (serverValue !== null && !isEmpty(serverValue)) {
          setValue(serverValue)
        }
        hydrated.current = true
      })
    }

    pull()

    // Separate listeners rather than one shared handler gated on
    // visibilityState: "focus" already means the window is active, and
    // gating it behind document.visibilityState too is redundant at best —
    // some embedding/automation contexts report focus without visibility
    // ever flipping to "visible", which would silently break this path.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') pull()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', pull)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', pull)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!hydrated.current) return
    const timeout = setTimeout(() => pushAppData(key, value), 800)
    return () => clearTimeout(timeout)
  }, [key, value])

  return [value, setValue] as const
}
