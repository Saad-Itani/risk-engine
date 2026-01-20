import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { formatPercentage } from '../../lib/utils'

interface RiskAssessmentBadgeProps {
  varPct: number
  maxWeight: number
  maxWeightSymbol: string
  effectiveN: number
}

/**
 * Large risk level indicator badge
 * Shows risk level based on VaR percentage
 */
export function RiskAssessmentBadge({
  varPct,
  maxWeight,
  maxWeightSymbol,
  effectiveN,
}: RiskAssessmentBadgeProps) {
  const getRiskLevel = (var_pct: number) => {
    if (var_pct < 0.02) return { level: 'LOW', color: 'green', icon: CheckCircle }
    if (var_pct < 0.05) return { level: 'MODERATE', color: 'yellow', icon: AlertCircle }
    if (var_pct < 0.10) return { level: 'HIGH', color: 'orange', icon: AlertTriangle }
    return { level: 'SEVERE', color: 'red', icon: XCircle }
  }

  const risk = getRiskLevel(varPct)
  const Icon = risk.icon

  const colorClasses = {
    green: {
      bg: 'bg-green-500/20 dark:bg-green-500/10',
      border: 'border-green-500/50',
      text: 'text-green-700 dark:text-green-400',
      icon: 'text-green-600 dark:text-green-500',
    },
    yellow: {
      bg: 'bg-yellow-500/20 dark:bg-yellow-500/10',
      border: 'border-yellow-500/50',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: 'text-yellow-600 dark:text-yellow-500',
    },
    orange: {
      bg: 'bg-orange-500/20 dark:bg-orange-500/10',
      border: 'border-orange-500/50',
      text: 'text-orange-700 dark:text-orange-400',
      icon: 'text-orange-600 dark:text-orange-500',
    },
    red: {
      bg: 'bg-red-500/20 dark:bg-red-500/10',
      border: 'border-red-500/50',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-600 dark:text-red-500',
    },
  }

  const colors = colorClasses[risk.color]

  return (
    <div
      className={cn(
        'terminal-card p-4 border-2',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('w-8 h-8 flex-shrink-0', colors.icon)} />
        <div className="flex-1">
          <h3 className={cn('text-lg font-bold mono uppercase', colors.text)}>
            Risk Level: {risk.level}
          </h3>
          <p className="text-xs text-foreground/70 mt-1">
            {risk.level === 'LOW' && 'Portfolio risk within acceptable limits'}
            {risk.level === 'MODERATE' && 'Portfolio has moderate risk. Consider diversification to reduce exposure.'}
            {risk.level === 'HIGH' && 'Portfolio carries high risk. Review positions and consider risk reduction.'}
            {risk.level === 'SEVERE' && 'Portfolio has severe risk exposure. Immediate action recommended'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs mt-3 pt-3 border-t border-border/50">
        <div>
          <span className="text-muted-foreground">VaR: </span>
          <span className="font-bold mono">{formatPercentage(varPct)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Max Weight: </span>
          <span className="font-bold mono">
            {formatPercentage(maxWeight)} ({maxWeightSymbol})
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Effective N: </span>
          <span className="font-bold mono">{effectiveN.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
