import { AddHoldingForm } from './AddHoldingForm'
import { HoldingsTable } from './HoldingsTable'
import { GlassCard } from '../common/GlassCard'

/**
 * Portfolio Builder container component
 * Combines ticker search, add form, and holdings table
 * Bloomberg Terminal style - compact, side-by-side layout
 */
export function PortfolioBuilder() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-lg font-bold text-bloomberg mono">PORTFOLIO BUILDER</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Add positions to your portfolio. Holdings are saved automatically.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Add Position - 1/3 width */}
        <GlassCard className="lg:col-span-1">
          <h3 className="text-sm font-semibold mb-3 text-terminal-cyan mono">ADD POSITION</h3>
          <AddHoldingForm />
        </GlassCard>

        {/* Holdings Table - 2/3 width */}
        <GlassCard className="lg:col-span-2">
          <HoldingsTable />
        </GlassCard>
      </div>
    </div>
  )
}
