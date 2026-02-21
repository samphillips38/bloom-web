import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export default function Card({ children, className, onClick, hover = false }: CardProps) {
  return (
    <div 
      className={clsx(
        'card',
        hover && 'cursor-pointer hover:shadow-bloom-lg transition-shadow duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
