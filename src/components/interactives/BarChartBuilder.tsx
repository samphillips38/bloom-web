import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

interface Bar {
  label: string
  value: number
  maxValue?: number
  color?: string
}

interface BarChartBuilderProps {
  title?: string
  description?: string
  bars?: Bar[]
  showValues?: boolean
}

const DEFAULT_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-fuchsia-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-sky-500',
]

export default function BarChartBuilder({
  title = 'Logical Fallacy Frequency',
  description = 'Adjust the sliders to explore how often these fallacies appear in real debates.',
  bars: initialBars = [
    { label: 'Ad Hominem', value: 72, maxValue: 100 },
    { label: 'Straw Man', value: 58, maxValue: 100 },
    { label: 'False Dilemma', value: 45, maxValue: 100 },
    { label: 'Slippery Slope', value: 38, maxValue: 100 },
    { label: 'Appeal to Authority', value: 63, maxValue: 100 },
  ],
  showValues = true,
}: BarChartBuilderProps) {
  const [bars, setBars] = useState(initialBars)
  const maxVal = Math.max(...bars.map(b => b.maxValue ?? 100))

  function updateBar(idx: number, value: number) {
    setBars(prev => prev.map((b, i) => i === idx ? { ...b, value } : b))
  }

  function reset() {
    setBars(initialBars)
  }

  const sortedBars = [...bars].sort((a, b) => b.value - a.value)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <RotateCcw size={14} />
        </button>
      </div>

      {description && <p className="text-xs text-slate-500">{description}</p>}

      {/* Chart */}
      <div className="space-y-3">
        {bars.map((bar, idx) => {
          const colors = DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
          const pct = ((bar.value) / (bar.maxValue ?? maxVal)) * 100
          const rank = sortedBars.findIndex(b => b.label === bar.label) + 1

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  {rank === 1 && <span className="text-amber-500">👑</span>}
                  {bar.label}
                </span>
                {showValues && (
                  <span className="text-xs font-bold text-slate-700 tabular-nums">{bar.value}</span>
                )}
              </div>
              {/* Bar */}
              <div className="h-5 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full bg-gradient-to-r ${colors} rounded-full transition-all duration-200`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Slider */}
              <input
                type="range"
                min={0}
                max={bar.maxValue ?? maxVal}
                value={bar.value}
                onChange={(e) => updateBar(idx, parseInt(e.target.value))}
                className="w-full h-1.5 appearance-none bg-transparent cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-slate-500
                  [&::-webkit-slider-thumb]:shadow-sm
                  [&::-webkit-slider-thumb]:hover:bg-slate-700
                  [&::-webkit-slider-thumb]:transition-colors"
              />
            </div>
          )
        })}
      </div>

      {/* Legend / insight */}
      <div className="pt-1 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          🏆 Most common: <span className="font-semibold text-slate-700">{sortedBars[0].label}</span> ({sortedBars[0].value})
          {' · '}
          Drag sliders to explore the data
        </p>
      </div>
    </div>
  )
}
