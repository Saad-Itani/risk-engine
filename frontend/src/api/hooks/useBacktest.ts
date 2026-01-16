import { useMutation } from '@tanstack/react-query'
import { backtestService } from '../services/backtest.service'
import type { BacktestRequest } from '../types'

/**
 * Hook to run backtesting for risk model validation
 * Returns mutation object with mutate, data, isLoading, error, etc.
 */
export function useBacktest() {
  return useMutation({
    mutationFn: (request: BacktestRequest) => backtestService.runBacktest(request),
    onError: (error: Error) => {
      console.error('Backtesting failed:', error.message)
    },
  })
}
