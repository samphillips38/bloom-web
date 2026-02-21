import { clsx } from 'clsx'

interface ProgressBarProps {
  progress: number // 0 to 1
  color?: 'green' | 'orange' | 'blue'
  size?: 'sm' | 'md'
  showLabel?: boolean
  animated?: boolean
}

export default function ProgressBar({ 
  progress, 
  color = 'green', 
  size = 'md',
  showLabel = false,
  animated = false
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1)
  
  const colorClass = {
    green: 'bg-bloom-green',
    orange: 'bg-bloom-orange',
    blue: 'bg-bloom-blue',
  }
  
  const gradientClass = {
    green: 'bg-gradient-to-r from-bloom-green to-emerald-400',
    orange: 'bg-gradient-to-r from-bloom-orange to-amber-400',
    blue: 'bg-gradient-to-r from-bloom-blue to-cyan-400',
  }
  
  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
  }
  
  return (
    <div className="flex items-center gap-3 w-full">
      <div className={clsx('flex-1 bg-gray-200 rounded-full overflow-hidden', heightClass[size])}>
        <div 
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out relative',
            animated ? gradientClass[color] : colorClass[color]
          )}
          style={{ width: `${clampedProgress * 100}%` }}
        >
          {animated && (
            <div className="absolute inset-0 animate-shimmer" />
          )}
        </div>
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-bloom-text-secondary">
          {Math.round(clampedProgress * 100)}%
        </span>
      )}
    </div>
  )
}
