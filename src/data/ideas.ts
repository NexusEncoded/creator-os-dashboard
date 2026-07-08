import type { ContentIdea, ContentPillarId, IdeaTag, PlatformId } from '../types'

let ideaCounter = 0
function nextId(prefix: string) {
  ideaCounter += 1
  return `${prefix}-${Date.now()}-${ideaCounter}`
}

export const PRELOADED_IDEA_POOL: Omit<ContentIdea, 'id' | 'source'>[] = [
  { title: 'Day-in-the-life: 9-5 to stream setup transition', platform: 'main-tiktok', pillar: 'young-professional', format: 'TikTok', tag: 'Personal Brand' },
  { title: '"POV: you leave the office and go live 2 hours later"', platform: 'main-tiktok', pillar: 'young-professional', format: 'TikTok', tag: 'Trending' },
  { title: 'Rank my desk setup vs. my streaming setup', platform: 'main-tiktok', pillar: 'behind-the-content', format: 'TikTok', tag: 'Evergreen' },
  { title: 'Outfit breakdown: what I actually wear to a corporate job in 2026', platform: 'main-instagram', pillar: 'young-professional', format: 'Reel', tag: 'Evergreen' },
  { title: 'Weekend recap vlog: event + prep for Sunday stream', platform: 'main-youtube', pillar: 'vlog-teasers', format: 'Vlog', tag: 'Personal Brand' },
  { title: 'Best chat moments from this week — clip compilation', platform: 'clips-tiktok', pillar: 'stream-highlights', format: 'Clip', tag: 'Trending' },
  { title: 'Reacting to my own stream fail from last night', platform: 'clips-tiktok', pillar: 'funny-fails', format: 'Clip', tag: 'Trending' },
  { title: 'Community shoutout: viewer clip of the week', platform: 'clips-instagram', pillar: 'community-moments', format: 'Reel', tag: 'Evergreen' },
  { title: 'VOD recap: condensed Thursday stream in under 10 min', platform: 'live-youtube', pillar: 'vod-recaps', format: 'Stream Theme', tag: 'Evergreen' },
  { title: 'Unfiltered rant: what nobody tells you about balancing a 9-5 and streaming', platform: 'main-tiktok', pillar: 'hot-takes', format: 'TikTok', tag: 'Personal Brand' },
]

export function getPreloadedIdeas(): ContentIdea[] {
  return PRELOADED_IDEA_POOL.map((idea) => ({
    ...idea,
    id: nextId('idea'),
    source: 'preloaded' as const,
  }))
}

export function refreshPreloadedIdeas(): ContentIdea[] {
  // Simulates a daily refresh by shuffling the pool and re-tagging a couple
  // of entries as 'Trending' to mimic new trend detection.
  const shuffled = [...PRELOADED_IDEA_POOL].sort(() => Math.random() - 0.5)
  return shuffled.map((idea, i) => ({
    ...idea,
    tag: i < 3 ? 'Trending' : idea.tag,
    id: nextId('idea'),
    source: 'preloaded' as const,
  }))
}

export const PROMPT_SUGGESTION_CHIPS = [
  'Give me 5 TikTok ideas for my 9-5 niche this week',
  'What should I stream on Thursday?',
  'Create a content plan for growing my Twitch this month',
  'Ideas for tonight’s Clips TikTok post',
  'How do I turn this week’s stream into YouTube content?',
]

const RESPONSE_BANK: { keywords: string[]; ideas: Omit<ContentIdea, 'id' | 'source'>[] }[] = [
  {
    keywords: ['9-5', '9 to 5', 'work', 'office', 'career'],
    ideas: [
      { title: 'What I wish I knew before my first corporate job', platform: 'main-tiktok', pillar: 'young-professional', format: 'TikTok', tag: 'Evergreen' },
      { title: 'Rating my coworkers’ desk setups (blind reaction)', platform: 'main-tiktok', pillar: 'behind-the-content', format: 'TikTok', tag: 'Trending' },
      { title: '3 productivity tools that survived a full year of use', platform: 'main-tiktok', pillar: 'value-tips', format: 'TikTok', tag: 'Evergreen' },
      { title: 'A day my job actually surprised me (story time)', platform: 'main-tiktok', pillar: 'story-reflection', format: 'TikTok', tag: 'Personal Brand' },
      { title: 'Outfit rotation: 5 days, 5 looks, one job', platform: 'main-instagram', pillar: 'young-professional', format: 'Reel', tag: 'Evergreen' },
    ],
  },
  {
    keywords: ['thursday', 'stream'],
    ideas: [
      { title: 'Theme: "Chat Picks the Game" — let community drive the stream', platform: 'twitch', pillar: 'community-moments', format: 'Stream Theme', tag: 'Trending' },
      { title: 'Q&A block in the first 20 min to warm up chat', platform: 'twitch', pillar: 'raw-unfiltered', format: 'Stream Theme', tag: 'Evergreen' },
      { title: 'Tie Thursday stream into Sunday’s vlog storyline', platform: 'twitch', pillar: 'stream-highlights', format: 'Stream Theme', tag: 'Personal Brand' },
    ],
  },
  {
    keywords: ['twitch', 'grow', 'growing', 'month', 'plan'],
    ideas: [
      { title: 'Consistency block: lock Tue/Thu/Sun start times for 30 days straight', platform: 'twitch', pillar: 'stream-highlights', format: 'Stream Theme', tag: 'Evergreen' },
      { title: 'Simulcast every stream to TikTok Live to funnel new viewers', platform: 'main-tiktok', pillar: 'young-professional', format: 'Live', tag: 'Personal Brand' },
      { title: 'Post a "clip from tonight" within 1 hour of ending stream, every stream', platform: 'clips-tiktok', pillar: 'stream-highlights', format: 'Clip', tag: 'Trending' },
      { title: 'Run a monthly "raid train" night to cross-pollinate with similar-sized streamers', platform: 'twitch', pillar: 'community-moments', format: 'Stream Theme', tag: 'Evergreen' },
    ],
  },
  {
    keywords: ['clips tiktok', 'tonight', 'clip'],
    ideas: [
      { title: 'Cut the loudest chat reaction from tonight into a standalone clip', platform: 'clips-tiktok', pillar: 'funny-fails', format: 'Clip', tag: 'Trending' },
      { title: 'Post the first 15 seconds of stream as a "come watch live" teaser', platform: 'clips-tiktok', pillar: 'stream-highlights', format: 'Clip', tag: 'Evergreen' },
    ],
  },
  {
    keywords: ['youtube', 'vod', 'recap'],
    ideas: [
      { title: 'Condense this week’s stream into a 10-minute "best of" VOD', platform: 'live-youtube', pillar: 'vod-recaps', format: 'Stream Theme', tag: 'Evergreen' },
      { title: 'React to your own clips going viral on TikTok — YouTube exclusive', platform: 'live-youtube', pillar: 'vod-recaps', format: 'Vlog', tag: 'Trending' },
    ],
  },
]

export const PILLAR_IDEA_BANK: Record<ContentPillarId, { title: string; platform: PlatformId; format: string; tag: IdeaTag }[]> = {
  'discipline-routine': [
    { title: 'My actual morning routine on a stream night', platform: 'main-tiktok', format: 'TikTok', tag: 'Personal Brand' },
    { title: 'How I stay consistent even when I’m exhausted after work', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
    { title: '3 boundaries I set at work that changed everything', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
    { title: 'What my Monday actually looks like, hour by hour', platform: 'main-instagram', format: 'Reel', tag: 'Trending' },
  ],
  'young-professional': [
    { title: 'Day in my life: 9-5, gym, stream — how I fit it all in', platform: 'main-tiktok', format: 'TikTok', tag: 'Personal Brand' },
    { title: 'What I wish I knew before my first corporate job', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
    { title: 'Outfit rotation: 5 days, 5 looks, one job', platform: 'main-instagram', format: 'Reel', tag: 'Evergreen' },
    { title: '"POV: you leave the office and go live 2 hours later"', platform: 'main-tiktok', format: 'TikTok', tag: 'Trending' },
  ],
  'behind-the-content': [
    { title: 'What I actually do on my lunch break (content tasks at work)', platform: 'main-tiktok', format: 'TikTok', tag: 'Personal Brand' },
    { title: 'Rank my desk setup vs. my streaming setup', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
    { title: 'Stream setup upgrade — what changed and why', platform: 'main-youtube', format: 'Vlog', tag: 'Personal Brand' },
    { title: 'What it takes to stream and vlog while working full time', platform: 'main-instagram', format: 'Reel', tag: 'Trending' },
  ],
  'hot-takes': [
    { title: 'The reality of streaming with a 9-5 nobody talks about', platform: 'main-tiktok', format: 'TikTok', tag: 'Personal Brand' },
    { title: 'Unfiltered rant: the thing I’ve been holding back on', platform: 'main-tiktok', format: 'TikTok', tag: 'Trending' },
    { title: 'Reacting to LinkedIn hustle-culture takes', platform: 'main-tiktok', format: 'TikTok', tag: 'Trending' },
    { title: 'Hot take on where content creation is headed in 2026', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
  ],
  'vlog-teasers': [
    { title: '20-sec cinematic cut of your week — teases Sunday’s vlog', platform: 'main-tiktok', format: 'TikTok', tag: 'Personal Brand' },
    { title: 'Weekend recap teaser: event + prep for Sunday stream', platform: 'main-instagram', format: 'Reel', tag: 'Trending' },
    { title: 'Behind-the-scenes of shooting this week’s vlog', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
    { title: 'The one shot from this week’s vlog that almost didn’t make the cut', platform: 'main-instagram', format: 'Reel', tag: 'Evergreen' },
  ],
  'value-tips': [
    { title: 'How I plan my entire content week in 20 minutes', platform: 'main-tiktok', format: 'TikTok', tag: 'Personal Brand' },
    { title: '3 productivity tools that survived a full year of use', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
    { title: 'Budget vs. splurge tech for a hybrid 9-5/creator life', platform: 'main-tiktok', format: 'TikTok', tag: 'Trending' },
    { title: 'The one habit that made juggling a 9-5 and streaming possible', platform: 'main-instagram', format: 'Reel', tag: 'Evergreen' },
  ],
  'story-reflection': [
    { title: 'What I actually got done this week as a full-time worker + creator', platform: 'main-tiktok', format: 'TikTok', tag: 'Personal Brand' },
    { title: 'A day my job actually surprised me (story time)', platform: 'main-tiktok', format: 'TikTok', tag: 'Trending' },
    { title: 'Answering the questions people are too afraid to ask', platform: 'main-youtube', format: 'Vlog', tag: 'Personal Brand' },
    { title: 'What I’d tell myself before starting this whole dual-brand thing', platform: 'main-tiktok', format: 'TikTok', tag: 'Evergreen' },
  ],
  'stream-highlights': [
    { title: 'Top 3 clips from this week, ranked by chat reaction', platform: 'clips-tiktok', format: 'Clip', tag: 'Trending' },
    { title: 'The moment that made the whole stream worth it', platform: 'clips-tiktok', format: 'Clip', tag: 'Trending' },
    { title: 'Stream highlight reel — first 60 seconds hook test', platform: 'clips-instagram', format: 'Reel', tag: 'Evergreen' },
    { title: 'Behind the clip: what actually happened before this moment', platform: 'clips-tiktok', format: 'Clip', tag: 'Personal Brand' },
  ],
  'funny-fails': [
    { title: 'Reacting to my own fail in real time', platform: 'clips-tiktok', format: 'Clip', tag: 'Trending' },
    { title: 'Chat’s reaction to the fail is funnier than the fail', platform: 'clips-tiktok', format: 'Clip', tag: 'Trending' },
    { title: 'Ranking this month’s worst plays', platform: 'clips-instagram', format: 'Reel', tag: 'Evergreen' },
    { title: 'The fail that broke chat — full context clip', platform: 'clips-tiktok', format: 'Clip', tag: 'Personal Brand' },
  ],
  'vod-recaps': [
    { title: 'This stream in 60 seconds', platform: 'live-youtube', format: 'Stream Theme', tag: 'Evergreen' },
    { title: 'VOD recap: the story arc of tonight’s stream', platform: 'live-youtube', format: 'Vlog', tag: 'Evergreen' },
    { title: 'Best-of-the-week VOD compilation', platform: 'live-youtube', format: 'Stream Theme', tag: 'Trending' },
    { title: 'Reacting to my own VOD a week later', platform: 'live-youtube', format: 'Vlog', tag: 'Personal Brand' },
  ],
  'community-moments': [
    { title: 'Viewer clip of the week, with commentary', platform: 'clips-instagram', format: 'Reel', tag: 'Evergreen' },
    { title: 'Reading chat’s hottest takes from this week', platform: 'clips-tiktok', format: 'Clip', tag: 'Trending' },
    { title: 'Community shoutout: regulars who made the stream better', platform: 'twitch', format: 'Stream Theme', tag: 'Personal Brand' },
    { title: 'Chat vs. streamer: a recurring bit compilation', platform: 'clips-instagram', format: 'Reel', tag: 'Trending' },
  ],
  'raw-unfiltered': [
    { title: 'Unedited thoughts after tonight’s stream', platform: 'clips-tiktok', format: 'Clip', tag: 'Personal Brand' },
    { title: 'Behind-the-scenes: 5 minutes before going live', platform: 'twitch', format: 'Stream Theme', tag: 'Evergreen' },
    { title: 'Off-the-cuff take on something chat brought up', platform: 'clips-tiktok', format: 'Clip', tag: 'Trending' },
    { title: 'Raw reaction, no edits, no filter', platform: 'clips-tiktok', format: 'Clip', tag: 'Personal Brand' },
  ],
}

export function generateIdeasForPillar(pillarId: ContentPillarId): ContentIdea[] {
  const bank = PILLAR_IDEA_BANK[pillarId] ?? []
  return bank.map((idea) => ({
    ...idea,
    pillar: pillarId,
    id: nextId('pillar-idea'),
    source: 'ai-prompt' as const,
  }))
}

export function generateIdeasFromPrompt(prompt: string): ContentIdea[] {
  const lower = prompt.toLowerCase()
  const matched = RESPONSE_BANK.filter((entry) => entry.keywords.some((kw) => lower.includes(kw)))
  const pool = matched.length > 0 ? matched.flatMap((m) => m.ideas) : PRELOADED_IDEA_POOL
  const picked = pool.slice(0, 5)
  return picked.map((idea) => ({
    ...idea,
    id: nextId('prompt-idea'),
    source: 'ai-prompt' as const,
  }))
}
