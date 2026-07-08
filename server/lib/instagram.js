import { getTokens, setTokens, clearTokens } from './tokenStore.js'

// Instagram's official Graph API requires a Professional account linked to
// a Facebook Page, plus Meta App Review for most scopes — a lot of setup
// for a personal dashboard. Instead, this scrapes the creator's own public
// profile via Apify's "Instagram Profile Scraper" actor — just an API token
// and a username, no OAuth, no review. See SETUP.md.
const ACTOR_ID = 'apify~instagram-profile-scraper'
export const SLOTS = ['main', 'clips']

function key(slot) {
  return `instagram:${slot}`
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
    body: JSON.stringify({ usernames: [username] }),
  })

  if (!res.ok) {
    return { connected: true, error: `Apify request failed: ${res.status} ${await res.text()}` }
  }

  const items = await res.json()
  const item = items?.[0]
  if (!item) {
    return { connected: true, error: `Apify returned no data for @${username} — double check the username.` }
  }

  const followers = item.followersCount
  if (followers === undefined) {
    return {
      connected: true,
      error: 'Apify returned data, but not in the expected shape — the actor may have changed its output fields.',
    }
  }

  // Instagram's real "reach" is an Insights metric that only exists through
  // the official Graph API with Business permissions — not available from
  // public profile scraping. This sums likes+comments across the recent
  // posts the actor already returns as a real (if different) substitute.
  const recentPosts = item.latestPosts ?? []
  const recentEngagement = recentPosts.reduce((sum, p) => sum + (p.likesCount ?? 0) + (p.commentsCount ?? 0), 0)

  return {
    connected: true,
    username,
    followers,
    following: item.followsCount,
    mediaCount: item.postsCount,
    recentEngagement,
    recentPostCount: recentPosts.length,
  }
}
