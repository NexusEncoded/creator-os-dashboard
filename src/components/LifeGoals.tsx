import { useState } from 'react'
import { Target, Plus, Trash2 } from 'lucide-react'
import { Card } from './ui/Card'
import { useServerStorage } from '../hooks/useServerStorage'

interface LifeGoal {
  id: string
  text: string
  done: boolean
}

type Category = 'career' | 'content' | 'personal' | 'learning'

const CATEGORY_LABELS: Record<Category, string> = {
  career: 'Career & Money',
  content: 'Content',
  personal: 'Personal & Health',
  learning: 'Learning & Skill',
}

const CATEGORY_ORDER: Category[] = ['career', 'content', 'personal', 'learning']

const STORAGE_KEY = 'creator-os-life-goals'

// Seeded from the creator's own goals doc — meant to be edited into
// whatever's actually current, not left as-is.
const DEFAULT_GOALS: Record<Category, LifeGoal[]> = {
  career: [
    { id: 'career-1', text: '$1,000,000 on the year', done: false },
    { id: 'career-2', text: 'Make Twitch + content a career', done: false },
  ],
  content: [
    { id: 'content-1', text: '10,000 Twitch followers + 100 active subs', done: false },
    { id: 'content-2', text: '10,000 YouTube subs + monetized', done: false },
    { id: 'content-3', text: '20,000 TikTok followers', done: false },
  ],
  personal: [
    { id: 'personal-1', text: 'Gym 3-4x a week', done: false },
    { id: 'personal-2', text: 'Learn another stream of income', done: false },
    { id: 'personal-3', text: 'Travel', done: false },
  ],
  learning: [
    { id: 'learning-1', text: 'Read 10 books', done: false },
    { id: 'learning-2', text: 'Learn another freelance skill', done: false },
  ],
}

export function LifeGoals() {
  const [goals, setGoals] = useServerStorage<Record<Category, LifeGoal[]>>(STORAGE_KEY, DEFAULT_GOALS)
  const [newGoalText, setNewGoalText] = useState<Record<Category, string>>({
    career: '',
    content: '',
    personal: '',
    learning: '',
  })

  const allGoals = CATEGORY_ORDER.flatMap((c) => goals[c] ?? [])
  const completedCount = allGoals.filter((g) => g.done).length

  function toggleGoal(category: Category, id: string) {
    setGoals((prev) => ({
      ...prev,
      [category]: prev[category].map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
    }))
  }

  function addGoal(category: Category) {
    const text = newGoalText[category].trim()
    if (!text) return
    const goal: LifeGoal = { id: `${category}-${Date.now()}`, text, done: false }
    setGoals((prev) => ({ ...prev, [category]: [...(prev[category] ?? []), goal] }))
    setNewGoalText((prev) => ({ ...prev, [category]: '' }))
  }

  function removeGoal(category: Category, id: string) {
    setGoals((prev) => ({ ...prev, [category]: prev[category].filter((g) => g.id !== id) }))
  }

  return (
    <section>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <Target size={14} /> Life Goals
          </h2>
          <span className="text-xs text-gray-500">
            {completedCount} of {allGoals.length} complete
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORY_ORDER.map((category) => {
            const items = goals[category] ?? []
            const done = items.filter((g) => g.done).length
            return (
              <div key={category} className="bg-base-surface2 border border-base-border rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-100">{CATEGORY_LABELS[category]}</span>
                  <span className="text-xs text-gray-500">
                    {done}/{items.length}
                  </span>
                </div>
                <div className="space-y-1.5 mb-2">
                  {items.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-2 group">
                      <label className="flex items-center gap-2 text-sm flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={goal.done}
                          onChange={() => toggleGoal(category, goal.id)}
                          className="accent-accent flex-shrink-0"
                        />
                        <span className={`truncate ${goal.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                          {goal.text}
                        </span>
                      </label>
                      <button
                        onClick={() => removeGoal(category, goal.id)}
                        className="text-gray-600 hover:text-status-bad transition-smooth flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newGoalText[category]}
                    onChange={(e) => setNewGoalText((prev) => ({ ...prev, [category]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addGoal(category)}
                    placeholder="Add a goal..."
                    className="flex-1 bg-base-surface border border-base-border rounded-md px-2 py-1 text-xs text-gray-100 min-w-0"
                  />
                  <button
                    onClick={() => addGoal(category)}
                    className="p-1 rounded-md bg-accent/15 text-accent hover:bg-accent/25 transition-smooth flex-shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </section>
  )
}
