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
  { bg: 'bg-blue-50', border: 'border-blue-200', headerBg: 'bg-blue-100', label: 'text-blue-800', desc: 'text-blue-700', dot: 'bg-blue-400' },
  { bg: 'bg-purple-50', border: 'border-purple-200', headerBg: 'bg-purple-100', label: 'text-purple-800', desc: 'text-purple-700', dot: 'bg-purple-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', headerBg: 'bg-emerald-100', label: 'text-emerald-800', desc: 'text-emerald-700', dot: 'bg-emerald-400' },
  { bg: 'bg-amber-50', border: 'border-amber-200', headerBg: 'bg-amber-100', label: 'text-amber-800', desc: 'text-amber-700', dot: 'bg-amber-400' },
  { bg: 'bg-rose-50', border: 'border-rose-200', headerBg: 'bg-rose-100', label: 'text-rose-800', desc: 'text-rose-700', dot: 'bg-rose-400' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', headerBg: 'bg-cyan-100', label: 'text-cyan-800', desc: 'text-cyan-700', dot: 'bg-cyan-400' },
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
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [visited, setVisited] = useState<Set<number>>(new Set())

  function toggleNode(i: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) {
        next.delete(i)
      } else {
        next.add(i)
      }
      return next
    })
    setVisited(prev => new Set([...prev, i]))
  }

  const allVisited = visited.size === nodes.length

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="text-xs text-slate-400">{visited.size}/{nodes.length} explored</span>
      </div>

      {/* Central hub */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-2xl">{centerEmoji}</span>
        </div>
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide">Central concept</p>
          <p className="text-base font-bold text-slate-800">{center}</p>
        </div>
      </div>

      {/* Connector line */}
      <div className="mx-5 mb-1 flex items-center gap-2">
        <div className="w-0.5 h-4 bg-slate-200 ml-5" />
      </div>

      {/* Concept cards */}
      <div className="px-4 pb-4 space-y-2">
        {nodes.map((node, i) => {
          const colors = NODE_COLORS[i % NODE_COLORS.length]
          const isExpanded = expanded.has(i)
          const isVisited = visited.has(i)

          return (
            <div key={i} className={`rounded-xl border transition-all duration-200 ${colors.border} ${isExpanded ? colors.bg : 'bg-white'}`}>
              <button
                onClick={() => toggleNode(i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                {/* Color dot / visited indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${isVisited ? colors.dot : 'bg-slate-200'}`} />

                {/* Emoji */}
                <span className="text-lg flex-shrink-0">{node.emoji ?? '💡'}</span>

                {/* Label */}
                <span className={`text-sm font-semibold flex-1 ${colors.label}`}>{node.label}</span>

                {/* Chevron */}
                <span className={`text-xs transition-transform duration-200 text-slate-400 ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Description — expands on tap */}
              {isExpanded && (
                <div className="px-4 pb-3">
                  <div className="pl-5 border-l-2 border-current ml-2.5" style={{ borderColor: 'inherit' }}>
                    <p className={`text-sm leading-relaxed ${colors.desc}`}>{node.description}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Completion banner */}
      {allVisited && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold text-center">
          🌟 All concepts explored!
        </div>
      )}

      {!allVisited && (
        <p className="pb-4 text-xs text-slate-400 text-center">
          Tap each concept to learn more
        </p>
      )}
    </div>
  )
}
