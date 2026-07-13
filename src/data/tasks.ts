import type { PlatformId } from '../types'

export interface TaskTemplate {
  id: string
  label: string
  platform?: PlatformId
}

// Only genuinely non-content tasks live here now — anything that's actually
// a scheduled post (Post to Main TikTok, Go live on Twitch, etc.) is now
// pulled directly from the Calendar as a real content item instead of a
// generic duplicate label. See services/taskService.ts contentTasksForDate.
export const DAILY_TASKS: TaskTemplate[] = [
  { id: 'daily-engagement', label: 'Engage with comments for 15 min' },
  { id: 'daily-upload-clips', label: 'Upload today\'s clip(s) to Clips TikTok/Instagram', platform: 'clips-tiktok' },
]

// dayOfWeek: 0 = Sunday ... 6 = Saturday
export const DAY_SPECIFIC_TASKS: Record<number, TaskTemplate[]> = {
  0: [{ id: 'sun-film-vlog', label: 'Film/edit YouTube vlog', platform: 'main-youtube' }],
  1: [],
  2: [{ id: 'tue-clip-highlights', label: 'Clip highlight moments from stream', platform: 'clips-tiktok' }],
  3: [],
  4: [{ id: 'thu-clip-highlights', label: 'Clip highlight moments from stream', platform: 'clips-tiktok' }],
  5: [],
  6: [],
}

export function tasksForDay(dayOfWeek: number): TaskTemplate[] {
  return [...DAILY_TASKS, ...(DAY_SPECIFIC_TASKS[dayOfWeek] ?? [])]
}

// Stream days only (Tue/Thu/Sun) — distinct from the general daily
// checklist since these are stream-specific rituals, not posting tasks.
export const STREAM_DAYS = [0, 2, 4]

export const PRE_STREAM_TASKS: TaskTemplate[] = [
  { id: 'pre-stream-title-game', label: 'Title + game/category decided', platform: 'twitch' },
  { id: 'pre-stream-alerts', label: 'Alerts + overlays tested', platform: 'twitch' },
  { id: 'pre-stream-announce', label: 'Stream start time posted to socials', platform: 'twitch' },
  { id: 'pre-stream-thumbnail', label: 'Thumbnail/stream title optimized with keywords', platform: 'twitch' },
  { id: 'pre-stream-supplies', label: 'Water + snacks ready — no mid-stream breaks', platform: 'twitch' },
]

export const POST_STREAM_TASKS: TaskTemplate[] = [
  { id: 'post-stream-timestamps', label: 'Mark 3-5 best timestamp moments', platform: 'twitch' },
  { id: 'post-stream-sentence', label: 'Write 1 sentence: "Best moment tonight was ___"', platform: 'twitch' },
  { id: 'post-stream-save-vod', label: 'Save VOD', platform: 'twitch' },
  { id: 'post-stream-reply', label: 'Reply to lingering chat messages / new follows', platform: 'twitch' },
]

export function isStreamDay(dayOfWeek: number): boolean {
  return STREAM_DAYS.includes(dayOfWeek)
}
