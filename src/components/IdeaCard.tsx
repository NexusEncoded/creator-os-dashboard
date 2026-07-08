import { CalendarPlus, Check } from 'lucide-react'
import type { ContentIdea } from '../types'
import { PlatformIcon } from './ui/PlatformIcon'
import { platformName } from '../services/platformService'
import { getPillar } from '../data/pillars'

const TAG_STYLE: Record<ContentIdea['tag'], string> = {
  Trending: 'bg-status-bad/15 text-status-bad',
  Evergreen: 'bg-accent-blue/15 text-accent-blue',
  'Personal Brand': 'bg-accent/15 text-accent',
}

export function IdeaCard({
  idea,
  onAdd,
  added,
}: {
  idea: ContentIdea
  onAdd: (idea: ContentIdea) => void
  added?: boolean
}) {
  const pillar = getPillar(idea.pillar)
  return (
    <div className="bg-base-surface2 border border-base-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TAG_STYLE[idea.tag]}`}>{idea.tag}</span>
        <span className="text-gray-500">
          <PlatformIcon platform={idea.platform} size={16} />
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-100 leading-snug">{idea.title}</p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{platformName(idea.platform)}</span>
        <span>·</span>
        <span>{idea.format}</span>
        {pillar && (
          <>
            <span>·</span>
            <span>{pillar.name}</span>
          </>
        )}
      </div>
      <button
        onClick={() => onAdd(idea)}
        disabled={added}
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
          added ? 'bg-status-good/15 text-status-good' : 'bg-accent/15 text-accent hover:bg-accent/25'
        }`}
      >
        {added ? <Check size={14} /> : <CalendarPlus size={14} />}
        {added ? 'Added to Calendar' : 'Add to Calendar'}
      </button>
    </div>
  )
}
