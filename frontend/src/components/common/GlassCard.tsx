import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

/**
 * Glassmorphic card component
 * Core visual element used throughout the application
 */
export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'backdrop-blur-md bg-glass-gradient border border-white/10',
        'rounded-xl shadow-2xl p-6',
        'transition-all duration-300',
        hover && 'hover:border-white/20 hover:shadow-3xl',
        className
      )}
    >
      {children}
    </div>
  )
}
