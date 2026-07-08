import type { ContentPillar } from '../types'

export const CONTENT_PILLARS: ContentPillar[] = [
  {
    id: 'discipline-routine',
    lane: 'main',
    name: 'Discipline & Routine',
    description: 'Gym, morning/evening routines, how you manage time as a creator — Monday’s pillar.',
    platforms: ['main-tiktok'],
    color: '#6C63FF',
  },
  {
    id: 'young-professional',
    lane: 'main',
    name: 'Young Professional Life',
    description: 'Work routines, commute, adulting wins/fails, office moments — Tuesday’s pillar.',
    platforms: ['main-tiktok', 'main-instagram'],
    color: '#3B82F6',
  },
  {
    id: 'behind-the-content',
    lane: 'main',
    name: 'Behind the Content',
    description: 'What it takes to stream and vlog while working full time — Wednesday’s pillar.',
    platforms: ['main-tiktok', 'main-instagram'],
    color: '#22C55E',
  },
  {
    id: 'hot-takes',
    lane: 'main',
    name: 'Hot Takes & Opinions',
    description: 'Career, content creation, social media, and culture opinions — Thursday’s pillar.',
    platforms: ['main-tiktok'],
    color: '#F59E0B',
  },
  {
    id: 'vlog-teasers',
    lane: 'main',
    name: 'Vlog Teasers',
    description: 'Cinematic 15-30 sec cuts driving people to Sunday’s YouTube vlog — Friday’s pillar.',
    platforms: ['main-tiktok', 'main-instagram'],
    color: '#EC4899',
  },
  {
    id: 'value-tips',
    lane: 'main',
    name: 'Value & Tips',
    description: 'Tips, tools, and how-to content about creating or adulting — Saturday’s pillar.',
    platforms: ['main-tiktok'],
    color: '#F97316',
  },
  {
    id: 'story-reflection',
    lane: 'main',
    name: 'Story & Reflection',
    description: 'Personal narrative, background, journey updates, weekly wrap-ups — Sunday’s pillar.',
    platforms: ['main-tiktok', 'main-youtube'],
    color: '#A855F7',
  },
  {
    id: 'stream-highlights',
    lane: 'clips',
    name: 'Stream Highlights',
    description: 'Best moments pulled straight from Twitch and TikTok live streams.',
    platforms: ['clips-tiktok', 'clips-instagram', 'twitch'],
    color: '#9146FF',
  },
  {
    id: 'funny-fails',
    lane: 'clips',
    name: 'Funny Moments & Fails',
    description: 'Outlandish clips and reactions built for maximum rewatch value.',
    platforms: ['clips-tiktok', 'clips-instagram'],
    color: '#FF2D55',
  },
  {
    id: 'vod-recaps',
    lane: 'clips',
    name: 'VOD Recaps',
    description: 'Condensed stream content repackaged for YouTube and TikTok audiences who missed the live.',
    platforms: ['live-youtube', 'clips-tiktok'],
    color: '#25F4EE',
  },
  {
    id: 'community-moments',
    lane: 'clips',
    name: 'Community Moments',
    description: 'Viewer interactions and chat highlights that make the community feel seen.',
    platforms: ['twitch', 'clips-instagram'],
    color: '#F97316',
  },
  {
    id: 'raw-unfiltered',
    lane: 'clips',
    name: 'Raw & Unfiltered',
    description: 'Loose takes and behind-the-scenes content with zero polish, all personality.',
    platforms: ['clips-tiktok', 'twitch'],
    color: '#A855F7',
  },
]

export function getPillar(id: string) {
  return CONTENT_PILLARS.find((p) => p.id === id)
}
