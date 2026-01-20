import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

/**
 * Terminal-style card component (Bloomberg Terminal aesthetic)
 * Core visual element used throughout the application
 */
export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'terminal-card p-4',
        hover && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
