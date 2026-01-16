import apiClient from '../client'
import { API_ENDPOINTS } from '../endpoints'
import type { BacktestRequest, BacktestResponse } from '../types'

export const backtestService = {
  /**
   * Run backtesting to validate risk model accuracy
   * @param request - Backtest parameters
   * @returns Backtest results with summary and breaches
   */
  async runBacktest(request: BacktestRequest): Promise<BacktestResponse> {
    const { data } = await apiClient.post<BacktestResponse>(API_ENDPOINTS.RISK_BACKTEST, request)
    return data
  },
}
