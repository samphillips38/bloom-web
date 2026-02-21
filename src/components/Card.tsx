import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  style?: React.CSSProperties
}

export default function Card({ children, className, onClick, hover = false, style }: CardProps) {
  return (
    <div 
      className={clsx(
        'card',
        hover && 'cursor-pointer hover:shadow-bloom-lg transition-shadow duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}
