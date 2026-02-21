import { useState } from 'react'

interface VennDiagramProps {
  title?: string
  leftLabel?: string
  rightLabel?: string
  leftItems?: string[]
  rightItems?: string[]
  bothItems?: string[]
}

type Region = 'left' | 'right' | 'both' | null

export default function VennDiagram({
  title = 'Venn Diagram',
  leftLabel = 'Set A',
  rightLabel = 'Set B',
  leftItems = [],
  rightItems = [],
  bothItems = [],
}: VennDiagramProps) {
  const [activeRegion, setActiveRegion] = useState<Region>(null)

  const getItems = () => {
    switch (activeRegion) {
      case 'left': return { label: `Only ${leftLabel}`, items: leftItems }
      case 'right': return { label: `Only ${rightLabel}`, items: rightItems }
      case 'both': return { label: `${leftLabel} ∩ ${rightLabel}`, items: bothItems }
      default: return null
    }
  }

  const active = getItems()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-100">
        <h3 className="font-bold text-bloom-text text-sm">{title}</h3>
        <p className="text-xs text-bloom-text-secondary mt-0.5">Tap regions to explore</p>
      </div>

      {/* Venn Diagram SVG */}
      <div className="px-5 pt-4 flex justify-center">
        <svg viewBox="0 0 300 200" className="w-full max-w-xs">
          {/* Left circle only region */}
          <clipPath id="leftOnly">
            <circle cx="115" cy="100" r="75" />
          </clipPath>
          <clipPath id="rightOnly">
            <circle cx="185" cy="100" r="75" />
          </clipPath>

          {/* Left circle */}
          <circle
            cx="115"
            cy="100"
            r="75"
            fill={activeRegion === 'left' ? '#FF6B3530' : '#FF6B3515'}
            stroke={activeRegion === 'left' ? '#FF6B35' : '#FF6B3580'}
            strokeWidth="2"
            className="cursor-pointer transition-all duration-300"
            onClick={() => setActiveRegion(activeRegion === 'left' ? null : 'left')}
          />

          {/* Right circle */}
          <circle
            cx="185"
            cy="100"
            r="75"
            fill={activeRegion === 'right' ? '#4A90D930' : '#4A90D915'}
            stroke={activeRegion === 'right' ? '#4A90D9' : '#4A90D980'}
            strokeWidth="2"
            className="cursor-pointer transition-all duration-300"
            onClick={() => setActiveRegion(activeRegion === 'right' ? null : 'right')}
          />

          {/* Intersection region (overlay) */}
          <g className="cursor-pointer" onClick={() => setActiveRegion(activeRegion === 'both' ? null : 'both')}>
            {/* We approximate the intersection with a lens shape */}
            <path
              d={`M 150 38
                  A 75 75 0 0 1 150 162
                  A 75 75 0 0 1 150 38`}
              fill={activeRegion === 'both' ? '#9B59B630' : '#9B59B615'}
              stroke={activeRegion === 'both' ? '#9B59B6' : 'transparent'}
              strokeWidth="2"
              className="transition-all duration-300"
            />
          </g>

          {/* Labels */}
          <text x="85" y="100" textAnchor="middle" className="text-xs fill-slate-600 font-semibold" fontSize="12">
            {leftLabel}
          </text>
          <text x="215" y="100" textAnchor="middle" className="text-xs fill-slate-600 font-semibold" fontSize="12">
            {rightLabel}
          </text>
          <text x="150" y="104" textAnchor="middle" className="text-xs fill-slate-400 font-medium" fontSize="10">
            Both
          </text>
        </svg>
      </div>

      {/* Selected region details */}
      <div className="px-5 pb-5 pt-2 min-h-[80px]">
        {active ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 animate-slide-up">
            <p className="text-xs font-bold text-bloom-text-secondary uppercase tracking-wider mb-2">{active.label}</p>
            {active.items.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {active.items.map((item, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-white text-sm text-bloom-text font-medium border border-slate-200 shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-bloom-text-secondary italic">No items</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-bloom-text-muted text-center pt-3">Tap a region above to see its elements</p>
        )}
      </div>
    </div>
  )
}
