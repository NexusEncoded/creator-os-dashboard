import { useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { fetchAppData, pushAppData } from '../services/appDataService'

function resolveInitial<T>(initialValue: T | (() => T)): T {
  return initialValue instanceof Function ? initialValue() : initialValue
}

function isEmpty<T>(value: T, initial: T): boolean {
  if (Array.isArray(value)) return value.length === 0
  return JSON.stringify(value) === JSON.stringify(initial)
}

/**
 * Same API as useLocalStorage, but backed by the server (server/app-data.json)
 * so the same data shows up across browsers/devices instead of being stuck
 * in whichever browser tab you happened to use.
 *
 * Sync strategy is deliberately "local wins if it has anything in it":
 *  - If this browser's local copy is non-empty, keep it and push it to the
 *    server (local is authoritative — never silently overwritten by
 *    whatever's on the server, which could be stale or from another device).
 *  - Only pull from the server when local is empty/still-default, e.g. the
 *    first time you open the app in a new browser or after clearing storage.
 *
 * Renders instantly from the local cache either way; the server round-trip
 * happens in the background and never blocks the UI.
 */
export function useServerStorage<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useLocalStorage<T>(key, initialValue)
  const hydrated = useRef(false)
  const initialRef = useRef(resolveInitial(initialValue))

  useEffect(() => {
    let cancelled = false
    if (isEmpty(value, initialRef.current)) {
      fetchAppData<T>(key).then((serverValue) => {
        if (!cancelled && serverValue !== null && !isEmpty(serverValue, initialRef.current)) {
          setValue(serverValue)
        }
        hydrated.current = true
      })
    } else {
      hydrated.current = true
      pushAppData(key, value)
    }
    return () => {
      cancelled = true
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
