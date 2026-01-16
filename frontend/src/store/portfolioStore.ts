import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Holding } from '../api/types'

interface PortfolioStore {
  holdings: Map<string, number> // symbol -> shares
  addHolding: (symbol: string, shares: number) => void
  updateHolding: (symbol: string, shares: number) => void
  removeHolding: (symbol: string) => void
  clearHoldings: () => void
  getHoldingsArray: () => Holding[]
  hasHoldings: () => boolean
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      holdings: new Map(),

      addHolding: (symbol, shares) =>
        set((state) => {
          const newHoldings = new Map(state.holdings)
          newHoldings.set(symbol.toUpperCase(), shares)
          return { holdings: newHoldings }
        }),

      updateHolding: (symbol, shares) =>
        set((state) => {
          const newHoldings = new Map(state.holdings)
          if (shares > 0) {
            newHoldings.set(symbol.toUpperCase(), shares)
          } else {
            newHoldings.delete(symbol.toUpperCase())
          }
          return { holdings: newHoldings }
        }),

      removeHolding: (symbol) =>
        set((state) => {
          const newHoldings = new Map(state.holdings)
          newHoldings.delete(symbol.toUpperCase())
          return { holdings: newHoldings }
        }),

      clearHoldings: () => set({ holdings: new Map() }),

      getHoldingsArray: () => {
        const { holdings } = get()
        return Array.from(holdings.entries()).map(([symbol, shares]) => ({
          symbol,
          shares,
        }))
      },

      hasHoldings: () => {
        const { holdings } = get()
        return holdings.size > 0
      },
    }),
    {
      name: 'risk-engine-portfolio',
      storage: createJSONStorage(() => localStorage, {
        // Custom serialization for Map
        replacer: (key, value) => {
          if (value instanceof Map) {
            return Array.from(value.entries())
          }
          return value
        },
        // Custom deserialization for Map
        reviver: (key, value) => {
          if (key === 'holdings' && Array.isArray(value)) {
            return new Map(value)
          }
          return value
        },
      }),
    }
  )
)
