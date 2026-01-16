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

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
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
    <div className="backdrop-blur-md bg-accent/10 border border-white/10 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-accent/20">
              <th className="text-left px-4 py-3 font-semibold text-sm">
                <SortButton field="symbol" label="Symbol" />
              </th>
              <th className="text-right px-4 py-3 font-semibold text-sm">
                <SortButton field="weight" label="Weight" />
              </th>
              <th className="text-right px-4 py-3 font-semibold text-sm">
                <SortButton field="component_var_dollars" label="Component VaR" />
              </th>
              <th className="text-right px-4 py-3 font-semibold text-sm">
                Marginal VaR
              </th>
              <th className="text-right px-4 py-3 font-semibold text-sm">
                <SortButton field="percentage_contribution" label="% Contribution" />
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
                medium: 'bg-orange-500/10 border-l-4 border-l-orange-500',
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
                  <td className="px-4 py-3 font-medium">{component.symbol}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatPercentage(component.weight)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(component.component_var_dollars)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatCurrency(component.marginal_var_dollars)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'inline-block px-2 py-1 rounded text-sm font-semibold',
                        riskLevel === 'high' && 'bg-red-500/20 text-red-700 dark:text-red-400',
                        riskLevel === 'medium' &&
                          'bg-orange-500/20 text-orange-700 dark:text-orange-400',
                        riskLevel === 'low' && 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
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
