import apiClient from '../client'
import { API_ENDPOINTS } from '../endpoints'
import type { ESRequest, ESResponse } from '../types'

export const esService = {
  /**
   * Compute Expected Shortfall (CVaR) for a portfolio
   * @param request - ES calculation parameters
   * @returns ES computation results
   */
  async computeES(request: ESRequest): Promise<ESResponse> {
    const { data} = await apiClient.post<ESResponse>(API_ENDPOINTS.ES, request)
    return data
  },
}
