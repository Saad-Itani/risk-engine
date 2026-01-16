import { AddHoldingForm } from './AddHoldingForm'
import { HoldingsTable } from './HoldingsTable'
import { GlassCard } from '../common/GlassCard'

/**
 * Portfolio Builder container component
 * Combines ticker search, add form, and holdings table
 */
export function PortfolioBuilder() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold mb-2">Build Your Portfolio</h2>
        <p className="text-muted-foreground">
          Search for stocks and add them to your portfolio. Your holdings are saved automatically.
        </p>
      </div>

      {/* Add Holding Form */}
      <GlassCard>
        <h3 className="text-lg font-semibold mb-4">Add Position</h3>
        <AddHoldingForm />
      </GlassCard>

      {/* Holdings Table */}
      <GlassCard>
        <HoldingsTable />
      </GlassCard>
    </div>
  )
}
