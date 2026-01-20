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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        <MetricCard
          label="VAR (DOLLARS)"
          value={formatCurrency(riskFacts.var_dollars)}
          subtitle={formatPercentage(riskFacts.var_pct)}
          trend="down"
        />

        {riskFacts.es_dollars && (
          <MetricCard
            label="ES (DOLLARS)"
            value={formatCurrency(riskFacts.es_dollars)}
            subtitle={formatPercentage(riskFacts.es_pct || 0)}
            trend="down"
          />
        )}

        <MetricCard
          label="MAX POSITION WEIGHT"
          value={formatPercentage(riskFacts.max_single_weight)}
          subtitle={riskFacts.max_single_weight_symbol}
        />

        <MetricCard
          label="EFFECTIVE DIVERSIFICATION"
          value={riskFacts.effective_n.toFixed(2)}
          subtitle="Effective number of positions"
        />

        <MetricCard
          label="MAX RISK CONTRIBUTION"
          value={formatPercentage(riskFacts.max_single_risk_contribution)}
          subtitle={riskFacts.max_single_risk_contribution_symbol}
          trend="down"
        />

        {riskFacts.avg_pairwise_corr !== undefined && (
          <MetricCard
            label="AVG. CORRELATION"
            value={riskFacts.avg_pairwise_corr.toFixed(3)}
            subtitle="Pairwise correlation"
          />
        )}

        {riskFacts.max_pairwise_corr !== undefined && (
          <MetricCard
            label="MAX CORRELATION"
            value={riskFacts.max_pairwise_corr.toFixed(3)}
            subtitle={
              riskFacts.top_correlated_pairs && riskFacts.top_correlated_pairs.length > 0
                ? `${riskFacts.top_correlated_pairs[0].symbol_1} - ${riskFacts.top_correlated_pairs[0].symbol_2}`
                : 'N/A'
            }
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
