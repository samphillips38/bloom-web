import { useState } from 'react'
import { X } from 'lucide-react'

interface Hotspot {
  /** 0-100 percentage from left */
  x: number
  /** 0-100 percentage from top */
  y: number
  label: string
  description: string
  emoji?: string
}

interface HotspotDiagramProps {
  title?: string
  /** A large emoji used as the diagram background, or a descriptive text */
  diagramEmoji?: string
  diagramLabel?: string
  hotspots?: Hotspot[]
}

export default function HotspotDiagram({
  title = 'Logic Gates Diagram',
  diagramEmoji = '🖥️',
  diagramLabel = 'Digital Logic Circuit',
  hotspots = [
    { x: 18, y: 30, label: 'AND Gate', description: 'Outputs 1 only when BOTH inputs are 1. Symbol: A ∧ B. Used in circuits to require multiple conditions to be met simultaneously.', emoji: '⚡' },
    { x: 50, y: 20, label: 'OR Gate', description: 'Outputs 1 when AT LEAST ONE input is 1. Symbol: A ∨ B. Used when any one condition being true is sufficient.', emoji: '🔀' },
    { x: 80, y: 35, label: 'NOT Gate', description: 'Inverts the input — turns 1 into 0 and 0 into 1. Symbol: ¬A. Also called an inverter.', emoji: '🔄' },
    { x: 30, y: 70, label: 'NAND Gate', description: 'NOT AND — outputs 0 only when BOTH inputs are 1. Functionally complete: any logic circuit can be built from NAND gates alone.', emoji: '🔩' },
    { x: 65, y: 72, label: 'XOR Gate', description: 'Exclusive OR — outputs 1 when inputs DIFFER. Symbol: A ⊕ B. Used in binary addition and cryptography.', emoji: '⊕' },
  ],
}: HotspotDiagramProps) {
  const [active, setActive] = useState<number | null>(null)
  const [visited, setVisited] = useState<Set<number>>(new Set())

  function open(i: number) {
    setActive(i)
    setVisited(prev => new Set([...prev, i]))
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-zinc-50 border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="text-xs text-slate-400">{visited.size}/{hotspots.length} explored</span>
      </div>

      {/* Diagram area */}
      <div className="relative rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden"
        style={{ paddingBottom: '56%' }}
      >
        {/* Central emoji / diagram background */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
          <span className="text-7xl opacity-20">{diagramEmoji}</span>
          <span className="text-xs text-slate-400 font-medium mt-2 opacity-60">{diagramLabel}</span>
        </div>

        {/* Grid lines for circuit feel */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-500" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Hotspot pins */}
        {hotspots.map((spot, i) => {
          const isVisited = visited.has(i)
          const isActive = active === i
          return (
            <button
              key={i}
              onClick={() => open(i)}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group"
              title={spot.label}
            >
              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md border-2
                ${isActive
                  ? 'bg-indigo-500 border-indigo-400 scale-125 shadow-lg'
                  : isVisited
                  ? 'bg-emerald-400 border-emerald-300 scale-105'
                  : 'bg-white border-slate-300 hover:border-indigo-400 hover:scale-110'
                }`}
              >
                <span className="text-sm">{spot.emoji ?? '📍'}</span>
                {/* Pulse ring for unvisited */}
                {!isVisited && !isActive && (
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-75" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Active panel */}
      {active !== null && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 relative">
          <button
            onClick={() => setActive(null)}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{hotspots[active].emoji ?? '📍'}</span>
            <span className="font-bold text-indigo-800 text-sm">{hotspots[active].label}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{hotspots[active].description}</p>

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => open((active - 1 + hotspots.length) % hotspots.length)}
              className="px-2 py-1 text-xs rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors font-medium"
            >
              ← Prev
            </button>
            <span className="text-xs text-indigo-400 flex-1 text-center">{active + 1} / {hotspots.length}</span>
            <button
              onClick={() => open((active + 1) % hotspots.length)}
              className="px-2 py-1 text-xs rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors font-medium"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {active === null && (
        <p className="text-xs text-slate-400 text-center">Tap the glowing pins to explore</p>
      )}

      {visited.size === hotspots.length && active === null && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold text-center">
          🎉 You've explored all {hotspots.length} points!
        </div>
      )}
    </div>
  )
}
