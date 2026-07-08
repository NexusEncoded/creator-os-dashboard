import type { CalendarEntry, ContentIdea } from '../types'

export function ideaToCalendarEntry(idea: ContentIdea, date: string, time: string): CalendarEntry {
  return {
    id: `idea-${idea.id}`,
    date,
    time,
    platform: idea.platform,
    pillar: idea.pillar,
    contentType: idea.format,
    title: idea.title,
    status: 'planned',
    notes: 'Added from Content Ideas',
  }
}
