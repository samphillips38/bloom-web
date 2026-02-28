import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'

interface FillInTheBlankProps {
  title?: string
  /** Sentence with __BLANK__ tokens e.g. "If P is __BLANK__ and P implies Q, then Q is __BLANK__." */
  sentence?: string
  /** Correct answers for each blank, in order */
  blanks?: string[]
  /** Extra decoys in the word bank */
  wordBank?: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FillInTheBlank({
  title = 'Fill in the Blanks',
  sentence = 'If a statement is both __BLANK__ and its argument form is __BLANK__, then it is considered __BLANK__.',
  blanks = ['true', 'valid', 'sound'],
  wordBank = ['false', 'circular', 'invalid', 'complex'],
}: FillInTheBlankProps) {
  const allWords = shuffle([...blanks, ...wordBank])
  const [answers, setAnswers] = useState<(string | null)[]>(blanks.map(() => null))
  const [bank, setBank] = useState(allWords)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [activeBlank, setActiveBlank] = useState<number | null>(null)

  const parts = sentence.split('__BLANK__')
  const allFilled = answers.every(a => a !== null)
  const allCorrect = answers.every((a, i) => a === blanks[i])

  function handleWordSelect(word: string) {
    if (checked) return
    if (activeBlank !== null) {
      // Place word in the active blank
      placeWord(activeBlank, word)
      setActiveBlank(null)
    } else {
      setSelected(s => s === word ? null : word)
    }
  }

  function handleBlankClick(blankIdx: number) {
    if (checked) return
    if (answers[blankIdx] !== null) {
      // Return word to bank
      const returned = answers[blankIdx]!
      setAnswers(prev => prev.map((a, i) => i === blankIdx ? null : a))
      setBank(prev => [...prev, returned])
      setActiveBlank(null)
      setSelected(null)
      return
    }
    if (selected !== null) {
      placeWord(blankIdx, selected)
      setSelected(null)
    } else {
      setActiveBlank(i => i === blankIdx ? null : blankIdx)
    }
  }

  function placeWord(blankIdx: number, word: string) {
    setAnswers(prev => prev.map((a, i) => i === blankIdx ? word : a))
    setBank(prev => prev.filter(w => w !== word))
    setChecked(false)
  }

  function reset() {
    setAnswers(blanks.map(() => null))
    setBank(allWords)
    setSelected(null)
    setChecked(false)
    setActiveBlank(null)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-violet-700">{title}</span>
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Sentence with blanks */}
      <div className="bg-white rounded-xl border border-violet-100 p-4 text-sm leading-loose text-slate-700">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blanks.length && (
              <button
                onClick={() => handleBlankClick(i)}
                className={`inline-flex items-center justify-center min-w-[80px] px-2 py-0.5 mx-1 rounded-lg border-2 font-semibold text-xs transition-all duration-200
                  ${answers[i]
                    ? checked
                      ? answers[i] === blanks[i]
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                        : 'bg-red-100 border-red-400 text-red-700'
                      : 'bg-violet-500 border-violet-500 text-white'
                    : activeBlank === i
                    ? 'bg-violet-100 border-violet-500 text-violet-700 animate-pulse'
                    : 'bg-violet-50 border-violet-300 border-dashed text-violet-400'
                  }`}
              >
                {answers[i] ?? '?'}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Word bank */}
      <div>
        <p className="text-xs font-semibold text-violet-600 mb-2">Word Bank</p>
        <div className="flex flex-wrap gap-2">
          {bank.map((word, i) => (
            <button
              key={`${word}-${i}`}
              onClick={() => handleWordSelect(word)}
              className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all duration-150
                ${selected === word
                  ? 'bg-violet-500 border-violet-500 text-white shadow-md'
                  : 'bg-white border-violet-200 text-violet-700 hover:border-violet-400 hover:shadow-sm'
                }`}
            >
              {word}
            </button>
          ))}
          {bank.length === 0 && (
            <span className="text-xs text-violet-400 italic">All words placed</span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {!checked && (
        <p className="text-xs text-violet-500">
          {activeBlank !== null
            ? 'Now tap a word to fill the blank'
            : selected !== null
            ? `"${selected}" selected — tap a blank to place it`
            : 'Tap a word, then tap a blank — or tap a blank first'}
        </p>
      )}

      {/* Action */}
      {!checked && allFilled && (
        <button
          onClick={() => setChecked(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors"
        >
          <Check size={14} /> Check Answers
        </button>
      )}

      {checked && (
        <div className={`p-3 rounded-xl flex items-center justify-between
          ${allCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}
        >
          <span className={`text-sm font-semibold ${allCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
            {allCorrect
              ? '🎉 Perfect! All blanks correct.'
              : `${answers.filter((a, i) => a === blanks[i]).length}/${blanks.length} correct`}
          </span>
          {!allCorrect && (
            <button onClick={reset} className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800">
              <RotateCcw size={12} /> Try again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
