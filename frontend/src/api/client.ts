import axios, { AxiosError } from 'axios'
import { API_CONFIG } from '../lib/constants'
import type { APIError } from './types'

// ============================================================================
// Axios Client Configuration
// Centralized HTTP client with error handling
// ============================================================================

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed in the future
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<APIError>) => {
    if (error.response) {
      // Server responded with error
      const apiError = error.response.data
      const message = apiError?.error || error.message
      const detail = apiError?.detail

      console.error('API Error:', {
        status: error.response.status,
        message,
        detail,
        symbols: apiError?.symbols,
      })

      return Promise.reject(new Error(detail || message))
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message)
      return Promise.reject(new Error('Network error. Please check your connection and try again.'))
    } else {
      // Error in request setup
      console.error('Request Error:', error.message)
      return Promise.reject(error)
    }
  }
)

export default apiClient
