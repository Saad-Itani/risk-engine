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
 * Bloomberg Terminal style - monospace for data values
 */
export function MetricCard({ label, value, subtitle, icon, trend, className }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  }

  return (
    <div
      className={cn(
        'terminal-card p-3',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{label}</p>
          <p className={cn('text-xl font-bold mono', trend && trendColors[trend])}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-muted-foreground ml-2">{icon}</div>}
      </div>
    </div>
  )
}
