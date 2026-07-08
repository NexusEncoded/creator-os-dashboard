export interface MilestoneStage {
  label: string
  min: number
  max: number | null
  focus: string
}

export const GROWTH_MILESTONES: MilestoneStage[] = [
  { label: '0-1K', min: 0, max: 1000, focus: 'Post consistently, find your voice, test every pillar.' },
  { label: '1K-5K', min: 1000, max: 5000, focus: 'Double down on what’s working, start a weekly series.' },
  { label: '5K-10K', min: 5000, max: 10000, focus: 'Collabs and stitches, push cross-platform.' },
  { label: '10K+', min: 10000, max: null, focus: 'Go live, monetize, funnel to other platforms.' },
]

export function currentStageIndex(followers: number): number {
  const idx = GROWTH_MILESTONES.findIndex((s) => followers >= s.min && (s.max === null || followers < s.max))
  return idx === -1 ? 0 : idx
}
