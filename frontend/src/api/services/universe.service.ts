import apiClient from '../client'
import { API_ENDPOINTS } from '../endpoints'
import type { SearchUniverseResponse } from '../types'

export const universeService = {
  /**
   * Search for companies by symbol or name
   * @param query - Search query (symbol or company name)
   * @returns List of matching companies
   */
  async search(query: string): Promise<SearchUniverseResponse> {
    const { data } = await apiClient.get<SearchUniverseResponse>(API_ENDPOINTS.UNIVERSE, {
      params: { q: query },
    })
    return data
  },
}
