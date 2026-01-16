import { TrendingDown, Percent, Users, BarChart3 } from 'lucide-react'
import { MetricCard } from '../common/MetricCard'
import { formatCurrency, formatPercentage } from '../../lib/utils'
import type { RiskFacts } from '../../api/types'

interface RiskFactsDisplayProps {
  riskFacts: RiskFacts
  portfolioValue: number
}

/**
 * Display risk facts in a grid of metric cards
 */
export function RiskFactsDisplay({ riskFacts, portfolioValue }: RiskFactsDisplayProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Risk Metrics Summary</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* VaR Metrics */}
        <MetricCard
          label="Value at Risk (VaR)"
          value={formatCurrency(riskFacts.var_dollars)}
          subtitle={`${formatPercentage(riskFacts.var_pct)} of portfolio`}
          icon={<TrendingDown className="w-5 h-5" />}
          trend="down"
        />

        {riskFacts.es_dollars && (
          <MetricCard
            label="Expected Shortfall (ES)"
            value={formatCurrency(riskFacts.es_dollars)}
            subtitle={`${formatPercentage(riskFacts.es_pct || 0)} of portfolio`}
            icon={<TrendingDown className="w-5 h-5" />}
            trend="down"
          />
        )}

        {/* Concentration Metrics */}
        <MetricCard
          label="Max Position Weight"
          value={formatPercentage(riskFacts.max_single_weight)}
          subtitle={riskFacts.max_single_weight_symbol}
          icon={<Percent className="w-5 h-5" />}
        />

        <MetricCard
          label="Effective Diversification"
          value={riskFacts.effective_n.toFixed(2)}
          subtitle="Effective number of positions"
          icon={<Users className="w-5 h-5" />}
        />

        {/* Risk Contribution */}
        <MetricCard
          label="Max Risk Contribution"
          value={formatPercentage(riskFacts.max_single_risk_contribution)}
          subtitle={riskFacts.max_single_risk_contribution_symbol}
          icon={<BarChart3 className="w-5 h-5" />}
          trend="down"
        />

        {/* Correlation Metrics */}
        {riskFacts.avg_pairwise_corr !== undefined && (
          <MetricCard
            label="Avg. Correlation"
            value={riskFacts.avg_pairwise_corr.toFixed(3)}
            subtitle="Pairwise correlation"
            icon={<BarChart3 className="w-5 h-5" />}
          />
        )}

        {riskFacts.max_pairwise_corr !== undefined && (
          <MetricCard
            label="Max Correlation"
            value={riskFacts.max_pairwise_corr.toFixed(3)}
            subtitle={
              riskFacts.top_correlated_pairs && riskFacts.top_correlated_pairs.length > 0
                ? `${riskFacts.top_correlated_pairs[0].symbol_1} - ${riskFacts.top_correlated_pairs[0].symbol_2}`
                : 'N/A'
            }
            icon={<BarChart3 className="w-5 h-5" />}
          />
        )}
      </div>

      {/* Top Contributors */}
      {riskFacts.top_contributors && riskFacts.top_contributors.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
            Top Risk Contributors
          </h4>
          <div className="flex flex-wrap gap-2">
            {riskFacts.top_contributors.map((contributor, index) => (
              <div
                key={contributor.symbol}
                className="backdrop-blur-md bg-accent/20 border border-border rounded-lg px-3 py-2 text-sm"
              >
                <span className="font-semibold">{contributor.symbol}</span>
                <span className="text-muted-foreground mx-2">•</span>
                <span>{formatPercentage(contributor.risk_pct)} risk</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
