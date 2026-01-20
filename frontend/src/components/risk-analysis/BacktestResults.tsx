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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-terminal-cyan mono uppercase">Backtesting Validation</h3>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1 terminal-card border-2 font-bold text-xs mono',
            isWellCalibrated
              ? 'border-green-500/50 text-green-500'
              : 'border-red-500/50 text-red-500'
          )}
        >
          {isWellCalibrated ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>WELL-CALIBRATED</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              <span>NEEDS ADJUSTMENT</span>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="terminal-card p-3">
          <div className="text-xs text-muted-foreground mb-1 uppercase">Tests Run</div>
          <div className="text-xl font-bold mono">{backtest.n_tests}</div>
        </div>

        <div className="terminal-card p-3">
          <div className="text-xs text-muted-foreground mb-1 uppercase">Breaches</div>
          <div className="text-xl font-bold mono">{backtest.n_breaches}</div>
        </div>

        <div className="terminal-card p-3">
          <div className="text-xs text-muted-foreground mb-1 uppercase">Breach Rate</div>
          <div className="text-xl font-bold mono">{formatPercentage(backtest.breach_rate)}</div>
          <div className="text-xs text-muted-foreground mt-1 mono">
            Expected: {formatPercentage(backtest.expected_rate)}
          </div>
        </div>

        <div className="terminal-card p-3">
          <div className="text-xs text-muted-foreground mb-1 uppercase">Kupiec P-Value</div>
          <div
            className={cn(
              'text-xl font-bold mono',
              backtest.kupiec_p_value > 0.05 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {backtest.kupiec_p_value.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground mt-1 mono">
            {backtest.kupiec_p_value > 0.05 ? 'Pass (>0.05)' : 'Fail (<0.05)'}
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="terminal-card bg-primary/10 border-primary/30 p-3">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-primary mb-1 text-xs uppercase">
              Interpretation
            </h4>
            <p className="text-xs text-foreground/80">
              {backtest.interpretation || (isWellCalibrated
                ? 'The model is well-calibrated. The breach rate is statistically consistent with the expected rate, suggesting the VaR model is accurately capturing risk.'
                : 'The model may need adjustment. The breach rate differs significantly from the expected rate, suggesting the VaR model may be over or under-estimating risk.')}
            </p>
            {breachRateDiff > 0.02 && (
              <p className="text-xs text-foreground/80 mt-2">
                {backtest.breach_rate > backtest.expected_rate
                  ? '⚠️ The model is under-estimating risk (too many breaches).'
                  : 'ℹ️ The model is over-estimating risk (too few breaches).'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Method Info */}
      <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2 mono">
        <div>
          <span className="font-semibold uppercase">Metric:</span> {backtest.metric.toUpperCase()}
        </div>
        <div>
          <span className="font-semibold uppercase">Method:</span> {backtest.method}
        </div>
        <div>
          <span className="font-semibold uppercase">Confidence:</span> {formatPercentage(backtest.confidence)}
        </div>
        <div>
          <span className="font-semibold uppercase">Horizon:</span> {backtest.horizon_days}d
        </div>
      </div>
    </div>
  )
}
