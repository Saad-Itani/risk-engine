import { useMutation } from '@tanstack/react-query'
import { varService } from '../services/var.service'
import type { VaRRequest } from '../types'

/**
 * Hook to compute Value at Risk for a portfolio
 * Returns mutation object with mutate, data, isLoading, error, etc.
 */
export function useComputeVaR() {
  return useMutation({
    mutationFn: (request: VaRRequest) => varService.computeVaR(request),
    onError: (error: Error) => {
      console.error('VaR computation failed:', error.message)
    },
  })
}
