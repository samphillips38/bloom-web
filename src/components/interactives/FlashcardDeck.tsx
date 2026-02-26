import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react'

interface Flashcard {
  front: string
  back: string
}

interface FlashcardDeckProps {
  title?: string
  cards?: Flashcard[]
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FlashcardDeck({
  title = 'Flashcards',
  cards = [
    { front: 'Premise', back: 'A statement assumed to be true as a basis for reasoning' },
    { front: 'Conclusion', back: 'The statement that follows from the premises in an argument' },
    { front: 'Valid', back: 'An argument where the conclusion must be true if the premises are true' },
  ],
}: FlashcardDeckProps) {
  const [deck, setDeck] = useState(cards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seen, setSeen] = useState<Set<number>>(new Set())

  const card = deck[index]
  const progress = seen.size / deck.length

  function next() {
    setSeen(prev => new Set([...prev, index]))
    setFlipped(false)
    setTimeout(() => setIndex(i => Math.min(i + 1, deck.length - 1)), 150)
  }

  function prev() {
    setFlipped(false)
    setTimeout(() => setIndex(i => Math.max(i - 1, 0)), 150)
  }

  function restart() {
    setIndex(0)
    setFlipped(false)
    setSeen(new Set())
  }

  function shuffle() {
    setDeck(shuffleArray(deck))
    setIndex(0)
    setFlipped(false)
    setSeen(new Set())
  }

  const isLast = index === deck.length - 1
  const allSeen = seen.size === deck.length

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-700">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-500 font-medium">
            {index + 1} / {deck.length}
          </span>
          <button
            onClick={shuffle}
            className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
            title="Shuffle"
          >
            <Shuffle size={14} />
          </button>
          <button
            onClick={restart}
            className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
            title="Restart"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Card */}
      {allSeen ? (
        <div className="flex flex-col items-center justify-center h-44 text-center space-y-3">
          <div className="text-4xl">🎉</div>
          <p className="font-bold text-indigo-800 text-lg">All {deck.length} cards reviewed!</p>
          <button
            onClick={restart}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
          >
            <RotateCcw size={14} />
            Review Again
          </button>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(f => !f)}
          className="w-full h-44 rounded-2xl relative cursor-pointer"
          style={{ perspective: '1000px' }}
        >
          <div
            className="w-full h-full relative transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white shadow-md border border-indigo-100 p-6"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">Term</p>
              <p className="text-2xl font-bold text-indigo-900 text-center">{card.front}</p>
              <p className="text-xs text-indigo-300 mt-4">Tap to reveal definition</p>
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md p-6"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3">Definition</p>
              <p className="text-base font-medium text-white text-center leading-relaxed">{card.back}</p>
            </div>
          </div>
        </button>
      )}

      {/* Navigation */}
      {!allSeen && (
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={index === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            onClick={next}
            disabled={isLast && seen.has(index)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? 'Done' : 'Next'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      )}
    </div>
  )
}
