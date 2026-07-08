import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// Generic async key-value storage. Uses Upstash Redis's REST API (works
// over plain HTTPS, no persistent TCP connection needed — fits free-tier
// serverless/ephemeral hosts like Render) when UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set. Falls back to a local JSON file
// otherwise, so local development needs zero extra setup.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
export const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN)

async function redisRequest(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify(command),
  })
  if (!res.ok) {
    throw new Error(`Upstash Redis request failed: ${res.status} ${await res.text()}`)
  }
  const json = await res.json()
  return json.result
}

// Creates a namespaced store. `redisPrefix` scopes keys in Redis (e.g.
// "token:", "appdata:") so the different stores never collide there.
// `localFilePath` is the fallback JSON blob file used when Redis env vars
// aren't set — same file each store has always used, so existing local
// data keeps working untouched.
export function createStore(redisPrefix, localFilePath) {
  function readLocalAll() {
    if (!existsSync(localFilePath)) return {}
    try {
      return JSON.parse(readFileSync(localFilePath, 'utf-8'))
    } catch {
      return {}
    }
  }

  function writeLocalAll(data) {
    writeFileSync(localFilePath, JSON.stringify(data, null, 2))
  }

  return {
    async get(key) {
      if (USE_REDIS) {
        const raw = await redisRequest(['GET', `${redisPrefix}${key}`])
        return raw === null || raw === undefined ? null : JSON.parse(raw)
      }
      const all = readLocalAll()
      return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : null
    },

    async set(key, value) {
      if (USE_REDIS) {
        await redisRequest(['SET', `${redisPrefix}${key}`, JSON.stringify(value)])
        return
      }
      const all = readLocalAll()
      all[key] = value
      writeLocalAll(all)
    },

    async delete(key) {
      if (USE_REDIS) {
        await redisRequest(['DEL', `${redisPrefix}${key}`])
        return
      }
      const all = readLocalAll()
      delete all[key]
      writeLocalAll(all)
    },
  }
}
