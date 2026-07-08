import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createStore } from './kvStore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const store = createStore('token:', path.join(__dirname, '..', 'tokens.json'))

export async function getTokens(platform) {
  return store.get(platform)
}

export async function setTokens(platform, tokens) {
  const existing = await store.get(platform)
  const updated = { ...existing, ...tokens, updatedAt: new Date().toISOString() }
  await store.set(platform, updated)
  return updated
}

export async function clearTokens(platform) {
  await store.delete(platform)
}

export async function isConnected(platform) {
  const t = await getTokens(platform)
  // access_token covers OAuth-based platforms; username covers the Apify-based
  // TikTok integration, which has no token to speak of.
  return Boolean(t && (t.access_token || t.username))
}
