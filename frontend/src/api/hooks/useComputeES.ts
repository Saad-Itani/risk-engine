import { useMutation } from '@tanstack/react-query'
import { esService } from '../services/es.service'
import type { ESRequest } from '../types'

/**
 * Hook to compute Expected Shortfall (CVaR) for a portfolio
 * Returns mutation object with mutate, data, isLoading, error, etc.
 */
export function useComputeES() {
  return useMutation({
    mutationFn: (request: ESRequest) => esService.computeES(request),
    onError: (error: Error) => {
      console.error('ES computation failed:', error.message)
    },
  })
}
