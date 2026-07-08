export type PlatformId =
  | 'main-tiktok'
  | 'clips-tiktok'
  | 'main-instagram'
  | 'clips-instagram'
  | 'main-youtube'
  | 'live-youtube'
  | 'twitch'

export type BrandLane = 'main' | 'clips'

export type PlatformStatus = 'good' | 'watch' | 'bad'

export interface PlatformMetric {
  id: PlatformId
  name: string
  lane: BrandLane
  brandColor: string
  followers: number
  weeklyGrowth: number
  weeklyGrowthPct: number
  totalViews: number
  viewsLabel: string
  engagementRate: number
  goal: number
  status: PlatformStatus
  history: { label: string; value: number }[]
  isLiveData?: boolean
  liveError?: string
  liveNote?: string
  subscriberCount?: number
  hasGrowthHistory?: boolean
  // Apify-backed platforms (TikTok/Instagram) only refresh on explicit
  // request now (see server/index.js) — these describe that state so the
  // UI can show "not fetched yet" or "as of X ago" instead of pretending
  // it's live.
  notFetched?: boolean
  stale?: boolean
  lastFetchedAt?: number
  isManualRefresh?: boolean
}

export type BackendPlatform = 'twitch' | 'youtube' | 'tiktok' | 'instagram'
export type BackendSlot = 'default' | 'main' | 'clips' | 'live'

export interface ConnectionState {
  configured: boolean
  connected: boolean
}

// Twitch has one account slot; youtube/tiktok/instagram have two (main +
// clips-or-live). Kept as a loose Record so the frontend doesn't need a
// distinct type per platform's slot shape.
export type ConnectionStatus = Record<BackendPlatform, ConnectionState | Record<string, ConnectionState>>

export type ContentPillarId =
  | 'discipline-routine'
  | 'young-professional'
  | 'behind-the-content'
  | 'hot-takes'
  | 'vlog-teasers'
  | 'value-tips'
  | 'story-reflection'
  | 'stream-highlights'
  | 'funny-fails'
  | 'vod-recaps'
  | 'community-moments'
  | 'raw-unfiltered'

export interface ContentPillar {
  id: ContentPillarId
  lane: BrandLane
  name: string
  description: string
  platforms: PlatformId[]
  color: string
}

export type CalendarStatus = 'planned' | 'in-progress' | 'posted' | 'missed'

export interface CalendarEntry {
  id: string
  date: string // YYYY-MM-DD
  time: string // HH:MM 24h
  platform: PlatformId
  pillar: ContentPillarId
  contentType: string
  title: string
  status: CalendarStatus
  notes?: string
}

export interface TaskItem {
  id: string
  label: string
  platform?: PlatformId
  done: boolean
  custom?: boolean
  recurring?: 'daily' | 'weekly'
  dayOfWeek?: number // 0=Sunday..6=Saturday, only for weekly
}

export type IdeaTag = 'Trending' | 'Evergreen' | 'Personal Brand'

export interface ContentIdea {
  id: string
  title: string
  platform: PlatformId
  pillar: ContentPillarId
  format: string
  tag: IdeaTag
  source: 'preloaded' | 'ai-prompt' | 'custom'
  addedToCalendar?: boolean
}

export interface GrowthInsight {
  id: string
  platform: PlatformId | 'cross-platform'
  title: string
  detail: string
  impact: 'high' | 'medium' | 'low'
}

export interface FocusAction {
  platform: PlatformId
  action: string
  reason: string
}

export interface AnalyticsInsight {
  id: string
  category: string
  title: string
  detail: string
  sentiment: 'positive' | 'neutral' | 'negative'
}

export type ClipStatus = 'needs-editing' | 'ready' | 'posted'

export interface ClipItem {
  id: string
  title: string
  sourceDate: string // YYYY-MM-DD — date of the stream the clip came from
  status: ClipStatus
  postedTo: {
    clipsTikTok: boolean
    clipsInstagram: boolean
    youtubeShorts: boolean
  }
  createdAt: string
}
