import { useMutation } from '@tanstack/react-query'
import { riskAnalysisService } from '../services/risk-analysis.service'
import type { RiskAnalysisRequest } from '../types'

/**
 * Hook to perform comprehensive risk analysis
 * Returns mutation object with mutate, data, isLoading, error, etc.
 * This is the primary hook for the Risk Analysis panel
 */
export function useRiskAnalysis() {
  return useMutation({
    mutationFn: (request: RiskAnalysisRequest) => riskAnalysisService.analyze(request),
    onError: (error: Error) => {
      console.error('Risk analysis failed:', error.message)
    },
  })
}
