import { useState } from 'react'

interface TimelineEvent {
  year: string
  title: string
  description: string
  emoji?: string
}

interface TimelineProps {
  title?: string
  events?: TimelineEvent[]
}

export default function Timeline({
  title = 'History of Logic',
  events = [
    {
      year: '350 BC',
      title: 'Aristotle\'s Organon',
      description: 'Aristotle formalizes deductive logic, creating the first systematic framework for reasoning through syllogisms.',
      emoji: '🏛️',
    },
    {
      year: '1847',
      title: 'Boole\'s Laws of Thought',
      description: 'George Boole develops Boolean algebra, connecting logic to mathematics and laying the groundwork for computing.',
      emoji: '🔢',
    },
    {
      year: '1879',
      title: 'Frege\'s Begriffsschrift',
      description: 'Gottlob Frege invents predicate logic — a far more powerful notation that can express relations and quantifiers.',
      emoji: '📝',
    },
    {
      year: '1910',
      title: 'Principia Mathematica',
      description: 'Russell & Whitehead attempt to derive all of mathematics from logical axioms, pushing formal logic to its limits.',
      emoji: '📚',
    },
    {
      year: '1931',
      title: 'Gödel\'s Incompleteness',
      description: 'Kurt Gödel proves that any consistent formal system capable of arithmetic must contain unprovable truths.',
      emoji: '♾️',
    },
    {
      year: '1936',
      title: 'Turing\'s Machines',
      description: 'Alan Turing defines computable logic through his theoretical "Turing Machine", birthing computer science.',
      emoji: '💻',
    },
  ],
}: TimelineProps) {
  const [expanded, setExpanded] = useState<number | null>(0)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-amber-800">{title}</span>
        <div className="flex-1 h-px bg-amber-200" />
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-amber-200" />

        <div className="space-y-2">
          {events.map((event, i) => {
            const isOpen = expanded === i
            return (
              <div key={i} className="relative pl-12">
                {/* Node */}
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="absolute left-0 top-1 z-10"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all duration-200 shadow-sm border-2
                    ${isOpen
                      ? 'bg-amber-500 border-amber-500 scale-110 shadow-md'
                      : 'bg-white border-amber-200 hover:border-amber-400'
                    }`}>
                    {event.emoji ?? '📌'}
                  </div>
                </button>

                {/* Card */}
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className={`w-full text-left rounded-xl border-2 transition-all duration-200 overflow-hidden
                    ${isOpen
                      ? 'border-amber-400 shadow-md bg-white'
                      : 'border-amber-100 bg-white/70 hover:border-amber-300 hover:bg-white'
                    }`}
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`text-xs font-bold tabular-nums flex-shrink-0
                      ${isOpen ? 'text-amber-600' : 'text-amber-400'}`}>
                      {event.year}
                    </span>
                    <span className={`text-sm font-semibold flex-1 ${isOpen ? 'text-amber-900' : 'text-slate-700'}`}>
                      {event.title}
                    </span>
                    <span className={`text-amber-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                      ›
                    </span>
                  </div>

                  {/* Expanded description */}
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40' : 'max-h-0'}`}>
                    <div className="px-3 pb-3">
                      <div className="border-t border-amber-100 pt-2">
                        <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-amber-500 text-center">Tap any event to expand</p>
    </div>
  )
}
