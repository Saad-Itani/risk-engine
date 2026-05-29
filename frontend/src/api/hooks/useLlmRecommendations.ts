import { useMutation } from '@tanstack/react-query'
import { llmRecommendationsService } from '../services/llm-recommendations.service'
import type { LlmRecommendationsRequest } from '../types'

/**
 * Hook for fetching AI-powered recommendations separately from the main risk analysis.
 * Fired after /risk/analysis returns so the results panel renders immediately
 * while the LLM section loads in the background.
 */
export function useLlmRecommendations() {
  return useMutation({
    mutationFn: (request: LlmRecommendationsRequest) =>
      llmRecommendationsService.get(request),
  })
}
