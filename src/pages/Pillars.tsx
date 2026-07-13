import { useState } from 'react'
import { Wand2, ChevronDown } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { IdeaCard } from '../components/IdeaCard'
import { PlatformIcon } from '../components/ui/PlatformIcon'
import { CONTENT_PILLARS } from '../data/pillars'
import { generateIdeasForPillar } from '../data/ideas'
import { platformName } from '../services/platformService'
import { ideaToCalendarEntry } from '../services/ideaService'
import { useServerStorage } from '../hooks/useServerStorage'
import type { CalendarEntry, ContentIdea, ContentPillarId } from '../types'
import { toDateStr } from '../services/calendarService'

export function Pillars() {
  const [entries, setEntries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [openPillar, setOpenPillar] = useState<ContentPillarId | null>(null)
  const [ideasByPillar, setIdeasByPillar] = useState<Partial<Record<ContentPillarId, ContentIdea[]>>>({})
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  function togglePillar(id: ContentPillarId) {
    if (openPillar === id) {
      setOpenPillar(null)
      return
    }
    setOpenPillar(id)
    if (!ideasByPillar[id]) {
      setIdeasByPillar((prev) => ({ ...prev, [id]: generateIdeasForPillar(id) }))
    }
  }

  function addToCalendar(idea: ContentIdea) {
    const entry = ideaToCalendarEntry(idea, toDateStr(new Date()), '19:00')
    setEntries((prev) => [...prev, entry])
    setAddedIds((prev) => new Set(prev).add(idea.id))
  }

  const mainPillars = CONTENT_PILLARS.filter((p) => p.lane === 'main')
  const clipsPillars = CONTENT_PILLARS.filter((p) => p.lane === 'clips')

  const renderLane = (title: string, description: string, pillars: typeof CONTENT_PILLARS) => (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((pillar) => (
          <Card key={pillar.id} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: pillar.color }} />
            <div className="p-5">
              <h3 className="font-semibold text-white mb-1.5">{pillar.name}</h3>
              <p className="text-sm text-gray-400 mb-3 leading-relaxed">{pillar.description}</p>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {pillar.platforms.map((p) => (
                  <span key={p} className="flex items-center gap-1 text-xs text-gray-400 bg-base-surface2 px-2 py-1 rounded-full">
                    <PlatformIcon platform={p} size={12} />
                    {platformName(p)}
                  </span>
                ))}
              </div>
              <button
                onClick={() => togglePillar(pillar.id)}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-sm font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth"
              >
                <Wand2 size={15} />
                Generate AI Content Ideas
                <ChevronDown size={15} className={`transition-smooth ${openPillar === pillar.id ? 'rotate-180' : ''}`} />
              </button>
              {openPillar === pillar.id && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {(ideasByPillar[pillar.id] ?? []).map((idea) => (
                    <IdeaCard key={idea.id} idea={idea} onAdd={addToCalendar} added={addedIds.has(idea.id)} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  )

  return (
    <div>
      <PageHeader
        title="Pillars & Niche Hub"
        subtitle="Two brand lanes, twelve pillars — the backbone of what gets made every week."
      />
      {renderLane(
        'Main Brand — Personality / Lifestyle',
        'Young professional life: 9-5 work, travel, shopping, tech, and personal identity.',
        mainPillars,
      )}
      {renderLane(
        'Clips / Entertainment Brand',
        'Live streams, VODs, funny moments — raw, unfiltered, community-driven.',
        clipsPillars,
      )}
    </div>
  )
}
