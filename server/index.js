import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import * as twitch from './lib/twitch.js'
import * as youtube from './lib/youtube.js'
import * as tiktok from './lib/tiktok.js'
import * as instagram from './lib/instagram.js'
import { isConnected, clearTokens } from './lib/tokenStore.js'
import { getAppData, setAppData } from './lib/appDataStore.js'
import { buildIcsFeed } from './lib/ics.js'

// Only these keys can be read/written through /api/data/:key — matches the
// frontend's localStorage keys 1:1 (see src/hooks/useServerStorage.ts).
const APP_DATA_KEYS = new Set([
  'creator-os-calendar-v1',
  'creator-os-custom-tasks',
  'creator-os-task-completions',
  'creator-os-custom-ideas',
  'creator-os-clips',
  'creator-os-life-goals',
  'creator-os-goals',
  'creator-os-quotas',
  'creator-os-recurring-schedule',
  'creator-os-follower-history',
])

// Twitch has one meaningful account per creator (no "clips" Twitch in the
// app), so it's the only platform without multiple slots. TikTok and
// Instagram are "manual" because they're Apify-backed (username + API
// token, no OAuth) instead of the redirect-based flow Twitch/YouTube use.
const PLATFORMS = {
  twitch: { mod: twitch, slots: ['default'], type: 'oauth' },
  youtube: { mod: youtube, slots: youtube.SLOTS, type: 'oauth' },
  tiktok: { mod: tiktok, slots: tiktok.SLOTS, type: 'manual' },
  instagram: { mod: instagram, slots: instagram.SLOTS, type: 'manual' },
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const PORT = process.env.PORT ?? 8787

const pendingStates = new Map() // state -> { platform, slot }, expires after 10 min

function tokenKey(platform, slot) {
  return slot === 'default' ? platform : `${platform}:${slot}`
}

function resolveSlot(platformEntry, requestedSlot) {
  const slots = platformEntry.slots
  if (slots.length === 1) return slots[0]
  return slots.includes(requestedSlot) ? requestedSlot : null
}

// Apify-backed platforms (tiktok/instagram) take ~5-15s per call and cost
// real money per run against a limited account balance — the 3-minute
// window this briefly used burned through real budget fast enough to start
// getting 402s from Apify. 5 minutes still refreshes noticeably more than
// the original 10, at roughly half the burn rate that caused that. OAuth
// platforms are fast and free, so they're cached only briefly, mainly to
// keep repeat page loads within the same few seconds from re-hitting
// Twitch/YouTube redundantly.
const CACHE_TTL_MS = { manual: 5 * 60 * 1000, oauth: 20 * 1000 }
const metricsCache = new Map() // "platform:slot" -> { data, expiresAt }

function cacheKey(name, slot) {
  return `${name}:${slot}`
}

const app = express()
app.use(cors({ origin: FRONTEND_URL }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.get('/api/status', async (_req, res) => {
  const status = {}
  for (const [name, { mod, slots }] of Object.entries(PLATFORMS)) {
    const configured = mod.isConfigured()
    if (slots.length === 1) {
      status[name] = { configured, connected: await isConnected(tokenKey(name, slots[0])) }
    } else {
      status[name] = {}
      for (const slot of slots) {
        status[name][slot] = { configured, connected: await isConnected(tokenKey(name, slot)) }
      }
    }
  }
  res.json(status)
})

async function getMetricsFor(name, mod, slot, platformType) {
  const key = tokenKey(name, slot)
  if (!mod.isConfigured() || !(await isConnected(key))) return { connected: false }

  const cKey = cacheKey(name, slot)
  const cached = metricsCache.get(cKey)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  let result
  try {
    result = slot === 'default' ? await mod.getMetrics() : await mod.getMetrics(slot)
  } catch (err) {
    result = { connected: true, error: err.message }
  }
  metricsCache.set(cKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS[platformType] })
  return result
}

app.get('/api/metrics', async (_req, res) => {
  const results = {}
  await Promise.all(
    Object.entries(PLATFORMS).map(async ([name, { mod, slots, type }]) => {
      if (slots.length === 1) {
        results[name] = await getMetricsFor(name, mod, slots[0], type)
      } else {
        results[name] = {}
        await Promise.all(
          slots.map(async (slot) => {
            results[name][slot] = await getMetricsFor(name, mod, slot, type)
          }),
        )
      }
    }),
  )
  res.json(results)
})

app.get('/api/data/:key', express.json(), async (req, res) => {
  if (!APP_DATA_KEYS.has(req.params.key)) return res.status(404).json({ error: 'Unknown data key' })
  res.json({ value: await getAppData(req.params.key) })
})

app.put('/api/data/:key', express.json({ limit: '5mb' }), async (req, res) => {
  if (!APP_DATA_KEYS.has(req.params.key)) return res.status(404).json({ error: 'Unknown data key' })
  if (!Object.prototype.hasOwnProperty.call(req.body, 'value')) {
    return res.status(400).json({ error: 'Request body must include "value"' })
  }
  await setAppData(req.params.key, req.body.value)
  res.json({ ok: true })
})

app.get('/api/calendar.ics', async (req, res) => {
  const entries = (await getAppData('creator-os-calendar-v1')) ?? []
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  // Calendar clients polling this URL for a subscription expect "inline";
  // ?download=1 forces a real Save dialog for the manual-import fallback,
  // which browsers otherwise won't honor on a cross-origin link.
  const disposition = req.query.download ? 'attachment' : 'inline'
  res.setHeader('Content-Disposition', `${disposition}; filename="creator-os.ics"`)
  res.send(buildIcsFeed(entries))
})

app.get('/api/metrics/:platform', async (req, res) => {
  const entry = PLATFORMS[req.params.platform]
  if (!entry) return res.status(404).json({ error: 'Unknown platform' })
  const slot = resolveSlot(entry, req.query.slot ?? 'default')
  if (!slot) return res.status(400).json({ error: 'Unknown slot' })
  res.json(await getMetricsFor(req.params.platform, entry.mod, slot, entry.type))
})

app.post('/api/disconnect/:platform', async (req, res) => {
  const entry = PLATFORMS[req.params.platform]
  if (!entry) return res.status(404).json({ error: 'Unknown platform' })
  const slot = resolveSlot(entry, req.query.slot ?? 'default')
  if (!slot) return res.status(400).json({ error: 'Unknown slot' })
  await clearTokens(tokenKey(req.params.platform, slot))
  metricsCache.delete(cacheKey(req.params.platform, slot))
  res.json({ ok: true })
})

app.post('/api/manual/:platform', express.json(), async (req, res) => {
  const entry = PLATFORMS[req.params.platform]
  if (!entry || entry.type !== 'manual') return res.status(404).json({ error: 'Unknown manual-entry platform' })
  const slot = resolveSlot(entry, req.body.slot ?? 'default')
  if (!slot) return res.status(400).json({ error: 'Unknown slot' })
  const username = (req.body.username ?? '').trim()
  if (!username) return res.status(400).json({ error: 'username is required' })

  await entry.mod.setUsername(slot, username)
  metricsCache.delete(cacheKey(req.params.platform, slot))
  res.json(await getMetricsFor(req.params.platform, entry.mod, slot, entry.type))
})

app.get('/auth/:platform', (req, res) => {
  const platform = req.params.platform
  const entry = PLATFORMS[platform]
  if (!entry) return res.status(404).send('Unknown platform')
  if (entry.type === 'manual') {
    return res.status(400).send(`${platform} uses manual username entry, not OAuth — use POST /api/manual/${platform}.`)
  }
  if (!entry.mod.isConfigured()) {
    return res
      .status(400)
      .send(`${platform} isn't configured yet. Add its client ID/secret to server/.env — see SETUP.md.`)
  }
  const slot = resolveSlot(entry, req.query.slot ?? 'default')
  if (!slot) return res.status(400).send(`Unknown slot for ${platform}`)

  const state = crypto.randomUUID()
  pendingStates.set(state, { platform, slot })
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000)
  res.redirect(entry.mod.getAuthUrl(state))
})

app.get('/auth/:platform/callback', async (req, res) => {
  const platform = req.params.platform
  const entry = PLATFORMS[platform]
  const { code, state, error, error_description } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}/settings?connect_error=${encodeURIComponent(error_description || error)}`)
  }
  const pending = state && pendingStates.get(state)
  if (!entry || !pending || pending.platform !== platform) {
    return res.redirect(`${FRONTEND_URL}/settings?connect_error=invalid_state`)
  }
  pendingStates.delete(state)

  try {
    await entry.mod.exchangeCode(code, pending.slot)
    res.redirect(`${FRONTEND_URL}/settings?connected=${platform}${pending.slot !== 'default' ? `:${pending.slot}` : ''}`)
  } catch (err) {
    res.redirect(`${FRONTEND_URL}/settings?connect_error=${encodeURIComponent(err.message)}`)
  }
})

app.listen(PORT, () => {
  console.log(`Creator OS backend running at ${process.env.SERVER_URL ?? `http://localhost:${PORT}`}`)
})
