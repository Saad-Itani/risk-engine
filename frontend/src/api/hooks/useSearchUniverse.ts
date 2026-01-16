import { useQuery } from '@tanstack/react-query'
import { universeService } from '../services/universe.service'

/**
 * Hook to search for companies by symbol or name
 * @param query - Search query (symbol or company name)
 * @param enabled - Whether the query should be enabled (default: true if query length > 0)
 */
export function useSearchUniverse(query: string, enabled = query.length > 0) {
  return useQuery({
    queryKey: ['universe', query],
    queryFn: () => universeService.search(query),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - company data doesn't change frequently
    retry: 1,
  })
}
