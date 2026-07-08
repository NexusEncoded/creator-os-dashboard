// Pillar performance, platform ranking, and "what's working" insights used
// to be hardcoded scores/claims that had nothing to do with the actually
// connected accounts. Those are now computed live in
// services/analyticsService.ts from real Calendar posting history and real
// platform metrics. What's left here is genuinely illustrative: none of the
// connected APIs (Twitch Helix, YouTube Data API, Apify TikTok/Instagram
// scrapers) expose audience demographics or per-post format breakdowns, so
// there's no honest way to make these real without a different data source.
// Kept as a reasonable starting model, clearly labeled as such in
// Analytics.tsx rather than presented as measured.
export const AUDIENCE_DEMOGRAPHICS = {
  main: {
    label: 'Main Brand Audience',
    ageRange: '21–32',
    genderSplit: { women: 58, men: 40, other: 2 },
    topRegions: ['United States', 'Canada', 'United Kingdom', 'Australia'],
    device: { mobile: 88, desktop: 9, tablet: 3 },
  },
  clips: {
    label: 'Clips/Entertainment Audience',
    ageRange: '18–28',
    genderSplit: { women: 34, men: 63, other: 3 },
    topRegions: ['United States', 'Canada', 'Germany', 'Brazil'],
    device: { mobile: 79, desktop: 18, tablet: 3 },
  },
}

export const RECOMMENDED_POSTING_TIMES: { platform: string; windows: string[] }[] = [
  { platform: 'Main TikTok', windows: ['7:30–9:00 AM (pre-work scroll)', '8:00–9:30 PM (post-work wind down)'] },
  { platform: 'Clips TikTok', windows: ['12:00–1:00 PM (lunch break)', 'Within 60 min of stream end (Tue/Thu/Sun)'] },
  { platform: 'Main Instagram', windows: ['5:00–6:30 PM (commute home)'] },
  { platform: 'Clips Instagram', windows: ['12:30–1:30 PM', '9:00–10:30 PM'] },
  { platform: 'Main YouTube', windows: ['Sunday 6:00–8:00 PM (weekly upload window)'] },
  { platform: 'Live YouTube', windows: ['No reliable window yet — needs a consistent schedule to build one'] },
  { platform: 'Twitch', windows: ['Tue 9:30 PM', 'Thu 9:30 PM', 'Sun 3:00 PM'] },
]
