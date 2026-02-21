import { Flame, Zap } from 'lucide-react'

interface StatBadgeProps {
  value: number
  icon: 'flame' | 'bolt'
  color: 'orange' | 'yellow'
}

export default function StatBadge({ value, icon, color }: StatBadgeProps) {
  const Icon = icon === 'flame' ? Flame : Zap
  const colorClass = color === 'orange' ? 'text-bloom-orange' : 'text-bloom-yellow'
  
  return (
    <div className="stat-badge">
      <span className="font-semibold text-bloom-text">{value}</span>
      <Icon size={16} className={colorClass} fill="currentColor" />
    </div>
  )
}
