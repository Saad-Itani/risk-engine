import apiClient from '../client'
import { API_ENDPOINTS } from '../endpoints'
import type { RiskAnalysisRequest, RiskAnalysisResponse } from '../types'

export const riskAnalysisService = {
  /**
   * Perform comprehensive risk analysis with component VaR decomposition
   * @param request - Risk analysis parameters
   * @returns Risk analysis results including components, facts, and optional backtest/LLM
   */
  async analyze(request: RiskAnalysisRequest): Promise<RiskAnalysisResponse> {
    const { data } = await apiClient.post<RiskAnalysisResponse>(
      API_ENDPOINTS.RISK_ANALYSIS,
      request
    )
    return data
  },
}
