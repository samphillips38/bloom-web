import { useState, useRef, useCallback } from 'react'
import { Check, RotateCcw } from 'lucide-react'

interface Marker {
  value: number
  label: string
}

interface NumberLineProps {
  title?: string
  question?: string
  min?: number
  max?: number
  step?: number
  markers?: Marker[]
  /** If provided, checking will compare against this */
  answer?: number
  answerTolerance?: number
  unit?: string
}

export default function NumberLine({
  title = 'Number Line',
  question = 'On a scale from 0 to 10, how confident are you about logic so far?',
  min = 0,
  max = 10,
  step = 1,
  markers,
  answer,
  answerTolerance = 1,
  unit = '',
}: NumberLineProps) {
  const [value, setValue] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const defaultMarkers: Marker[] = markers ?? [
    { value: min, label: String(min) },
    ...(max - min <= 10
      ? Array.from({ length: max - min - 1 }, (_, i) => ({ value: min + i + 1, label: String(min + i + 1) }))
      : [{ value: Math.round((min + max) / 2), label: String(Math.round((min + max) / 2)) }]),
    { value: max, label: String(max) },
  ]

  const pct = value !== null ? ((value - min) / (max - min)) * 100 : null

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const raw = min + x * (max - min)
    const snapped = Math.round(raw / step) * step
    const clamped = Math.max(min, Math.min(max, snapped))
    setValue(clamped)
    setChecked(false)
  }

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(parseFloat(e.target.value))
    setChecked(false)
  }, [])

  function reset() {
    setValue(null)
    setChecked(false)
  }

  const isCorrect = checked && answer !== undefined && value !== null && Math.abs(value - answer) <= answerTolerance
  const isWrong = checked && answer !== undefined && value !== null && Math.abs(value - answer) > answerTolerance

  // Emoji for self-rating (when no correct answer)
  const getEmoji = (v: number) => {
    const t = (v - min) / (max - min)
    if (t < 0.2) return '😅'
    if (t < 0.4) return '🤔'
    if (t < 0.6) return '😊'
    if (t < 0.8) return '😎'
    return '🚀'
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-cyan-700">{title}</span>
        {value !== null && (
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-cyan-100 text-cyan-400 hover:text-cyan-600 transition-colors">
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {question && <p className="text-sm text-slate-700 font-medium leading-snug">{question}</p>}

      {/* Track + slider */}
      <div className="space-y-2 px-2">
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative h-3 bg-cyan-100 rounded-full cursor-pointer"
        >
          {/* Fill */}
          {pct !== null && (
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          )}
          {/* Thumb */}
          {pct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-400 shadow-md transition-all duration-150"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={handleSliderChange}
          className="w-full appearance-none bg-transparent cursor-pointer h-1
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-0
            [&::-webkit-slider-thumb]:h-0"
        />

        {/* Markers */}
        <div className="relative h-5">
          {defaultMarkers.map((m, i) => {
            const mPct = ((m.value - min) / (max - min)) * 100
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${mPct}%` }}
              >
                <div className="w-px h-2 bg-cyan-300" />
                <span className="text-[10px] text-cyan-600 font-medium">{m.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Value display */}
      {value !== null && (
        <div className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all
          ${isCorrect ? 'bg-emerald-50 border-emerald-300' : isWrong ? 'bg-red-50 border-red-300' : 'bg-cyan-50 border-cyan-200'}`}
        >
          <div className="flex items-center gap-2">
            {answer === undefined && <span className="text-2xl">{getEmoji(value)}</span>}
            <span className={`text-lg font-bold ${isCorrect ? 'text-emerald-700' : isWrong ? 'text-red-600' : 'text-cyan-700'}`}>
              {value}{unit}
            </span>
            {isCorrect && <span className="text-sm text-emerald-600 font-medium">Correct!</span>}
            {isWrong && <span className="text-sm text-red-600 font-medium">Not quite — answer is {answer}{unit}</span>}
          </div>

          {answer !== undefined && !checked && (
            <button
              onClick={() => setChecked(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
            >
              <Check size={12} /> Check
            </button>
          )}
        </div>
      )}

      {value === null && (
        <p className="text-xs text-cyan-400 text-center">Drag the slider or tap the track</p>
      )}
    </div>
  )
}
