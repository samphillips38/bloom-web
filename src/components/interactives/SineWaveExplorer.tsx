import { useState, useRef, useEffect } from 'react'

interface SineWaveExplorerProps {
  title?: string
  showAmplitude?: boolean
  showFrequency?: boolean
  showPhase?: boolean
}

export default function SineWaveExplorer({
  title = 'Sine Wave Explorer',
  showAmplitude = true,
  showFrequency = true,
  showPhase = true,
}: SineWaveExplorerProps) {
  const [amplitude, setAmplitude] = useState(1)
  const [frequency, setFrequency] = useState(1)
  const [phase, setPhase] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    // Background
    ctx.clearRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1

    // Horizontal center line
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()

    // Faint gridlines
    for (let y = 0; y < h; y += h / 6) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.strokeStyle = '#f1f5f9'
      ctx.stroke()
    }
    for (let x = 0; x < w; x += w / 8) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.strokeStyle = '#f1f5f9'
      ctx.stroke()
    }

    // Draw sine wave
    ctx.beginPath()
    ctx.strokeStyle = '#FF6B35'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const padding = 20
    const drawW = w - padding * 2
    const drawH = (h - padding * 2) / 2
    const centerY = h / 2

    for (let px = 0; px <= drawW; px++) {
      const x = (px / drawW) * Math.PI * 4 // 2 full cycles
      const y = amplitude * Math.sin(frequency * x + phase)
      const canvasX = padding + px
      const canvasY = centerY - y * drawH * 0.8

      if (px === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    }
    ctx.stroke()

    // Glow effect
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.2)'
    ctx.lineWidth = 8
    ctx.beginPath()
    for (let px = 0; px <= drawW; px++) {
      const x = (px / drawW) * Math.PI * 4
      const y = amplitude * Math.sin(frequency * x + phase)
      const canvasX = padding + px
      const canvasY = centerY - y * drawH * 0.8

      if (px === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    }
    ctx.stroke()

    // Labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'right'
    ctx.fillText(`${amplitude.toFixed(1)}`, padding - 4, centerY - drawH * 0.8 + 4)
    ctx.fillText(`-${amplitude.toFixed(1)}`, padding - 4, centerY + drawH * 0.8 + 4)
    ctx.fillText('0', padding - 4, centerY + 4)

  }, [amplitude, frequency, phase])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-bloom-orange/10 to-bloom-yellow/10 border-b border-slate-100">
        <h3 className="font-bold text-bloom-text text-sm">{title}</h3>
        <p className="text-xs text-bloom-text-secondary mt-0.5">Drag the sliders to see how parameters change the wave</p>
      </div>

      {/* Canvas */}
      <div className="px-4 pt-4">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl bg-slate-50 border border-slate-100"
          style={{ height: '180px' }}
        />
      </div>

      {/* Equation display */}
      <div className="px-5 py-2 text-center">
        <code className="text-sm text-bloom-text-secondary font-mono">
          y = <span className="text-bloom-orange font-bold">{amplitude.toFixed(1)}</span>
          {' · sin('}
          <span className="text-bloom-blue font-bold">{frequency.toFixed(1)}</span>
          {'x + '}
          <span className="text-bloom-purple font-bold">{phase.toFixed(1)}</span>
          {')'}
        </code>
      </div>

      {/* Sliders */}
      <div className="px-5 pb-5 space-y-4">
        {showAmplitude && (
          <SliderControl
            label="Amplitude"
            value={amplitude}
            min={0.1}
            max={2}
            step={0.1}
            color="bg-bloom-orange"
            onChange={setAmplitude}
          />
        )}
        {showFrequency && (
          <SliderControl
            label="Frequency"
            value={frequency}
            min={0.5}
            max={4}
            step={0.1}
            color="bg-bloom-blue"
            onChange={setFrequency}
          />
        )}
        {showPhase && (
          <SliderControl
            label="Phase"
            value={phase}
            min={0}
            max={Math.PI * 2}
            step={0.1}
            color="bg-bloom-purple"
            onChange={setPhase}
          />
        )}
      </div>
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  color,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  color: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-bloom-text">{label}</span>
        <span className="text-sm text-bloom-text-secondary font-mono tabular-nums">{value.toFixed(1)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="interactive-slider w-full"
          style={{
            '--slider-pct': `${pct}%`,
            '--slider-color': color === 'bg-bloom-orange' ? '#FF6B35' :
                              color === 'bg-bloom-blue' ? '#4A90D9' :
                              color === 'bg-bloom-purple' ? '#9B59B6' : '#FF6B35',
          } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
