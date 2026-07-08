import { getTokens, setTokens, clearTokens } from './tokenStore.js'

// TikTok's official API gates real follower counts behind a separate app
// review (user.info.stats scope) on top of the developer portal's own
// business-verification requirements. Instead, this scrapes the creator's own
// public profile via Apify's "TikTok Scraper" actor (clockworks/tiktok-scraper)
// — just an API token and a username, no OAuth, no review. See SETUP.md.
//
// This actor scrapes videos, not a standalone profile summary, so follower
// count comes along for the ride on `authorMeta`. There's no aggregate
// "views" field on the profile itself, so RECENT_VIDEOS worth of videos are
// pulled and their playCounts summed as a "recent views" proxy — not a
// strict "this week" figure, since it's whatever the last N posts happen to
// span.
const ACTOR_ID = 'clockworks~tiktok-scraper'
const RECENT_VIDEOS = 10
export const SLOTS = ['main', 'clips']

function key(slot) {
  return `tiktok:${slot}`
}

export function isConfigured() {
  return Boolean(process.env.APIFY_API_TOKEN)
}

export async function getUsername(slot) {
  const tokens = await getTokens(key(slot))
  return tokens?.username ?? null
}

export async function setUsername(slot, username) {
  return await setTokens(key(slot), { username: username.replace(/^@/, '') })
}

export async function disconnect(slot) {
  await clearTokens(key(slot))
}

export async function getMetrics(slot) {
  const username = await getUsername(slot)
  if (!username) return { connected: false }
  if (!isConfigured()) {
    return { connected: true, error: 'APIFY_API_TOKEN is not set in server/.env yet.' }
  }

  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profiles: [username],
      resultsPerPage: RECENT_VIDEOS,
      profileScrapeSections: ['videos'],
      shouldDownloadCovers: false,
      shouldDownloadVideos: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    }),
  })

  if (!res.ok) {
    return { connected: true, error: `Apify request failed: ${res.status} ${await res.text()}` }
  }

  const items = await res.json()
  const author = items?.[0]?.authorMeta
  if (!author) {
    return { connected: true, error: `Apify returned no data for @${username} — double check the username.` }
  }
  if (author.fans === undefined) {
    return {
      connected: true,
      error: 'Apify returned data, but not in the expected shape — the actor may have changed its output fields.',
    }
  }

  const recentViews = items.reduce((sum, item) => sum + (item.playCount ?? 0), 0)

  return {
    connected: true,
    username: author.name ?? username,
    followers: author.fans,
    videoCount: author.video,
    likes: author.heart,
    recentViews,
    recentVideoCount: items.length,
  }
}
