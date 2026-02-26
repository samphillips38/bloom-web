import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

interface PollProps {
  question?: string
  options?: string[]
}

const BAR_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-cyan-400 to-sky-500',
]

export default function Poll({
  question = 'Which application of logic interests you most?',
  options = ['Mathematics & Proofs', 'Computer Science & Coding', 'Philosophy & Ethics', 'Everyday Decision Making', 'Debate & Rhetoric'],
}: PollProps) {
  const [votes, setVotes] = useState<number[]>(options.map(() => 0))
  const [voted, setVoted] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)

  const total = votes.reduce((a, b) => a + b, 0)

  function vote(optionIdx: number) {
    if (voted !== null) return
    setAnimating(true)
    setVotes(prev => prev.map((v, i) => i === optionIdx ? v + 1 : v))
    setVoted(optionIdx)
  }

  function reset() {
    setVotes(options.map(() => 0))
    setVoted(null)
    setAnimating(false)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sky-700">📊 Quick Poll</span>
        {voted !== null && (
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-sky-100 text-sky-400 hover:text-sky-600 transition-colors">
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      <p className="text-base font-semibold text-slate-800 leading-snug">{question}</p>

      {/* Options */}
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0
          const isChosen = voted === i
          const colors = BAR_COLORS[i % BAR_COLORS.length]

          return voted === null ? (
            // Pre-vote: clickable buttons
            <button
              key={i}
              onClick={() => vote(i)}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-sky-100 bg-white text-sm font-medium text-slate-700 hover:border-sky-300 hover:shadow-sm hover:bg-sky-50 transition-all duration-200 active:scale-95"
            >
              {opt}
            </button>
          ) : (
            // Post-vote: bar chart
            <div key={i} className={`rounded-xl overflow-hidden border-2 ${isChosen ? 'border-sky-400' : 'border-slate-100'} bg-white`}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold truncate ${isChosen ? 'text-sky-700' : 'text-slate-600'}`}>
                      {isChosen && '✓ '}{opt}
                    </span>
                    <span className={`text-xs font-bold ml-2 flex-shrink-0 ${isChosen ? 'text-sky-600' : 'text-slate-500'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors} rounded-full transition-all duration-700 ease-out`}
                      style={{ width: animating ? `${pct}%` : '0%' }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 w-8 text-right flex-shrink-0">{votes[i]}</span>
              </div>
            </div>
          )
        })}
      </div>

      {voted !== null && (
        <p className="text-xs text-sky-500 text-center">
          {total} vote{total !== 1 ? 's' : ''} — thanks for participating!
        </p>
      )}
      {voted === null && (
        <p className="text-xs text-sky-400 text-center">Tap to vote</p>
      )}
    </div>
  )
}
