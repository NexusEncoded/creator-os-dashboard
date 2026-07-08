// FOCUS_ACTIONS, GROWTH_INSIGHTS, and the Weekly Growth Report used to live
// here as hardcoded numbers (e.g. "+6.3% this week") that had nothing to do
// with whatever was actually connected. Those are now computed live in
// services/growthService.ts from real metrics, real Calendar posting
// history, and real quotas. This file just keeps the one section that's
// genuinely a conceptual model rather than something this app measures: the
// TikTok -> Twitch -> YouTube discovery funnel. There's no click-through or
// referral tracking wired up, so these percentages are an illustrative
// starting assumption, not live data — labeled as such in Growth.tsx.
export const FUNNEL_STAGES = [
  { stage: 'TikTok Reach', value: 100, description: 'Daily TikTok posts + clips drive top-of-funnel discovery — the widest audience touchpoint.' },
  { stage: 'Twitch Viewers', value: 34, description: 'Illustrative share of TikTok audience assumed to catch a live stream (via simulcast or schedule awareness).' },
  { stage: 'Twitch Followers', value: 16, description: 'Illustrative share of viewers assumed to convert to a Twitch follow after watching a stream.' },
  { stage: 'YouTube Viewers', value: 7, description: 'Illustrative share of the Twitch community assumed to also watch VOD recaps or the Sunday vlog on YouTube.' },
]
