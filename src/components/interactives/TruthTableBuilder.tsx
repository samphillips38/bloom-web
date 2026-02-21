import { useState } from 'react'
import { Check, X, RotateCcw } from 'lucide-react'

interface TruthTableBuilderProps {
  title?: string
  operator?: 'AND' | 'OR' | 'NOT' | 'IMPLIES'
}

const operatorInfo = {
  AND: { symbol: '∧', name: 'AND', fn: (a: boolean, _b?: boolean) => a && (_b ?? false) },
  OR: { symbol: '∨', name: 'OR', fn: (a: boolean, _b?: boolean) => a || (_b ?? false) },
  NOT: { symbol: '¬', name: 'NOT', fn: (a: boolean, _b?: boolean) => { void _b; return !a } },
  IMPLIES: { symbol: '→', name: 'IMPLIES', fn: (a: boolean, _b?: boolean) => !a || (_b ?? false) },
}

const rows = [
  { p: true, q: true },
  { p: true, q: false },
  { p: false, q: true },
  { p: false, q: false },
]

export default function TruthTableBuilder({
  title = 'Truth Table',
  operator = 'AND',
}: TruthTableBuilderProps) {
  const op = operatorInfo[operator]
  const isUnary = operator === 'NOT'

  // Track user answers: null = not answered yet
  const [answers, setAnswers] = useState<(boolean | null)[]>([null, null, null, null])
  const [revealed, setRevealed] = useState(false)

  const getCorrect = (i: number) => {
    const row = rows[i]
    return op.fn(row.p, row.q)
  }

  const handleToggle = (i: number) => {
    if (revealed) return
    setAnswers(prev => {
      const next = [...prev]
      if (next[i] === null) next[i] = true
      else if (next[i] === true) next[i] = false
      else next[i] = null
      return next
    })
  }

  const allAnswered = answers.every(a => a !== null)
  const allCorrect = answers.every((a, i) => a === getCorrect(i))

  const handleCheck = () => {
    setRevealed(true)
  }

  const handleReset = () => {
    setAnswers([null, null, null, null])
    setRevealed(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100">
        <h3 className="font-bold text-bloom-text text-sm">{title}</h3>
        <p className="text-xs text-bloom-text-secondary mt-0.5">
          Tap the result cells to fill in the truth table for <strong>P {op.symbol} Q</strong>
        </p>
      </div>

      {/* Table */}
      <div className="px-5 py-4">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="py-2 px-3 text-sm font-bold text-bloom-text">P</th>
              {!isUnary && <th className="py-2 px-3 text-sm font-bold text-bloom-text">Q</th>}
              <th className="py-2 px-3 text-sm font-bold text-bloom-orange">
                {isUnary ? `${op.symbol}P` : `P ${op.symbol} Q`}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              if (isUnary && i >= 2) return null // NOT only needs 2 rows
              const correct = getCorrect(i)
              const userAnswer = answers[i]
              const isRight = revealed && userAnswer === correct
              const isWrong = revealed && userAnswer !== null && userAnswer !== correct

              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-3 px-3">
                    <BoolBadge value={row.p} />
                  </td>
                  {!isUnary && (
                    <td className="py-3 px-3">
                      <BoolBadge value={row.q} />
                    </td>
                  )}
                  <td className="py-3 px-3">
                    <button
                      onClick={() => handleToggle(i)}
                      className={`inline-flex items-center justify-center w-16 h-9 rounded-lg font-bold text-sm transition-all duration-200 ${
                        userAnswer === null
                          ? 'bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300 hover:border-bloom-orange hover:text-bloom-orange'
                          : isRight
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                          : isWrong
                          ? 'bg-red-100 text-red-700 border-2 border-red-400'
                          : userAnswer
                          ? 'bg-bloom-orange/10 text-bloom-orange border-2 border-bloom-orange/30'
                          : 'bg-slate-100 text-slate-600 border-2 border-slate-200'
                      }`}
                    >
                      {userAnswer === null ? '?' : userAnswer ? 'T' : 'F'}
                      {isRight && <Check size={14} className="ml-1" />}
                      {isWrong && <X size={14} className="ml-1" />}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2">
        {!revealed ? (
          <button
            onClick={handleCheck}
            disabled={!allAnswered}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white bg-bloom-blue disabled:opacity-40 transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Check Answers
          </button>
        ) : (
          <>
            {allCorrect ? (
              <div className="flex-1 py-2.5 rounded-xl text-center font-semibold text-sm text-emerald-700 bg-emerald-50 border border-emerald-200">
                ✓ Perfect!
              </div>
            ) : (
              <div className="flex-1 py-2.5 rounded-xl text-center font-semibold text-sm text-red-700 bg-red-50 border border-red-200">
                Not quite — try again!
              </div>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-bloom-text-secondary hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BoolBadge({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-block w-8 h-8 rounded-lg text-sm font-bold leading-8 ${
        value
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {value ? 'T' : 'F'}
    </span>
  )
}
