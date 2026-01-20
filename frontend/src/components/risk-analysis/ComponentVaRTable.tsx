import { ArrowUpDown } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, formatPercentage, cn } from '../../lib/utils'
import type { ComponentVaR } from '../../api/types'

interface ComponentVaRTableProps {
  components: ComponentVaR[]
}

type SortField = 'symbol' | 'weight' | 'component_var_dollars' | 'percentage_contribution'
type SortDirection = 'asc' | 'desc'

/**
 * Detailed table showing component VaR breakdown with sorting
 */
export function ComponentVaRTable({ components }: ComponentVaRTableProps) {
  const [sortField, setSortField] = useState<SortField>('percentage_contribution')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedComponents = [...components].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1
    if (sortField === 'symbol') {
      return multiplier * a.symbol.localeCompare(b.symbol)
    }
    return multiplier * (a[sortField] - b[sortField])
  })

  const SortButton = ({ field, label, title }: { field: SortField; label: string; title?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      title={title}
      style={title ? { cursor: 'help' } : undefined}
    >
      {label}
      <ArrowUpDown
        className={cn(
          'w-3 h-3',
          sortField === field ? 'text-primary' : 'text-muted-foreground/50'
        )}
      />
    </button>
  )

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="terminal-table">
          <thead>
            <tr>
              <th className="text-left">
                <SortButton field="symbol" label="SYMBOL" />
              </th>
              <th className="text-right">
                <SortButton
                  field="weight"
                  label="WEIGHT"
                  title="Position value as percentage of total portfolio value"
                />
              </th>
              <th className="text-right">
                <SortButton
                  field="component_var_dollars"
                  label="COMPONENT VAR"
                  title="This position's contribution to total portfolio VaR (sum of all = total VaR)"
                />
              </th>
              <th
                className="text-right"
                title="Change in portfolio VaR from a 1% increase in this position's weight"
                style={{ cursor: 'help' }}
              >
                MARGINAL VAR
              </th>
              <th className="text-right">
                <SortButton
                  field="percentage_contribution"
                  label="% CONTRIBUTION"
                  title="Percentage of total portfolio VaR attributable to this position"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedComponents.map((component, index) => {
              const riskLevel =
                component.percentage_contribution > 0.3
                  ? 'high'
                  : component.percentage_contribution > 0.2
                  ? 'medium'
                  : 'low'

              const riskColors = {
                high: 'bg-red-500/10 border-l-4 border-l-red-500',
                medium: 'bg-primary/10 border-l-4 border-l-primary',
                low: '',
              }

              return (
                <tr
                  key={component.symbol}
                  className={cn(
                    'border-b border-border last:border-0',
                    'hover:bg-accent/10 transition-colors',
                    riskColors[riskLevel]
                  )}
                >
                  <td className="font-bold text-terminal-cyan mono">{component.symbol}</td>
                  <td className="text-right data-cell">
                    {formatPercentage(component.weight)}
                  </td>
                  <td className="text-right data-cell">
                    {formatCurrency(component.component_var_dollars)}
                  </td>
                  <td className="text-right data-cell">
                    {formatCurrency(component.marginal_var_dollars)}
                  </td>
                  <td className="text-right">
                    <span
                      className={cn(
                        'inline-block px-2 py-1 text-xs font-bold mono',
                        riskLevel === 'high' && 'text-red-500',
                        riskLevel === 'medium' && 'text-primary',
                        riskLevel === 'low' && 'text-terminal-cyan'
                      )}
                    >
                      {formatPercentage(component.percentage_contribution)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
