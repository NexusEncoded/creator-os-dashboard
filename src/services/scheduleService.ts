import { buildWeekTemplates, type ScheduleTemplate } from '../data/schedule'

export const RECURRING_SCHEDULE_KEY = 'creator-os-recurring-schedule'

// Seeds the editable schedule with the built-in default the first time it's
// used — from then on, edits made in Settings are what Calendar/Tasks read
// from when seeding new weeks.
export function getDefaultRecurringSchedule(): ScheduleTemplate[] {
  return buildWeekTemplates()
}
