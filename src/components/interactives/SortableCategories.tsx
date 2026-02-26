import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'

interface Category {
  label: string
  color?: string
  items: string[]
}

interface SortableCategoriesProps {
  title?: string
  instruction?: string
  categories?: Category[]
}

const COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', correct: 'bg-blue-100 border-blue-400 text-blue-800' },
  { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700', correct: 'bg-purple-100 border-purple-400 text-purple-800' },
  { bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', correct: 'bg-amber-100 border-amber-400 text-amber-800' },
  { bg: 'bg-rose-50', border: 'border-rose-200', header: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700', correct: 'bg-rose-100 border-rose-400 text-rose-800' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function SortableCategories({
  title = 'Sort into Categories',
  instruction = 'Tap an item, then tap a category to place it.',
  categories = [
    { label: 'Valid Arguments', items: ['All A are B. X is A. ∴ X is B.', 'If P then Q. P is true. ∴ Q is true.'] },
    { label: 'Invalid Arguments', items: ['All dogs are animals. This is an animal. ∴ It is a dog.', "I've never seen a ghost, so they don't exist."] },
    { label: 'Logical Operators', items: ['AND (∧)', 'OR (∨)', 'NOT (¬)', 'IMPLIES (→)'] },
  ],
}: SortableCategoriesProps) {
  // Build flat pool of items with their correct category index
  const allItems = categories.flatMap((cat, catIdx) =>
    cat.items.map(item => ({ text: item, correctCat: catIdx }))
  )
  const [pool] = useState(() => shuffle(allItems.map((_, i) => i)))
  const [placed, setPlaced] = useState<Map<number, number>>(new Map()) // itemIdx -> catIdx
  const [selected, setSelected] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const unplaced = pool.filter(i => !placed.has(i))
  const total = allItems.length
  const correctCount = [...placed.entries()].filter(([itemIdx, catIdx]) => allItems[itemIdx].correctCat === catIdx).length
  const isComplete = placed.size === total

  function handleItemTap(itemIdx: number) {
    if (placed.has(itemIdx)) return
    setSelected(s => s === itemIdx ? null : itemIdx)
  }

  function handleCategoryTap(catIdx: number) {
    if (selected === null) return
    setPlaced(prev => new Map([...prev, [selected, catIdx]]))
    setSelected(null)
  }

  function reset() {
    setPlaced(new Map())
    setSelected(null)
    setWrong(null)
    setRevealed(false)
  }

  const getItemStyle = (itemIdx: number, inCategory?: boolean) => {
    const isWrong = wrong === itemIdx
    if (inCategory) {
      const placedCat = placed.get(itemIdx)!
      const isCorrect = allItems[itemIdx].correctCat === placedCat
      if (revealed) {
        return isCorrect
          ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
          : 'bg-red-100 border-red-400 text-red-800'
      }
      return COLORS[placedCat % COLORS.length].correct
    }
    if (isWrong) return 'bg-red-100 border-red-400 text-red-700 animate-shake'
    if (selected === itemIdx) return 'bg-indigo-500 border-indigo-500 text-white shadow-md scale-95'
    return 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:shadow-sm'
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Item pool */}
      {unplaced.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">{instruction}</p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map(itemIdx => (
              <button
                key={itemIdx}
                onClick={() => handleItemTap(itemIdx)}
                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all duration-150 ${getItemStyle(itemIdx)}`}
              >
                {allItems[itemIdx].text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 2)}, 1fr)` }}>
        {categories.map((cat, catIdx) => {
          const colors = COLORS[catIdx % COLORS.length]
          const itemsHere = pool.filter(i => placed.get(i) === catIdx)
          return (
            <div
              key={catIdx}
              onClick={() => selected !== null && handleCategoryTap(catIdx)}
              className={`rounded-xl border-2 overflow-hidden transition-all duration-200
                ${selected !== null ? `cursor-pointer ${colors.border} ring-2 ring-offset-1 ${colors.border.replace('border-', 'ring-')} shadow-md` : colors.border}
                ${colors.bg}`}
            >
              <div className={`${colors.header} px-3 py-1.5`}>
                <span className="text-xs font-bold text-white">{cat.label}</span>
              </div>
              <div className="p-2 min-h-[48px] flex flex-wrap gap-1.5">
                {itemsHere.map(itemIdx => (
                  <span
                    key={itemIdx}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium ${getItemStyle(itemIdx, true)}`}
                  >
                    {revealed && allItems[itemIdx].correctCat !== placed.get(itemIdx) ? '✗ ' : ''}
                    {revealed && allItems[itemIdx].correctCat === placed.get(itemIdx) ? '✓ ' : ''}
                    {allItems[itemIdx].text}
                  </span>
                ))}
                {itemsHere.length === 0 && (
                  <span className="text-xs text-slate-400 italic">Drop items here</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {isComplete && !revealed && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">All placed! Check your answers?</span>
          <button
            onClick={() => setRevealed(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
          >
            <Check size={14} /> Check
          </button>
        </div>
      )}
      {revealed && (
        <div className={`flex items-center justify-between p-3 rounded-xl ${correctCount === total ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          <span className={`text-sm font-semibold ${correctCount === total ? 'text-emerald-700' : 'text-amber-700'}`}>
            {correctCount === total ? `🎉 Perfect! ${correctCount}/${total} correct` : `${correctCount}/${total} correct — try again!`}
          </span>
          <button onClick={reset} className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800">
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      )}
    </div>
  )
}
