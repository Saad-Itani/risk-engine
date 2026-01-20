import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useRiskAnalysis } from '../../api/hooks/useRiskAnalysis'
import { GlassCard } from '../common/GlassCard'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Checkbox } from '../ui/Checkbox'
import { Slider } from '../ui/Slider'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorDisplay } from '../common/ErrorDisplay'
import { EmptyState } from '../common/EmptyState'
import { RiskAssessmentBadge } from './RiskAssessmentBadge'
import { RiskFactsDisplay } from './RiskFactsDisplay'
import { ComponentVaRChart } from './ComponentVaRChart'
import { ComponentVaRTable } from './ComponentVaRTable'
import { BacktestResults } from './BacktestResults'

/**
 * Comprehensive risk analysis panel with VaR decomposition, backtesting, and LLM recommendations
 */
export function RiskAnalysisPanel() {
  const { getHoldingsArray, hasHoldings } = usePortfolioStore()
  const { mutate: analyzeRisk, data, isLoading, error, reset } = useRiskAnalysis()

  // Configuration state
  const [confidence, setConfidence] = useState(0.95)
  const [horizonDays, setHorizonDays] = useState(5)
  const [lookbackDays, setLookbackDays] = useState(252)
  const [includeBacktest, setIncludeBacktest] = useState(true)

  const handleAnalyze = () => {
    const holdings = getHoldingsArray()
    analyzeRisk({
      holdings,
      confidence,
      horizon_days: horizonDays,
      lookback_days: lookbackDays,
      include_backtest: includeBacktest,
      include_es: true, // Always include ES - it's a superior risk metric
      include_llm_recommendations: false, // Disabled - Coming Soon
    })
  }

  const handleRetry = () => {
    reset()
    handleAnalyze()
  }

  if (!hasHoldings()) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-12 h-12" />}
        title="No Portfolio Holdings"
        description="Add some holdings to your portfolio to run risk analysis."
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-lg font-bold text-bloomberg mono">RISK ANALYSIS</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Comprehensive portfolio risk analysis with VaR decomposition
        </p>
      </div>

      {/* Configuration Panel */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-3 text-terminal-cyan mono">CONFIGURATION</h3>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Confidence Level */}
          <div className="space-y-1">
            <Label htmlFor="confidence" className="text-xs uppercase">
              Confidence: <span className="text-terminal-cyan mono">{(confidence * 100).toFixed(0)}%</span>
            </Label>
            <Slider
              id="confidence"
              min={0.9}
              max={0.99}
              step={0.01}
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mono">90%, 95%, 99%</p>
          </div>

          {/* Horizon Days */}
          <div className="space-y-1">
            <Label htmlFor="horizon" className="text-xs uppercase">Horizon (Days)</Label>
            <Input
              id="horizon"
              type="number"
              min={1}
              max={30}
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="h-8 text-sm mono"
            />
            <p className="text-xs text-muted-foreground">Forecast period (1-30 days)</p>
          </div>

          {/* Lookback Days */}
          <div className="space-y-1">
            <Label htmlFor="lookback" className="text-xs uppercase">Lookback Period (Days)</Label>
            <Input
              id="lookback"
              type="number"
              min={30}
              max={1000}
              step={10}
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              className="h-8 text-sm mono"
            />
            <p className="text-xs text-muted-foreground">Historical data window</p>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="backtest"
              checked={includeBacktest}
              onChange={(checked) => setIncludeBacktest(checked)}
            />
            <Label htmlFor="backtest" className="cursor-pointer text-sm">
              Include Backtesting Validation (Kupiec Test)
            </Label>
          </div>

          <div className="flex items-center gap-2 opacity-50">
            <Checkbox
              id="llm"
              checked={false}
              onChange={() => {}}
              disabled
            />
            <Label htmlFor="llm" className="cursor-not-allowed">
              Include AI-Powered Recommendations
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                Coming Soon
              </span>
            </Label>
          </div>
        </div>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full h-9 text-xs font-bold"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              ANALYZING...
            </>
          ) : (
            'ANALYZE RISK'
          )}
        </Button>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <GlassCard>
          <ErrorDisplay
            title="Risk Analysis Failed"
            message={error.message}
            onRetry={handleRetry}
          />
        </GlassCard>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-3">
          {/* Risk Assessment Badge */}
          <RiskAssessmentBadge
            varPct={data.risk_facts.var_pct}
            maxWeight={data.risk_facts.max_single_weight}
            maxWeightSymbol={data.risk_facts.max_single_weight_symbol}
            effectiveN={data.risk_facts.effective_n}
          />

          {/* Risk Facts */}
          <GlassCard>
            <h3 className="text-sm font-semibold mb-3 text-terminal-cyan mono">RISK METRICS SUMMARY</h3>
            <RiskFactsDisplay
              riskFacts={data.risk_facts}
              portfolioValue={data.portfolio_value}
            />
          </GlassCard>

          {/* Component VaR Analysis - Combined */}
          <GlassCard>
            <h3 className="text-sm font-semibold mb-3 text-terminal-cyan mono">COMPONENT VAR ANALYSIS</h3>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Chart - 2/5 width */}
              <div className="lg:col-span-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Risk contribution by position
                </p>
                <ComponentVaRChart components={data.components} />
              </div>

              {/* Table - 3/5 width */}
              <div className="lg:col-span-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Detailed breakdown
                </p>
                <ComponentVaRTable components={data.components} />
              </div>
            </div>
          </GlassCard>

          {/* LLM Recommendations - Coming Soon */}
          <div className="terminal-card p-4 bg-primary/5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">🤖</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-primary mono uppercase">
                  AI-Powered Recommendations
                </h3>
                <span className="inline-block mt-1 px-3 py-1 text-xs font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Get personalized portfolio recommendations powered by advanced AI analysis. This feature
              will provide actionable insights on diversification, risk reduction strategies, and
              position sizing based on your portfolio's unique risk profile.
            </p>
          </div>

          {/* Backtesting Results */}
          {includeBacktest && data.backtest && (
            <GlassCard>
              <BacktestResults backtest={data.backtest} />
            </GlassCard>
          )}

          {/* Metadata Footer */}
          <div className="text-xs text-muted-foreground text-center mono">
            Analysis as of {new Date(data.as_of).toLocaleString()} | Method: {data.method} |
            Confidence: {(data.confidence * 100).toFixed(0)}% | Horizon: {data.horizon_days}d |
            Data as of: {new Date(data.db_as_of).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
