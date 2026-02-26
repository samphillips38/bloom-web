import { useState } from 'react'

interface ConceptNode {
  label: string
  description: string
  emoji?: string
  color?: string
}

interface ConceptWebProps {
  center?: string
  centerEmoji?: string
  nodes?: ConceptNode[]
  title?: string
}

const NODE_COLORS = [
  { ring: 'ring-blue-400', bg: 'bg-blue-50', badge: 'bg-blue-500', text: 'text-blue-800', border: 'border-blue-200', panel: 'bg-blue-50 border-blue-200' },
  { ring: 'ring-purple-400', bg: 'bg-purple-50', badge: 'bg-purple-500', text: 'text-purple-800', border: 'border-purple-200', panel: 'bg-purple-50 border-purple-200' },
  { ring: 'ring-emerald-400', bg: 'bg-emerald-50', badge: 'bg-emerald-500', text: 'text-emerald-800', border: 'border-emerald-200', panel: 'bg-emerald-50 border-emerald-200' },
  { ring: 'ring-amber-400', bg: 'bg-amber-50', badge: 'bg-amber-500', text: 'text-amber-800', border: 'border-amber-200', panel: 'bg-amber-50 border-amber-200' },
  { ring: 'ring-rose-400', bg: 'bg-rose-50', badge: 'bg-rose-500', text: 'text-rose-800', border: 'border-rose-200', panel: 'bg-rose-50 border-rose-200' },
  { ring: 'ring-cyan-400', bg: 'bg-cyan-50', badge: 'bg-cyan-500', text: 'text-cyan-800', border: 'border-cyan-200', panel: 'bg-cyan-50 border-cyan-200' },
]

export default function ConceptWeb({
  title = 'Concept Web',
  center = 'Logic',
  centerEmoji = '🧠',
  nodes = [
    { label: 'Deductive', description: 'Reasoning from general principles to specific conclusions. If the premises are true and the argument is valid, the conclusion must be true.', emoji: '⬇️' },
    { label: 'Inductive', description: 'Reasoning from specific observations to general conclusions. The conclusion is probable but not guaranteed — this is how science works.', emoji: '⬆️' },
    { label: 'Abductive', description: 'Inference to the best explanation. Given incomplete observations, find the simplest hypothesis that explains them. Used in diagnosis and detection.', emoji: '🔍' },
    { label: 'Formal', description: 'Logic studied through abstract symbols and rules, independent of meaning. Includes propositional and predicate logic.', emoji: '📐' },
    { label: 'Informal', description: 'Logic applied to natural language arguments, including identification of fallacies, rhetorical analysis, and critical thinking.', emoji: '💬' },
  ],
}: ConceptWebProps) {
  const [active, setActive] = useState<number | null>(null)
  const [visited, setVisited] = useState<Set<number>>(new Set())

  function handleNodeClick(i: number) {
    setActive(prev => prev === i ? null : i)
    setVisited(prev => new Set([...prev, i]))
  }

  // Arrange nodes in a circle
  const radius = 110
  const cx = 150
  const cy = 130

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-700">{title}</span>
        <span className="text-xs text-indigo-400">{visited.size}/{nodes.length} explored</span>
      </div>

      {/* SVG web */}
      <div className="flex justify-center">
        <svg width="300" height="260" viewBox="0 0 300 260" className="overflow-visible">
          {/* Connection lines */}
          {nodes.map((_node, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
            const nx = cx + radius * Math.cos(angle)
            const ny = cy + radius * Math.sin(angle)
            return (
              <line
                key={i}
                x1={cx} y1={cy} x2={nx} y2={ny}
                stroke={active === i ? '#6366f1' : '#c7d2fe'}
                strokeWidth={active === i ? 2 : 1}
                strokeDasharray={active === i ? '0' : '4 3'}
                className="transition-all duration-200"
              />
            )
          })}

          {/* Center node */}
          <g>
            <circle cx={cx} cy={cy} r={36} fill="white" stroke="#6366f1" strokeWidth={2} />
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20">{centerEmoji}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#3730a3">{center}</text>
          </g>

          {/* Satellite nodes */}
          {nodes.map((node, i) => {
            void NODE_COLORS[i % NODE_COLORS.length] // color applied via SVG fill below
            const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
            const nx = cx + radius * Math.cos(angle)
            const ny = cy + radius * Math.sin(angle)
            const isActive = active === i
            const isVisited = visited.has(i)

            return (
              <g key={i} onClick={() => handleNodeClick(i)} className="cursor-pointer">
                <circle
                  cx={nx} cy={ny} r={isActive ? 28 : 24}
                  fill={isActive ? '#6366f1' : isVisited ? '#ede9fe' : 'white'}
                  stroke={isActive ? '#4f46e5' : '#c7d2fe'}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className="transition-all duration-200"
                />
                {/* Pulse for unvisited */}
                {!isVisited && !isActive && (
                  <circle cx={nx} cy={ny} r={26} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.4}>
                    <animate attributeName="r" from="24" to="32" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x={nx} y={ny - 6} textAnchor="middle" fontSize="14">{node.emoji ?? '💡'}</text>
                <text x={nx} y={ny + 8} textAnchor="middle" fontSize="9" fontWeight="bold"
                  fill={isActive ? 'white' : '#4338ca'}>
                  {node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Description panel */}
      {active !== null ? (
        <div className={`rounded-xl border-2 p-4 transition-all duration-200 ${NODE_COLORS[active % NODE_COLORS.length].panel}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{nodes[active].emoji ?? '💡'}</span>
            <span className={`font-bold text-sm ${NODE_COLORS[active % NODE_COLORS.length].text}`}>{nodes[active].label}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{nodes[active].description}</p>
        </div>
      ) : (
        <p className="text-xs text-indigo-400 text-center">Tap a satellite node to explore its concept</p>
      )}

      {visited.size === nodes.length && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold text-center">
          🌟 Full web explored!
        </div>
      )}
    </div>
  )
}
