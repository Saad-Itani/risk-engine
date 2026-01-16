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
import { LLMRecommendations } from './LLMRecommendations'
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
  const [includeES, setIncludeES] = useState(true)
  const [includeLLM, setIncludeLLM] = useState(false)
  const [llmInstructions, setLlmInstructions] = useState('')

  const handleAnalyze = () => {
    const holdings = getHoldingsArray()
    analyzeRisk({
      holdings,
      confidence,
      horizon_days: horizonDays,
      lookback_days: lookbackDays,
      include_backtest: includeBacktest,
      include_es: includeES,
      include_llm_recommendations: includeLLM,
      llm_custom_instructions: llmInstructions || undefined,
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
    <div className="space-y-6">
      {/* Configuration Panel */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4">Risk Analysis Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Confidence Level */}
          <div>
            <Label htmlFor="confidence">Confidence Level: {(confidence * 100).toFixed(0)}%</Label>
            <Slider
              id="confidence"
              min={0.9}
              max={0.99}
              step={0.01}
              value={confidence}
              onChange={(value) => setConfidence(value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Common: 90%, 95%, 99%
            </p>
          </div>

          {/* Horizon Days */}
          <div>
            <Label htmlFor="horizon">Horizon (Days)</Label>
            <Input
              id="horizon"
              type="number"
              min={1}
              max={30}
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Forecast period (1-30 days)
            </p>
          </div>

          {/* Lookback Days */}
          <div>
            <Label htmlFor="lookback">Lookback Period (Days)</Label>
            <Input
              id="lookback"
              type="number"
              min={30}
              max={1000}
              step={10}
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Historical data window
            </p>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <Checkbox
              id="backtest"
              checked={includeBacktest}
              onChange={(checked) => setIncludeBacktest(checked)}
            />
            <Label htmlFor="backtest" className="cursor-pointer">
              Include Backtesting Validation (Kupiec Test)
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="es"
              checked={includeES}
              onChange={(checked) => setIncludeES(checked)}
            />
            <Label htmlFor="es" className="cursor-pointer">
              Include Expected Shortfall (ES) Metrics
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="llm"
              checked={includeLLM}
              onChange={(checked) => setIncludeLLM(checked)}
            />
            <Label htmlFor="llm" className="cursor-pointer">
              Include AI-Powered Recommendations (Experimental)
            </Label>
          </div>
        </div>

        {/* LLM Custom Instructions */}
        {includeLLM && (
          <div className="mb-6">
            <Label htmlFor="llm-instructions">Custom Instructions for AI (Optional)</Label>
            <textarea
              id="llm-instructions"
              value={llmInstructions}
              onChange={(e) => setLlmInstructions(e.target.value)}
              placeholder="E.g., Focus on sector diversification, Consider my risk tolerance is moderate..."
              className="w-full mt-2 px-4 py-2 bg-background border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
                       text-sm resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Provide specific context or focus areas for the AI analysis
            </p>
          </div>
        )}

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Analyzing Portfolio...
            </>
          ) : (
            'Analyze Risk'
          )}
        </Button>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          title="Risk Analysis Failed"
          message={error.message}
          onRetry={handleRetry}
        />
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6 animate-fade-in">
          {/* Risk Assessment Badge */}
          <RiskAssessmentBadge
            varPct={data.risk_facts.var_pct}
            maxWeight={data.risk_facts.max_single_weight}
            maxWeightSymbol={data.risk_facts.max_single_weight_symbol}
            effectiveN={data.risk_facts.effective_n}
          />

          {/* Risk Facts */}
          <GlassCard>
            <RiskFactsDisplay
              riskFacts={data.risk_facts}
              portfolioValue={data.portfolio_value}
            />
          </GlassCard>

          {/* Component VaR Visualization */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Risk Contribution by Position</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Breakdown of how much each position contributes to total portfolio risk. Higher
              contribution means the position has more impact on portfolio VaR.
            </p>
            <ComponentVaRChart components={data.components} />
          </GlassCard>

          {/* Component VaR Table */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Detailed Component VaR Analysis</h3>
            <ComponentVaRTable components={data.components} />
          </GlassCard>

          {/* LLM Recommendations */}
          {includeLLM && (
            <LLMRecommendations
              recommendations={data.llm_recommendations}
              error={data.llm_error || undefined}
              isLoading={false}
              onRetry={handleRetry}
            />
          )}

          {/* Backtesting Results */}
          {includeBacktest && data.backtest && (
            <GlassCard>
              <BacktestResults backtest={data.backtest} />
            </GlassCard>
          )}

          {/* Metadata Footer */}
          <div className="text-xs text-muted-foreground text-center">
            Analysis as of {new Date(data.as_of).toLocaleString()} | Method: {data.method} |
            Confidence: {(data.confidence * 100).toFixed(0)}% | Horizon: {data.horizon_days} days |
            Data as of: {new Date(data.db_as_of).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
