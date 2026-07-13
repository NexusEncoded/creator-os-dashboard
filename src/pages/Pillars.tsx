import { Link } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { PlatformIcon } from '../components/ui/PlatformIcon'
import { CONTENT_PILLARS } from '../data/pillars'
import { platformName } from '../services/platformService'

export function Pillars() {
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
              <Link
                to={`/calendar?pillar=${pillar.id}`}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-sm font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-smooth"
              >
                <CalendarPlus size={15} />
                Plan this pillar
              </Link>
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
        subtitle="Two brand lanes, twelve pillars — the backbone of what gets made every week. Reference this to see the framework; add content from Calendar."
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
