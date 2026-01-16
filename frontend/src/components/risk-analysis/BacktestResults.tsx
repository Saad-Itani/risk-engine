import { CheckCircle, XCircle, Info } from 'lucide-react'
import { formatPercentage, formatCurrency, formatDate, cn } from '../../lib/utils'
import type { BacktestSummary } from '../../api/types'

interface BacktestResultsProps {
  backtest: BacktestSummary
}

/**
 * Display backtesting validation results
 */
export function BacktestResults({ backtest }: BacktestResultsProps) {
  const isWellCalibrated = backtest.kupiec_p_value > 0.05
  const breachRateDiff = Math.abs(backtest.breach_rate - backtest.expected_rate)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Backtesting Validation</h3>
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold',
            isWellCalibrated
              ? 'bg-green-500/20 text-green-700 dark:text-green-400'
              : 'bg-red-500/20 text-red-700 dark:text-red-400'
          )}
        >
          {isWellCalibrated ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Model Well-Calibrated</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              <span>Model May Need Adjustment</span>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="backdrop-blur-md bg-accent/10 border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Tests Run</div>
          <div className="text-2xl font-bold">{backtest.n_tests}</div>
        </div>

        <div className="backdrop-blur-md bg-accent/10 border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Breaches</div>
          <div className="text-2xl font-bold">{backtest.n_breaches}</div>
        </div>

        <div className="backdrop-blur-md bg-accent/10 border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Breach Rate</div>
          <div className="text-2xl font-bold">{formatPercentage(backtest.breach_rate)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Expected: {formatPercentage(backtest.expected_rate)}
          </div>
        </div>

        <div className="backdrop-blur-md bg-accent/10 border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Kupiec p-value</div>
          <div
            className={cn(
              'text-2xl font-bold',
              backtest.kupiec_p_value > 0.05 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
            )}
          >
            {backtest.kupiec_p_value.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {backtest.kupiec_p_value > 0.05 ? 'Pass (>0.05)' : 'Fail (<0.05)'}
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="backdrop-blur-md bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">
              Interpretation
            </h4>
            <p className="text-sm text-foreground/80">
              {backtest.interpretation || (isWellCalibrated
                ? 'The model is well-calibrated. The breach rate is statistically consistent with the expected rate, suggesting the VaR model is accurately capturing risk.'
                : 'The model may need adjustment. The breach rate differs significantly from the expected rate, suggesting the VaR model may be over or under-estimating risk.')}
            </p>
            {breachRateDiff > 0.02 && (
              <p className="text-sm text-foreground/80 mt-2">
                {backtest.breach_rate > backtest.expected_rate
                  ? '⚠️ The model is under-estimating risk (too many breaches).'
                  : 'ℹ️ The model is over-estimating risk (too few breaches).'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Method Info */}
      <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <span className="font-semibold">Metric:</span> {backtest.metric.toUpperCase()}
        </div>
        <div>
          <span className="font-semibold">Method:</span> {backtest.method}
        </div>
        <div>
          <span className="font-semibold">Confidence:</span> {formatPercentage(backtest.confidence)}
        </div>
        <div>
          <span className="font-semibold">Horizon:</span> {backtest.horizon_days} days
        </div>
      </div>
    </div>
  )
}
