interface LevelBadgeProps {
  level: number
  title: string
  color: string
}

export default function LevelBadge({ level, title, color }: LevelBadgeProps) {
  return (
    <div 
      className="inline-flex flex-col items-center px-6 py-3 rounded-2xl border-2 bg-white"
      style={{ borderColor: color }}
    >
      <span className="text-xs font-bold tracking-wider" style={{ color }}>
        LEVEL {level}
      </span>
      <span className="text-lg font-semibold text-bloom-text">{title}</span>
    </div>
  )
}
