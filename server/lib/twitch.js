import { getTokens, setTokens } from './tokenStore.js'

const SCOPES = ['moderator:read:followers', 'channel:read:subscriptions']

function config() {
  return {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri: `${process.env.SERVER_URL}/auth/twitch/callback`,
  }
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
    force_verify: 'true',
    state,
  })
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
}

export async function exchangeCode(code) {
  const { clientId, clientSecret, redirectUri } = config()
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  const res = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: params })
  if (!res.ok) throw new Error(`Twitch token exchange failed: ${res.status} ${await res.text()}`)
  const json = await res.json()

  const usersRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: { Authorization: `Bearer ${json.access_token}`, 'Client-Id': clientId },
  })
  const usersJson = await usersRes.json()
  const user = usersJson.data?.[0]

  return await setTokens('twitch', {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
    broadcaster_id: user?.id,
    broadcaster_login: user?.login,
    display_name: user?.display_name,
  })
}

async function refreshIfNeeded() {
  const tokens = await getTokens('twitch')
  if (!tokens) return null
  if (tokens.expires_at && Date.now() < tokens.expires_at - 60_000) return tokens

  const { clientId, clientSecret } = config()
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  })
  const res = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: params })
  if (!res.ok) return tokens // fall back to the (possibly expired) token and let the API call surface the error
  const json = await res.json()
  return await setTokens('twitch', {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? tokens.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  })
}

export async function getMetrics() {
  const tokens = await refreshIfNeeded()
  if (!tokens?.access_token) return { connected: false }

  const { clientId } = config()
  const headers = { Authorization: `Bearer ${tokens.access_token}`, 'Client-Id': clientId }

  const [followersRes, streamRes, subsRes] = await Promise.all([
    fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${tokens.broadcaster_id}`, { headers }),
    fetch(`https://api.twitch.tv/helix/streams?user_id=${tokens.broadcaster_id}`, { headers }),
    // Only Affiliates/Partners can have paid subs — this 400s for everyone
    // else, which is expected and handled separately below rather than
    // failing the whole metrics call.
    fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${tokens.broadcaster_id}&first=1`, { headers }),
  ])

  if (!followersRes.ok) {
    const body = await followersRes.text()
    return { connected: true, error: `Twitch API error ${followersRes.status}: ${body}` }
  }

  const followersJson = await followersRes.json()
  const streamJson = await streamRes.json()
  const live = streamJson.data?.[0]

  let subscribers
  if (subsRes.ok) {
    const subsJson = await subsRes.json()
    subscribers = subsJson.total ?? 0
  }

  return {
    connected: true,
    displayName: tokens.display_name,
    followers: followersJson.total ?? 0,
    subscribers,
    isLive: Boolean(live),
    viewerCount: live?.viewer_count ?? 0,
    streamTitle: live?.title ?? null,
  }
}
