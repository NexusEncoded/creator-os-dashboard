import { PLATFORM_METRICS } from '../data/platforms'
import type { PlatformId, PlatformStatus } from '../types'

export const GOALS_STORAGE_KEY = 'creator-os-goals'

// Seeds the goal editor with the original demo targets so the input isn't
// empty on first use — these are meant to be overwritten with real goals.
export const DEFAULT_GOALS: Record<PlatformId, number> = Object.fromEntries(
  PLATFORM_METRICS.map((m) => [m.id, m.goal]),
) as Record<PlatformId, number>

export function getGoals(): Record<PlatformId, number> {
  try {
    const stored = window.localStorage.getItem(GOALS_STORAGE_KEY)
    if (!stored) return DEFAULT_GOALS
    return { ...DEFAULT_GOALS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_GOALS
  }
}

// Live-connected platforms get their status recomputed from real followers
// against the creator's own goal, since the mock "status" field otherwise
// reflects a fictional growth narrative that has nothing to do with the
// account actually connected. This measures progress-toward-goal, not
// growth trend — a real trend needs historical snapshots this app doesn't
// collect yet (see server/SETUP.md "Known limits").
export function computeStatus(followers: number, goal: number): PlatformStatus {
  if (goal <= 0) return 'watch'
  const ratio = followers / goal
  if (ratio >= 0.7) return 'good'
  if (ratio >= 0.3) return 'watch'
  return 'bad'
}
