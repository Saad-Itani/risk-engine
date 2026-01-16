import apiClient from '../client'
import { API_ENDPOINTS } from '../endpoints'
import type { VaRRequest, VaRResponse } from '../types'

export const varService = {
  /**
   * Compute Value at Risk for a portfolio
   * @param request - VaR calculation parameters
   * @returns VaR computation results
   */
  async computeVaR(request: VaRRequest): Promise<VaRResponse> {
    const { data } = await apiClient.post<VaRResponse>(API_ENDPOINTS.VAR, request)
    return data
  },
}
