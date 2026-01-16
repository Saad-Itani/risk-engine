import { useState } from 'react'
import { Calculator, TrendingDown } from 'lucide-react'
import { GlassCard } from '../common/GlassCard'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Slider } from '../ui/slider'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorDisplay } from '../common/ErrorDisplay'
import { EmptyState } from '../common/EmptyState'
import { MetricCard } from '../common/MetricCard'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useComputeVaR } from '../../api/hooks/useComputeVaR'
import { useComputeES } from '../../api/hooks/useComputeES'
import { VAR_METHODS, MC_MODES, DEFAULT_PARAMS } from '../../lib/constants'
import { formatCurrency, formatPercentage, formatDate } from '../../lib/utils'
import type { VaRResponse, ESResponse } from '../../api/types'

type Metric = 'var' | 'es'
type Method = 'historical' | 'parametric' | 'monte_carlo'

/**
 * Risk Metrics Panel - Calculate VaR and ES
 */
export function RiskMetricsPanel() {
  const holdings = usePortfolioStore((state) => state.getHoldingsArray())
  const hasHoldings = usePortfolioStore((state) => state.hasHoldings())

  // Form state
  const [metric, setMetric] = useState<Metric>('var')
  const [method, setMethod] = useState<Method>('historical')
  const [confidence, setConfidence] = useState(DEFAULT_PARAMS.confidence)
  const [horizonDays, setHorizonDays] = useState(DEFAULT_PARAMS.horizon_days)
  const [lookbackDays, setLookbackDays] = useState(DEFAULT_PARAMS.lookback_days)
  const [mcMode, setMcMode] = useState<'bootstrap' | 'normal' | 'student_t'>('bootstrap')
  const [simulations, setSimulations] = useState(DEFAULT_PARAMS.simulations)
  const [dfT, setDfT] = useState(DEFAULT_PARAMS.df_t)

  // API hooks
  const varMutation = useComputeVaR()
  const esMutation = useComputeES()

  const isLoading = varMutation.isPending || esMutation.isPending
  const error = varMutation.error || esMutation.error
  const data = metric === 'var' ? varMutation.data : esMutation.data

  const handleCompute = () => {
    const baseParams = {
      holdings,
      method,
      confidence,
      horizon_days: horizonDays,
      lookback_days: lookbackDays,
      ...(method === 'monte_carlo' && {
        mc_mode: mcMode,
        simulations,
        df_t: dfT,
      }),
    }

    if (metric === 'var') {
      varMutation.mutate(baseParams)
    } else {
      esMutation.mutate(baseParams)
    }
  }

  if (!hasHoldings) {
    return (
      <GlassCard>
        <EmptyState
          icon={<TrendingDown size={48} className="text-muted-foreground" />}
          title="No Portfolio Holdings"
          description="Add some holdings in the Portfolio Builder tab first to calculate risk metrics."
        />
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold mb-2">Risk Metrics</h2>
        <p className="text-muted-foreground">
          Calculate Value at Risk (VaR) or Expected Shortfall (ES) for your portfolio.
        </p>
      </div>

      {/* Configuration */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metric Selection */}
          <div className="space-y-2">
            <Label htmlFor="metric">Risk Metric</Label>
            <Select
              id="metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              <option value="var">Value at Risk (VaR)</option>
              <option value="es">Expected Shortfall (ES / CVaR)</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              {metric === 'var'
                ? 'Maximum potential loss at a given confidence level'
                : 'Average loss beyond VaR threshold'}
            </p>
          </div>

          {/* Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="method">Calculation Method</Label>
            <Select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              {VAR_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Confidence Level */}
          <div className="space-y-2">
            <Label>Confidence Level: {formatPercentage(confidence)}</Label>
            <Slider
              min={0.90}
              max={0.99}
              step={0.01}
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
            />
          </div>

          {/* Horizon Days */}
          <div className="space-y-2">
            <Label htmlFor="horizon">Time Horizon (days)</Label>
            <Input
              id="horizon"
              type="number"
              min={1}
              value={horizonDays}
              onChange={(e) => setHorizonDays(parseInt(e.target.value))}
            />
          </div>

          {/* Lookback Days */}
          <div className="space-y-2">
            <Label htmlFor="lookback">Historical Lookback (days)</Label>
            <Input
              id="lookback"
              type="number"
              min={100}
              value={lookbackDays}
              onChange={(e) => setLookbackDays(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Monte Carlo Options */}
        {method === 'monte_carlo' && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-semibold mb-4">Monte Carlo Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mcMode">Distribution</Label>
                <Select
                  id="mcMode"
                  value={mcMode}
                  onChange={(e) => setMcMode(e.target.value as typeof mcMode)}
                >
                  {MC_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="simulations">Simulations</Label>
                <Input
                  id="simulations"
                  type="number"
                  min={10000}
                  step={10000}
                  value={simulations}
                  onChange={(e) => setSimulations(parseInt(e.target.value))}
                />
              </div>

              {mcMode === 'student_t' && (
                <div className="space-y-2">
                  <Label htmlFor="dfT">Degrees of Freedom</Label>
                  <Input
                    id="dfT"
                    type="number"
                    min={3}
                    value={dfT}
                    onChange={(e) => setDfT(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compute Button */}
        <div className="mt-6">
          <Button
            onClick={handleCompute}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Compute {metric.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <ErrorDisplay error={error} onRetry={handleCompute} />
      )}

      {/* Results */}
      {data && <ResultsDisplay data={data} metric={metric} />}
    </div>
  )
}

function ResultsDisplay({
  data,
  metric,
}: {
  data: VaRResponse | ESResponse
  metric: 'var' | 'es'
}) {
  const esData = 'es_dollars' in data ? data : null

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold mb-4">Results</h3>

      {/* Summary Info */}
      <div className="mb-6 text-sm text-muted-foreground">
        <p>
          Method: <span className="font-medium text-foreground">{data.method}</span> •
          Confidence: <span className="font-medium text-foreground">{formatPercentage(data.confidence)}</span> •
          Horizon: <span className="font-medium text-foreground">{data.horizon_days} days</span>
        </p>
        <p>
          As of: <span className="font-medium text-foreground">{formatDate(data.as_of)}</span> •
          Data as of: <span className="font-medium text-foreground">{formatDate(data.db_as_of)}</span>
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Portfolio Value"
          value={formatCurrency(data.portfolio_value)}
        />
        <MetricCard
          label="VaR (Dollars)"
          value={formatCurrency(data.var_dollars)}
          trend="down"
        />
        <MetricCard
          label="VaR (Log Return)"
          value={formatPercentage(data.var_log_return)}
          trend="down"
        />
        {esData && (
          <>
            <MetricCard
              label="ES (Dollars)"
              value={formatCurrency(esData.es_dollars)}
              trend="down"
            />
          </>
        )}
      </div>

      {/* Holdings Breakdown */}
      <div>
        <h4 className="font-semibold mb-3">Holdings Breakdown</h4>
        <div className="backdrop-blur-md bg-accent/10 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/20">
                <th className="text-left px-4 py-2 font-semibold text-sm">Symbol</th>
                <th className="text-right px-4 py-2 font-semibold text-sm">Shares</th>
                <th className="text-right px-4 py-2 font-semibold text-sm">Weight</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((holding) => (
                <tr key={holding.symbol} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{holding.symbol}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {holding.shares.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {formatPercentage(holding.weight)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GlassCard>
  )
}
