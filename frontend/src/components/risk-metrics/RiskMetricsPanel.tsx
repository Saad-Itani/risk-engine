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
    <div className="space-y-3">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-lg font-bold text-bloomberg mono">RISK METRICS</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Calculate Value at Risk (VaR) or Expected Shortfall (ES)
        </p>
      </div>

      {/* Side-by-side layout: Configuration + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Configuration - 1/3 width */}
        <GlassCard className="lg:col-span-1">
          <h3 className="text-sm font-semibold mb-3 text-terminal-cyan mono">CONFIG</h3>

          <div className="space-y-3">
            {/* Metric Selection */}
            <div className="space-y-1">
              <Label htmlFor="metric" className="text-xs uppercase">Metric</Label>
              <Select
                id="metric"
                value={metric}
                onChange={(e) => setMetric(e.target.value as Metric)}
                className="h-8 text-sm"
              >
                <option value="var">VaR</option>
                <option value="es">ES (CVaR)</option>
              </Select>
            </div>

            {/* Method Selection */}
            <div className="space-y-1">
              <Label htmlFor="method" className="text-xs uppercase">Method</Label>
              <Select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className="h-8 text-sm"
              >
                {VAR_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Confidence Level */}
            <div className="space-y-1">
              <Label className="text-xs uppercase">Confidence: <span className="text-terminal-cyan mono">{formatPercentage(confidence)}</span></Label>
              <Slider
                min={0.90}
                max={0.99}
                step={0.01}
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
              />
            </div>

            {/* Horizon Days */}
            <div className="space-y-1">
              <Label htmlFor="horizon" className="text-xs uppercase">Horizon (days)</Label>
              <Input
                id="horizon"
                type="number"
                min={1}
                value={horizonDays}
                onChange={(e) => setHorizonDays(parseInt(e.target.value))}
                className="h-8 text-sm mono"
              />
            </div>

            {/* Lookback Days */}
            <div className="space-y-1">
              <Label htmlFor="lookback" className="text-xs uppercase">Lookback (days)</Label>
              <Input
                id="lookback"
                type="number"
                min={100}
                value={lookbackDays}
                onChange={(e) => setLookbackDays(parseInt(e.target.value))}
                className="h-8 text-sm mono"
              />
            </div>
          </div>

          {/* Monte Carlo Options */}
          {method === 'monte_carlo' && (
            <div className="pt-3 mt-3 border-t border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Monte Carlo</h4>

              <div className="space-y-1">
                <Label htmlFor="mcMode" className="text-xs uppercase">Distribution</Label>
                <Select
                  id="mcMode"
                  value={mcMode}
                  onChange={(e) => setMcMode(e.target.value as typeof mcMode)}
                  className="h-8 text-sm"
                >
                  {MC_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="simulations" className="text-xs uppercase">Simulations</Label>
                <Input
                  id="simulations"
                  type="number"
                  min={10000}
                  step={10000}
                  value={simulations}
                  onChange={(e) => setSimulations(parseInt(e.target.value))}
                  className="h-8 text-sm mono"
                />
              </div>

              {mcMode === 'student_t' && (
                <div className="space-y-1">
                  <Label htmlFor="dfT" className="text-xs uppercase">Degrees Freedom</Label>
                  <Input
                    id="dfT"
                    type="number"
                    min={3}
                    value={dfT}
                    onChange={(e) => setDfT(parseInt(e.target.value))}
                    className="h-8 text-sm mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Compute Button */}
          <div className="mt-4">
            <Button
              onClick={handleCompute}
              disabled={isLoading}
              className="w-full h-9 text-xs font-bold"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Calculator className="w-3 h-3 mr-2" />
                  COMPUTE {metric.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </GlassCard>

        {/* Results - 2/3 width */}
        <div className="lg:col-span-2">
          {error && (
            <GlassCard>
              <ErrorDisplay error={error} onRetry={handleCompute} />
            </GlassCard>
          )}

          {data && <ResultsDisplay data={data} metric={metric} />}

          {!data && !error && (
            <GlassCard>
              <EmptyState
                icon={<Calculator size={32} className="text-muted-foreground" />}
                title="No Results Yet"
                description="Configure parameters and click Compute to calculate risk metrics"
              />
            </GlassCard>
          )}
        </div>
      </div>
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
  // Safety check
  if (!data) {
    return (
      <GlassCard>
        <ErrorDisplay error={new Error('No data received')} />
      </GlassCard>
    )
  }

  const esData = ('es_dollars' in data && 'es_log_return' in data) ? (data as ESResponse) : null

  // Debug log
  console.log('ResultsDisplay - metric:', metric, 'data:', data, 'esData:', esData)

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold mb-3 text-terminal-cyan mono">RESULTS</h3>

      {/* Summary Info */}
      <div className="mb-4 text-xs text-muted-foreground mono">
        <p>
          {data?.method || 'N/A'} • {data?.confidence ? formatPercentage(data.confidence) : 'N/A'} • {data?.horizon_days || 'N/A'}d
        </p>
        <p>
          {data?.as_of ? formatDate(data.as_of) : 'N/A'} • DB: {data?.db_as_of ? formatDate(data.db_as_of) : 'N/A'}
        </p>
      </div>

      {/* What does this mean? */}
      {data.confidence != null && data.horizon_days != null && data.var_dollars != null && data.var_log_return != null && (
        <div className="mb-4 bg-primary/10 border border-primary/30 rounded p-3">
          <h4 className="text-xs font-bold text-primary mb-2 uppercase">
            INFO
          </h4>
          <div className="text-xs space-y-2">
            {metric === 'var' ? (
              <p className="text-foreground/90">
                With <span className="mono">{formatPercentage(data.confidence)}</span> confidence, the portfolio's loss over{' '}
                <span className="mono">{data.horizon_days} days</span> will not exceed{' '}
                <span className="font-bold text-red-500 mono">{formatCurrency(data.var_dollars)}</span>{' '}
                (<span className="mono">{formatPercentage(data.var_log_return)}</span>).
              </p>
            ) : (
              esData && esData.es_dollars != null && esData.es_log_return != null && (
                <p className="text-foreground/90">
                  At the <span className="mono">{formatPercentage(data.confidence)}</span> level, the average loss in the worst{' '}
                  <span className="mono">{formatPercentage(1 - data.confidence)}</span> of{' '}
                  <span className="mono">{data.horizon_days}-day</span> outcomes is{' '}
                  <span className="font-bold text-red-500 mono">{formatCurrency(esData.es_dollars)}</span>{' '}
                  (<span className="mono">{formatPercentage(esData.es_log_return)}</span>).
                </p>
              )
            )}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard
          label="Portfolio"
          value={formatCurrency(data.portfolio_value)}
        />
        <MetricCard
          label="VaR $"
          value={formatCurrency(data.var_dollars)}
          trend="down"
        />
        <MetricCard
          label="VaR %"
          value={formatPercentage(data.var_log_return)}
          trend="down"
        />
        {esData && (
          <MetricCard
            label="ES $"
            value={formatCurrency(esData.es_dollars)}
            trend="down"
          />
        )}
      </div>

      {/* Holdings Breakdown */}
      <div>
        <h4 className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Holdings</h4>
        <div className="border border-border rounded overflow-hidden">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th className="text-right">SHARES</th>
                <th
                  className="text-right"
                  title="Position value as percentage of total portfolio value"
                  style={{ cursor: 'help' }}
                >
                  PORTFOLIO WEIGHT
                </th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((holding) => (
                <tr key={holding.symbol}>
                  <td className="font-bold text-terminal-cyan mono">{holding.symbol}</td>
                  <td className="text-right data-cell">
                    {holding.shares.toLocaleString()}
                  </td>
                  <td className="text-right data-cell">
                    {holding.weight != null ? formatPercentage(holding.weight) : 'N/A'}
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
