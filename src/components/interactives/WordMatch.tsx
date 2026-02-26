import { useState, useCallback } from 'react'
import { Check, RotateCcw } from 'lucide-react'

interface WordMatchProps {
  title?: string
  pairs?: { term: string; definition: string }[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WordMatch({
  title = 'Match the Terms',
  pairs = [
    { term: 'Premise', definition: 'A statement assumed to be true' },
    { term: 'Conclusion', definition: 'What follows from the premises' },
    { term: 'Validity', definition: 'Structure guarantees truth transfer' },
    { term: 'Soundness', definition: 'Valid + premises actually true' },
  ],
}: WordMatchProps) {
  const [termOrder] = useState(() => pairs.map((_, i) => i))
  const [defOrder] = useState(() => shuffle(pairs.map((_, i) => i)))
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const [selectedDef, setSelectedDef] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<{ term: number; def: number } | null>(null)
  const [, setScore] = useState(0)

  const isComplete = matched.size === pairs.length

  const handleTermClick = useCallback((pairIdx: number) => {
    if (matched.has(pairIdx)) return
    setWrong(null)
    setSelectedTerm(pairIdx)
    if (selectedDef !== null) {
      check(pairIdx, selectedDef)
    }
  }, [selectedDef, matched])

  const handleDefClick = useCallback((pairIdx: number) => {
    if (matched.has(pairIdx)) return
    setWrong(null)
    setSelectedDef(pairIdx)
    if (selectedTerm !== null) {
      check(selectedTerm, pairIdx)
    }
  }, [selectedTerm, matched])

  function check(termIdx: number, defIdx: number) {
    if (termIdx === defIdx) {
      setMatched(prev => new Set([...prev, termIdx]))
      setScore(s => s + 1)
      setSelectedTerm(null)
      setSelectedDef(null)
    } else {
      setWrong({ term: termIdx, def: defIdx })
      setTimeout(() => {
        setWrong(null)
        setSelectedTerm(null)
        setSelectedDef(null)
      }, 800)
    }
  }

  function reset() {
    setMatched(new Set())
    setSelectedTerm(null)
    setSelectedDef(null)
    setWrong(null)
    setScore(0)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-teal-700">{title}</span>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Check size={14} /> All matched!
            </span>
          ) : (
            <span className="text-xs text-teal-500">{matched.size}/{pairs.length} matched</span>
          )}
          <button
            onClick={reset}
            className="p-1.5 rounded-lg hover:bg-teal-100 text-teal-400 hover:text-teal-600 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {isComplete ? (
        <div className="flex flex-col items-center justify-center py-6 space-y-2">
          <div className="text-4xl">🎯</div>
          <p className="font-bold text-emerald-800 text-lg">Perfect match!</p>
          <p className="text-sm text-emerald-600">You matched all {pairs.length} pairs correctly.</p>
          <button
            onClick={reset}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            <RotateCcw size={14} /> Play Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Terms column */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide text-center mb-2">Terms</p>
            {termOrder.map((pairIdx) => {
              const isMatched = matched.has(pairIdx)
              const isSelected = selectedTerm === pairIdx
              const isWrong = wrong?.term === pairIdx
              return (
                <button
                  key={pairIdx}
                  onClick={() => handleTermClick(pairIdx)}
                  disabled={isMatched}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 border-2
                    ${isMatched
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700 cursor-default'
                      : isWrong
                      ? 'bg-red-100 border-red-400 text-red-700 animate-shake'
                      : isSelected
                      ? 'bg-teal-500 border-teal-500 text-white shadow-md'
                      : 'bg-white border-teal-200 text-teal-800 hover:border-teal-400 hover:shadow-sm'
                    }`}
                >
                  {isMatched && <Check size={12} className="inline mr-1" />}
                  {pairs[pairIdx].term}
                </button>
              )
            })}
          </div>

          {/* Definitions column */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide text-center mb-2">Definitions</p>
            {defOrder.map((pairIdx) => {
              const isMatched = matched.has(pairIdx)
              const isSelected = selectedDef === pairIdx
              const isWrong = wrong?.def === pairIdx
              return (
                <button
                  key={pairIdx}
                  onClick={() => handleDefClick(pairIdx)}
                  disabled={isMatched}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all duration-200 border-2 leading-snug
                    ${isMatched
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700 cursor-default'
                      : isWrong
                      ? 'bg-red-100 border-red-400 text-red-700 animate-shake'
                      : isSelected
                      ? 'bg-teal-500 border-teal-500 text-white shadow-md'
                      : 'bg-white border-teal-200 text-teal-800 hover:border-teal-400 hover:shadow-sm'
                    }`}
                >
                  {isMatched && <Check size={10} className="inline mr-1" />}
                  {pairs[pairIdx].definition}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!isComplete && (
        <p className="text-xs text-teal-500 text-center">Tap a term then its matching definition</p>
      )}
    </div>
  )
}
