import { getTokens, setTokens } from './tokenStore.js'

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']
export const SLOTS = ['main', 'live']

function config() {
  return {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri: `${process.env.SERVER_URL}/auth/youtube/callback`,
  }
}

function key(slot) {
  return `youtube:${slot}`
}

export function isConfigured() {
  const { clientId, clientSecret } = config()
  return Boolean(clientId && clientSecret)
}

export function getAuthUrl(state) {
  const { clientId, redirectUri } = config()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent select_account',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCode(code, slot) {
  const { clientId, clientSecret, redirectUri } = config()
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params })
  if (!res.ok) throw new Error(`YouTube token exchange failed: ${res.status} ${await res.text()}`)
  const json = await res.json()

  return await setTokens(key(slot), {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  })
}

async function refreshIfNeeded(slot) {
  const tokens = await getTokens(key(slot))
  if (!tokens) return null
  if (tokens.expires_at && Date.now() < tokens.expires_at - 60_000) return tokens
  if (!tokens.refresh_token) return tokens

  const { clientId, clientSecret } = config()
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params })
  if (!res.ok) return tokens
  const json = await res.json()
  return await setTokens(key(slot), {
    access_token: json.access_token,
    expires_at: Date.now() + json.expires_in * 1000,
  })
}

export async function getMetrics(slot) {
  const tokens = await refreshIfNeeded(slot)
  if (!tokens?.access_token) return { connected: false }

  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  )
  if (!res.ok) {
    const body = await res.text()
    return { connected: true, error: `YouTube API error ${res.status}: ${body}` }
  }
  const json = await res.json()
  const channel = json.items?.[0]
  if (!channel) return { connected: true, error: 'No channel found for this Google account.' }

  return {
    connected: true,
    channelTitle: channel.snippet?.title,
    subscribers: Number(channel.statistics?.subscriberCount ?? 0),
    totalViews: Number(channel.statistics?.viewCount ?? 0),
    videoCount: Number(channel.statistics?.videoCount ?? 0),
  }
}
