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
        'rounded-xl border-2 p-6 backdrop-blur-md animate-fade-in',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start gap-4">
        <Icon className={cn('w-12 h-12 flex-shrink-0', colors.icon)} />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className={cn('text-2xl font-bold', colors.text)}>
              Risk Level: {risk.level}
            </h3>
          </div>
          <p className="text-sm text-foreground/80 mb-4">
            {risk.level === 'LOW' &&
              'Your portfolio risk is within acceptable limits. The potential loss is relatively small.'}
            {risk.level === 'MODERATE' &&
              'Your portfolio has moderate risk. Consider diversification to reduce exposure.'}
            {risk.level === 'HIGH' &&
              'Your portfolio carries high risk. Review your positions and consider risk reduction.'}
            {risk.level === 'SEVERE' &&
              'Your portfolio has severe risk exposure. Immediate action recommended to reduce risk.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">VaR: </span>
              <span className="font-semibold">{formatPercentage(varPct)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max Weight: </span>
              <span className="font-semibold">
                {formatPercentage(maxWeight)} ({maxWeightSymbol})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Effective N: </span>
              <span className="font-semibold">{effectiveN.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
