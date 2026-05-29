import { useState } from 'react'
import { AlertTriangle, TrendingDown } from 'lucide-react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useRiskAnalysis } from '../../api/hooks/useRiskAnalysis'
import { useLlmRecommendations } from '../../api/hooks/useLlmRecommendations'
import { GlassCard } from '../common/GlassCard'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Slider } from '../ui/slider'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorDisplay } from '../common/ErrorDisplay'
import { EmptyState } from '../common/EmptyState'
import { RiskAssessmentBadge } from './RiskAssessmentBadge'
import { RiskFactsDisplay } from './RiskFactsDisplay'
import { ComponentVaRChart } from './ComponentVaRChart'
import { ComponentVaRTable } from './ComponentVaRTable'
import { BacktestResults } from './BacktestResults'
import { TerminalDialog } from '../ui/terminal-dialog'
import { LLMRecommendations } from './LLMRecommendations'

/**
 * Comprehensive risk analysis panel with VaR decomposition, backtesting, and LLM recommendations
 */
export function RiskAnalysisPanel() {
  const { getHoldingsArray, hasHoldings } = usePortfolioStore()
  const { mutate: analyzeRisk, data, isPending: isAnalyzing, error, reset } = useRiskAnalysis()
  const {
    mutate: fetchLlm,
    data: llmData,
    isPending: llmLoading,
    error: llmError,
    reset: llmReset,
  } = useLlmRecommendations()

  const isLoading = isAnalyzing

  // Configuration state
  const [confidence, setConfidence] = useState(0.95)
  const [horizonDays, setHorizonDays] = useState(5)
  const [lookbackDays, setLookbackDays] = useState(252)
  const [includeBacktest, setIncludeBacktest] = useState(true)
  const [includeLlmRecommendations, setIncludeLlmRecommendations] = useState(false)

  // Warning dialog state
  const [showDiversityWarning, setShowDiversityWarning] = useState(false)

  const handleAnalyze = () => {
    const holdings = getHoldingsArray()

    // Check for portfolio diversity - need at least 2 different assets
    const uniqueSymbols = new Set(holdings.map(h => h.symbol))
    if (uniqueSymbols.size < 2) {
      setShowDiversityWarning(true)
      return
    }

    llmReset() // Clear previous LLM result immediately

    analyzeRisk(
      {
        holdings,
        confidence,
        horizon_days: horizonDays,
        lookback_days: lookbackDays,
        include_backtest: includeBacktest,
        include_es: true,
      },
      {
        onSuccess: (analysisData) => {
          // Fire LLM request immediately after analysis returns — doesn't block results
          if (includeLlmRecommendations) {
            fetchLlm({ risk_analysis: analysisData })
          }
        },
      }
    )
  }

  const handleRetry = () => {
    reset()
    llmReset()
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
              onChange={(e) => setIncludeBacktest(e.target.checked)}
            />
            <Label htmlFor="backtest" className="cursor-pointer text-sm">
              Include Backtesting Validation (Kupiec Test)
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="llm"
              checked={includeLlmRecommendations}
              onChange={(e) => setIncludeLlmRecommendations(e.target.checked)}
            />
            <Label htmlFor="llm" className="cursor-pointer text-sm">
              Include AI-Powered Analysis & Recommendations
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
            error={error.message || 'Risk analysis failed'}
            onRetry={handleRetry}
          />
        </GlassCard>
      )}

      {/* LLM Recommendations — fires after analysis returns, loads independently */}
      {includeLlmRecommendations && (llmLoading || llmData || llmError) && (
        <LLMRecommendations
          recommendations={llmData?.recommendations ?? undefined}
          error={llmData?.error ?? llmError?.message ?? undefined}
          isLoading={llmLoading}
          onRetry={() => data && fetchLlm({ risk_analysis: data })}
        />
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

      {/* Portfolio Diversity Warning Dialog */}
      <TerminalDialog
        open={showDiversityWarning}
        onClose={() => setShowDiversityWarning(false)}
        title="INSUFFICIENT PORTFOLIO DIVERSIFICATION"
        variant="warning"
      >
        <div className="space-y-5">
          {/* Main Message */}
          <div className="flex gap-4">
            <TrendingDown className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-3">
              <p className="text-base font-semibold text-foreground leading-tight">
                Risk analysis requires a minimum of two distinct asset positions.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your portfolio currently contains holdings of a single security. To perform comprehensive
                risk decomposition, component VaR analysis, and correlation-based metrics, please add
                positions in at least one additional asset class or security.
              </p>
            </div>
          </div>

          {/* Recommended Action Box */}
          <div className="border-l-4 border-warning/40 bg-warning/5 pl-4 pr-4 py-3 rounded-r">
            <p className="text-xs font-bold uppercase tracking-wider text-warning mb-2 mono">
              RECOMMENDED ACTION
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Diversify holdings across multiple securities to enable portfolio risk analysis and cross-asset correlation assessment.
            </p>
          </div>
        </div>
      </TerminalDialog>
    </div>
  )
}
