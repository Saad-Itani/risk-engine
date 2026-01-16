import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

/**
 * Card component for displaying metrics/statistics
 */
export function MetricCard({ label, value, subtitle, icon, trend, className }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  }

  return (
    <div
      className={cn(
        'backdrop-blur-md bg-glass-gradient border border-white/10',
        'rounded-lg p-4 transition-all duration-300 hover:border-white/20',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className={cn('text-2xl font-bold', trend && trendColors[trend])}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-muted-foreground ml-2">{icon}</div>}
      </div>
    </div>
  )
}
