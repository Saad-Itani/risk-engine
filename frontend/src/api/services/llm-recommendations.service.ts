import apiClient from '../client'
import { API_ENDPOINTS } from '../endpoints'
import type { LlmRecommendationsRequest, LlmRecommendationsResponse } from '../types'

export const llmRecommendationsService = {
  async get(request: LlmRecommendationsRequest): Promise<LlmRecommendationsResponse> {
    const { data } = await apiClient.post<LlmRecommendationsResponse>(
      API_ENDPOINTS.LLM_RECOMMENDATIONS,
      request
    )
    return data
  },
}
