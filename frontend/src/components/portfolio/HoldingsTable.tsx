import { useState } from 'react'
import { Trash2, Edit2, Check, X } from 'lucide-react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { EmptyState } from '../common/EmptyState'
import { cn } from '../../lib/utils'

/**
 * Table displaying current portfolio holdings
 * Supports inline editing and removal
 */
export function HoldingsTable() {
  const holdings = usePortfolioStore((state) => state.holdings)
  const updateHolding = usePortfolioStore((state) => state.updateHolding)
  const removeHolding = usePortfolioStore((state) => state.removeHolding)
  const clearHoldings = usePortfolioStore((state) => state.clearHoldings)

  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [editShares, setEditShares] = useState<string>('')

  const holdingsArray = Array.from(holdings.entries()).map(([symbol, shares]) => ({
    symbol,
    shares,
  }))

  const startEdit = (symbol: string, shares: number) => {
    setEditingSymbol(symbol)
    setEditShares(shares.toString())
  }

  const saveEdit = (symbol: string) => {
    const newShares = parseFloat(editShares)
    if (isNaN(newShares) || newShares <= 0) {
      alert('Please enter a valid number of shares')
      return
    }
    updateHolding(symbol, newShares)
    setEditingSymbol(null)
  }

  const cancelEdit = () => {
    setEditingSymbol(null)
    setEditShares('')
  }

  const handleRemove = (symbol: string) => {
    if (confirm(`Remove ${symbol} from portfolio?`)) {
      removeHolding(symbol)
    }
  }

  const handleClearAll = () => {
    if (confirm('Clear all holdings from portfolio?')) {
      clearHoldings()
    }
  }

  if (holdingsArray.length === 0) {
    return (
      <EmptyState
        icon={<div className="text-6xl">📊</div>}
        title="No holdings yet"
        description="Add your first stock to start building your portfolio"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Current Holdings ({holdingsArray.length})
        </h3>
        <Button variant="outline" size="sm" onClick={handleClearAll}>
          Clear All
        </Button>
      </div>

      {/* Table */}
      <div className="backdrop-blur-md bg-glass-gradient border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-accent/20">
              <th className="text-left px-4 py-3 font-semibold text-sm">Symbol</th>
              <th className="text-right px-4 py-3 font-semibold text-sm">Shares</th>
              <th className="text-right px-4 py-3 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holdingsArray.map(({ symbol, shares }) => (
              <tr
                key={symbol}
                className={cn(
                  'border-b border-border last:border-0',
                  'hover:bg-accent/10 transition-colors'
                )}
              >
                <td className="px-4 py-3 font-medium">{symbol}</td>
                <td className="px-4 py-3 text-right">
                  {editingSymbol === symbol ? (
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editShares}
                        onChange={(e) => setEditShares(e.target.value)}
                        className="w-32 text-right"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(symbol)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => saveEdit(symbol)}
                        className="h-8 w-8"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-8 w-8"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {shares.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingSymbol !== symbol && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(symbol, shares)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemove(symbol)}
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Total positions: {holdingsArray.length}
      </div>
    </div>
  )
}
