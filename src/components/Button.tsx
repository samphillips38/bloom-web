import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  color?: 'orange' | 'yellow' | 'dark' | 'green'
  isLoading?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  color = 'orange',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const colorStyles = {
    orange: 'bg-bloom-orange hover:bg-bloom-orange/90',
    yellow: 'bg-bloom-yellow hover:bg-bloom-yellow/90',
    dark: 'bg-bloom-text hover:bg-bloom-text/90',
    green: 'bg-bloom-green hover:bg-bloom-green/90',
  }
  
  const secondaryStyles = {
    orange: 'border-bloom-orange text-bloom-orange hover:bg-bloom-orange/5',
    yellow: 'border-bloom-yellow text-bloom-yellow hover:bg-bloom-yellow/5',
    dark: 'border-bloom-text text-bloom-text hover:bg-bloom-text/5',
    green: 'border-bloom-green text-bloom-green hover:bg-bloom-green/5',
  }
  
  return (
    <button
      className={clsx(
        variant === 'primary' ? 'btn-primary' : 'btn-secondary',
        variant === 'primary' ? colorStyles[color] : secondaryStyles[color],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
