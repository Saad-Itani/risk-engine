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
        icon={<div className="text-4xl">📊</div>}
        title="No holdings"
        description="Add your first position"
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-terminal-cyan mono">
          HOLDINGS ({holdingsArray.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          className="text-xs h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          CLEAR
        </Button>
      </div>

      {/* Table - Terminal style */}
      <div className="border border-border rounded overflow-hidden">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>SYMBOL</th>
              <th className="text-right">SHARES</th>
              <th className="text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {holdingsArray.map(({ symbol, shares }) => (
              <tr key={symbol}>
                <td className="font-bold text-terminal-cyan mono">{symbol}</td>
                <td className="text-right">
                  {editingSymbol === symbol ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editShares}
                        onChange={(e) => setEditShares(e.target.value)}
                        className="w-24 text-right h-7 text-sm mono"
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
                        className="h-7 w-7"
                      >
                        <Check className="w-3 h-3 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-7 w-7"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <span className="data-cell">
                      {shares.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </td>
                <td className="text-right">
                  {editingSymbol !== symbol && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(symbol, shares)}
                        className="h-7 w-7 hover:bg-accent/20"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemove(symbol)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
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
      <div className="text-xs text-muted-foreground mono">
        TOTAL: {holdingsArray.length} position{holdingsArray.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
