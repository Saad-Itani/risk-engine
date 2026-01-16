import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TickerSearch } from './TickerSearch'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { usePortfolioStore } from '../../store/portfolioStore'
import type { Company } from '../../api/types'

/**
 * Form to add or update holdings in the portfolio
 */
export function AddHoldingForm() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [shares, setShares] = useState<string>('1')
  const addHolding = usePortfolioStore((state) => state.addHolding)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    const sharesNum = parseFloat(shares)
    if (isNaN(sharesNum) || sharesNum <= 0) {
      alert('Please enter a valid number of shares')
      return
    }

    addHolding(selectedCompany.symbol, sharesNum)

    // Reset form
    setSelectedCompany(null)
    setShares('1')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ticker Search */}
        <div className="space-y-2">
          <Label>Search Ticker</Label>
          {selectedCompany ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 backdrop-blur-md bg-accent/30 border border-white/10 rounded-lg px-4 py-2">
                <div className="font-semibold">{selectedCompany.symbol}</div>
                <div className="text-xs text-muted-foreground">{selectedCompany.shortname}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedCompany(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <TickerSearch
              onSelect={setSelectedCompany}
              placeholder="Search by ticker or name..."
            />
          )}
        </div>

        {/* Shares Input */}
        <div className="space-y-2">
          <Label htmlFor="shares">Number of Shares</Label>
          <Input
            id="shares"
            type="number"
            min="0.01"
            step="0.01"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="Enter shares"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={!selectedCompany} className="w-full md:w-auto">
        <Plus className="w-4 h-4 mr-2" />
        Add to Portfolio
      </Button>
    </form>
  )
}
