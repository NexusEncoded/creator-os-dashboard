import { useMemo, useState, type DragEvent } from 'react'
import { RefreshCw, Send, Plus, GripVertical, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { IdeaCard } from '../components/IdeaCard'
import { ClipPipeline } from '../components/ClipPipeline'
import { useServerStorage } from '../hooks/useServerStorage'
import {
  getPreloadedIdeas,
  refreshPreloadedIdeas,
  PROMPT_SUGGESTION_CHIPS,
  generateIdeasFromPrompt,
} from '../data/ideas'
import { ideaToCalendarEntry } from '../services/ideaService'
import { toDateStr, getWeekDates } from '../services/calendarService'
import { getWeekStart } from '../data/schedule'
import type { CalendarEntry, ContentIdea, PlatformId, ContentPillarId } from '../types'
import { PLATFORM_METRICS } from '../data/platforms'
import { CONTENT_PILLARS } from '../data/pillars'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PromptExchange {
  id: string
  prompt: string
  ideas: ContentIdea[]
}

export function Ideas() {
  const [entries, setEntries] = useServerStorage<CalendarEntry[]>('creator-os-calendar-v1', [])
  const [preloaded, setPreloaded] = useState<ContentIdea[]>(() => getPreloadedIdeas())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [prompt, setPrompt] = useState('')
  const [exchanges, setExchanges] = useState<PromptExchange[]>([])
  const [customIdeas, setCustomIdeas] = useServerStorage<ContentIdea[]>('creator-os-custom-ideas', [])
  const [newIdea, setNewIdea] = useState({ title: '', platform: 'main-tiktok' as PlatformId, pillar: 'story-reflection' as ContentPillarId, format: 'TikTok' })
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const weekDates = useMemo(() => getWeekDates(getWeekStart(new Date())), [])

  function addToCalendar(idea: ContentIdea, date = toDateStr(new Date()), time = '19:00') {
    setEntries((prev) => [...prev, ideaToCalendarEntry(idea, date, time)])
    setAddedIds((prev) => new Set(prev).add(idea.id))
  }

  function handleRefresh() {
    setPreloaded(refreshPreloadedIdeas())
  }

  function handleAskPrompt(text?: string) {
    const q = (text ?? prompt).trim()
    if (!q) return
    const ideas = generateIdeasFromPrompt(q)
    setExchanges((prev) => [{ id: `ex-${Date.now()}`, prompt: q, ideas }, ...prev])
    setPrompt('')
  }

  function addCustomIdea() {
    if (!newIdea.title.trim()) return
    const idea: ContentIdea = {
      id: `custom-idea-${Date.now()}`,
      title: newIdea.title.trim(),
      platform: newIdea.platform,
      pillar: newIdea.pillar,
      format: newIdea.format,
      tag: 'Personal Brand',
      source: 'custom',
    }
    setCustomIdeas((prev) => [idea, ...prev])
    setNewIdea({ title: '', platform: 'main-tiktok', pillar: 'story-reflection', format: 'TikTok' })
  }

  function removeCustomIdea(id: string) {
    setCustomIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  function handleDrop(dateStr: string, e: DragEvent) {
    e.preventDefault()
    setDragOverDate(null)
    const ideaId = e.dataTransfer.getData('text/idea-id')
    const idea = customIdeas.find((i) => i.id === ideaId)
    if (idea) addToCalendar(idea, dateStr)
  }

  return (
    <div>
      <PageHeader
        title="Content Ideas Engine"
        subtitle="Preloaded suggestions, on-demand AI prompts, and your own backlog — all one click from the calendar."
      />

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Pre-Loaded Suggestions</h2>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-smooth"
          >
            <RefreshCw size={14} /> Refresh Ideas
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {preloaded.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onAdd={(i) => addToCalendar(i)} added={addedIds.has(idea.id)} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Ask the AI Content Assistant</h2>
        <Card className="p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {PROMPT_SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleAskPrompt(chip)}
                className="text-xs px-3 py-1.5 rounded-full bg-base-surface2 text-gray-300 hover:bg-accent/15 hover:text-accent transition-smooth"
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskPrompt()}
              placeholder="Ask for content ideas, a stream theme, or a growth plan..."
              className="flex-1 bg-base-surface2 border border-base-border rounded-lg px-3 py-2.5 text-sm text-gray-100"
            />
            <button
              onClick={() => handleAskPrompt()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-smooth"
            >
              <Send size={15} />
            </button>
          </div>

          {exchanges.length > 0 && (
            <div className="mt-5 space-y-5">
              {exchanges.map((ex) => (
                <div key={ex.id}>
                  <p className="text-xs text-gray-500 mb-2">
                    You asked: <span className="text-gray-300">“{ex.prompt}”</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ex.ideas.map((idea) => (
                      <IdeaCard key={idea.id} idea={idea} onAdd={(i) => addToCalendar(i)} added={addedIds.has(idea.id)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Custom Idea Board</h2>
        <Card className="p-5 mb-4">
          <p className="text-sm font-semibold text-white mb-3">Add your own idea to the backlog</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              value={newIdea.title}
              onChange={(e) => setNewIdea((s) => ({ ...s, title: e.target.value }))}
              placeholder="Idea title"
              className="sm:col-span-2 bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
            />
            <select
              value={newIdea.platform}
              onChange={(e) => setNewIdea((s) => ({ ...s, platform: e.target.value as PlatformId }))}
              className="bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
            >
              {PLATFORM_METRICS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={newIdea.pillar}
              onChange={(e) => setNewIdea((s) => ({ ...s, pillar: e.target.value as ContentPillarId }))}
              className="bg-base-surface2 border border-base-border rounded-lg px-3 py-2 text-sm text-gray-100"
            >
              {CONTENT_PILLARS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addCustomIdea}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-smooth"
          >
            <Plus size={15} /> Add to Backlog
          </button>
        </Card>

        {customIdeas.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mb-2">Drag a card onto a day below to schedule it, or use the Add button.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {customIdeas.map((idea) => (
                <div
                  key={idea.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/idea-id', idea.id)}
                  className="bg-base-surface2 border border-base-border rounded-xl p-3 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={16} className="text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{idea.title}</p>
                    <p className="text-xs text-gray-500 truncate">{idea.format} · {idea.platform}</p>
                  </div>
                  <button
                    onClick={() => addToCalendar(idea)}
                    disabled={addedIds.has(idea.id)}
                    className="text-xs px-2 py-1 rounded-md bg-accent/15 text-accent hover:bg-accent/25 transition-smooth flex-shrink-0"
                  >
                    {addedIds.has(idea.id) ? 'Added' : 'Add'}
                  </button>
                  <button onClick={() => removeCustomIdea(idea.id)} className="text-gray-600 hover:text-status-bad transition-smooth flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((d) => {
                const dateStr = toDateStr(d)
                const isOver = dragOverDate === dateStr
                return (
                  <div
                    key={dateStr}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverDate(dateStr)
                    }}
                    onDragLeave={() => setDragOverDate((cur) => (cur === dateStr ? null : cur))}
                    onDrop={(e) => handleDrop(dateStr, e)}
                    className={`rounded-xl border-2 border-dashed p-3 text-center text-xs transition-smooth ${
                      isOver ? 'border-accent bg-accent/10 text-accent' : 'border-base-border text-gray-500'
                    }`}
                  >
                    <p className="font-medium">{DAY_LABELS[d.getDay()]}</p>
                    <p>{d.getDate()}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <ClipPipeline />
      </section>
    </div>
  )
}
