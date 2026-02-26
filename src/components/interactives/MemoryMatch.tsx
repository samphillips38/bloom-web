import { useState } from 'react'
import { RotateCcw, Trophy } from 'lucide-react'

interface MemoryMatchProps {
  title?: string
  pairs?: { term: string; definition: string }[]
}

interface Card {
  id: number
  content: string
  pairId: number
  type: 'term' | 'definition'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MemoryMatch({
  title = 'Memory Match',
  pairs = [
    { term: '∧', definition: 'AND' },
    { term: '∨', definition: 'OR' },
    { term: '¬', definition: 'NOT' },
    { term: '→', definition: 'IMPLIES' },
    { term: '↔', definition: 'IFF (if and only if)' },
    { term: '∴', definition: 'Therefore' },
  ],
}: MemoryMatchProps) {
  const buildDeck = () =>
    shuffle(
      pairs.flatMap((p, i) => [
        { id: i * 2, content: p.term, pairId: i, type: 'term' as const },
        { id: i * 2 + 1, content: p.definition, pairId: i, type: 'definition' as const },
      ])
    )

  const [cards, setCards] = useState<Card[]>(buildDeck)
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)
  const [wrong, setWrong] = useState<number[]>([])

  const isComplete = matched.size === pairs.length

  function reset() {
    setCards(buildDeck())
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
    setLocked(false)
    setWrong([])
  }

  function handleFlip(cardId: number) {
    if (locked) return
    if (flipped.includes(cardId)) return
    if (matched.has(cards.find(c => c.id === cardId)!.pairId)) return

    const newFlipped = [...flipped, cardId]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      setLocked(true)
      const [a, b] = newFlipped.map(id => cards.find(c => c.id === id)!)
      if (a.pairId === b.pairId && a.type !== b.type) {
        // Match!
        setTimeout(() => {
          setMatched(prev => new Set([...prev, a.pairId]))
          setFlipped([])
          setLocked(false)
          setWrong([])
        }, 600)
      } else {
        // No match
        setWrong(newFlipped)
        setTimeout(() => {
          setFlipped([])
          setLocked(false)
          setWrong([])
        }, 1000)
      }
    }
  }

  const isFlipped = (card: Card) =>
    flipped.includes(card.id) || matched.has(card.pairId)
  const isMatched = (card: Card) => matched.has(card.pairId)
  const isWrong = (card: Card) => wrong.includes(card.id)

  const cols = Math.ceil(Math.sqrt(cards.length))

  return (
    <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-pink-700">{title}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-pink-500">{matched.size}/{pairs.length} pairs · {moves} moves</span>
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-400 hover:text-pink-600 transition-colors">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {isComplete ? (
        <div className="flex flex-col items-center justify-center py-6 space-y-2">
          <Trophy size={40} className="text-amber-500" />
          <p className="font-bold text-rose-800 text-lg">All matched!</p>
          <p className="text-sm text-rose-600">Completed in {moves} moves</p>
          {moves <= pairs.length + 2 && (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">⚡ Excellent memory!</span>
          )}
          <button
            onClick={reset}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors"
          >
            <RotateCcw size={14} /> Play Again
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-pink-500">Match each term to its definition</p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => handleFlip(card.id)}
                disabled={isMatched(card) || (flipped.length === 2 && !flipped.includes(card.id))}
                className="aspect-square relative"
                style={{ minHeight: '64px' }}
              >
                <div
                  className="w-full h-full transition-transform duration-400"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped(card) ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Back (hidden) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-sm border-2 border-pink-300"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="text-xl text-white/70">?</span>
                  </div>
                  {/* Front (visible when flipped) */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-xl border-2 shadow-sm p-1.5 text-center
                      ${isMatched(card)
                        ? 'bg-emerald-100 border-emerald-400'
                        : isWrong(card)
                        ? 'bg-red-100 border-red-400'
                        : 'bg-white border-pink-300'
                      }`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className={`text-xs font-semibold leading-tight
                      ${isMatched(card) ? 'text-emerald-800' : isWrong(card) ? 'text-red-700' : 'text-slate-700'}
                      ${card.type === 'term' ? 'text-base' : 'text-[10px]'}`}>
                      {card.content}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
