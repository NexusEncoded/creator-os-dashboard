import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createStore } from './kvStore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const store = createStore('appdata:', path.join(__dirname, '..', 'app-data.json'))

// Generic key-value store backing the frontend's persisted app data
// (calendar, tasks, ideas, clips, goals, quotas, recurring schedule).
// Replaces the old browser-localStorage-only model so the same data shows
// up regardless of which browser/device you're using. See useServerStorage
// on the frontend for the sync strategy (local wins if non-empty, so this
// never silently clobbers real data with something stale).
export async function getAppData(key) {
  return store.get(key)
}

export async function setAppData(key, value) {
  await store.set(key, value)
}
