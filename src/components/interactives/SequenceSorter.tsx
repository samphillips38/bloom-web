import { useState } from 'react'
import { ArrowUp, ArrowDown, Check, RotateCcw, Trophy } from 'lucide-react'

interface SequenceSorterProps {
  title?: string
  instruction?: string
  items?: string[]
  hint?: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function SequenceSorter({
  title = 'Put in the Correct Order',
  instruction = 'Arrange the steps from first to last.',
  items = [
    'Identify the premises of the argument',
    'Check whether the argument form is valid',
    'Verify that the premises are actually true',
    'Accept the conclusion as sound',
  ],
  hint,
}: SequenceSorterProps) {
  const [order, setOrder] = useState<number[]>(() => shuffle(items.map((_, i) => i)))
  const [checked, setChecked] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const isCorrect = (idx: number) => order[idx] === idx
  const allCorrect = order.every((v, i) => v === i)

  function moveUp(pos: number) {
    if (pos === 0) return
    setChecked(false)
    setOrder(prev => {
      const next = [...prev]
      ;[next[pos - 1], next[pos]] = [next[pos], next[pos - 1]]
      return next
    })
  }

  function moveDown(pos: number) {
    if (pos === order.length - 1) return
    setChecked(false)
    setOrder(prev => {
      const next = [...prev]
      ;[next[pos + 1], next[pos]] = [next[pos], next[pos + 1]]
      return next
    })
  }

  function reset() {
    setOrder(shuffle(items.map((_, i) => i)))
    setChecked(false)
    setShowHint(false)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-rose-50 border border-orange-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-orange-700">{title}</span>
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors">
          <RotateCcw size={14} />
        </button>
      </div>

      <p className="text-xs text-orange-600">{instruction}</p>

      {/* Completed state */}
      {checked && allCorrect ? (
        <div className="flex flex-col items-center justify-center py-4 space-y-2">
          <Trophy size={36} className="text-amber-500" />
          <p className="font-bold text-orange-800 text-lg">Perfect sequence!</p>
          <p className="text-sm text-orange-600">You nailed the order.</p>
          <button
            onClick={reset}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Sortable list */}
          <div className="space-y-2">
            {order.map((itemIdx, pos) => {
              const correct = checked && isCorrect(pos)
              const incorrect = checked && !isCorrect(pos)
              return (
                <div
                  key={itemIdx}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200
                    ${correct ? 'bg-emerald-50 border-emerald-300' : incorrect ? 'bg-red-50 border-red-300' : 'bg-white border-orange-100'}`}
                >
                  {/* Position number */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${correct ? 'bg-emerald-500 text-white' : incorrect ? 'bg-red-400 text-white' : 'bg-orange-100 text-orange-600'}`}>
                    {pos + 1}
                  </div>

                  {/* Item text */}
                  <span className={`flex-1 text-sm ${correct ? 'text-emerald-800' : incorrect ? 'text-red-700' : 'text-slate-700'}`}>
                    {items[itemIdx]}
                  </span>

                  {/* Arrows */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveUp(pos)}
                      disabled={pos === 0}
                      className="p-1 rounded hover:bg-orange-100 text-orange-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => moveDown(pos)}
                      disabled={pos === order.length - 1}
                      className="p-1 rounded hover:bg-orange-100 text-orange-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChecked(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              <Check size={14} /> Check Order
            </button>
            {hint && (
              <button
                onClick={() => setShowHint(h => !h)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors"
              >
                {showHint ? 'Hide hint' : '💡 Hint'}
              </button>
            )}
          </div>

          {showHint && hint && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
              {hint}
            </div>
          )}

          {checked && !allCorrect && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {order.filter((v, i) => v === i).length}/{order.length} correct — keep adjusting!
            </div>
          )}
        </>
      )}
    </div>
  )
}
