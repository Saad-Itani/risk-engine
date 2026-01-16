import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchUniverse } from '../../api/hooks/useSearchUniverse'
import { useDebounce } from '../../hooks/useDebounce'
import { Input } from '../ui/input'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { cn } from '../../lib/utils'
import type { Company } from '../../api/types'

interface TickerSearchProps {
  onSelect: (company: Company) => void
  placeholder?: string
}

/**
 * Autocomplete ticker search component
 * Searches companies by symbol or name with debounced API calls
 */
export function TickerSearch({ onSelect, placeholder = 'Search ticker or company...' }: TickerSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { data: companies, isLoading, error } = useSearchUniverse(debouncedQuery)

  // Debug logging
  useEffect(() => {
    console.log('TickerSearch - Query:', query, 'Debounced:', debouncedQuery, 'Companies:', companies, 'isOpen:', isOpen)
  }, [query, debouncedQuery, companies, isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Open dropdown when there are results
  useEffect(() => {
    if (companies && companies.length > 0) {
      console.log('Setting isOpen to true - companies:', companies)
      setIsOpen(true)
    } else if (companies && companies.length === 0 && debouncedQuery.length > 0) {
      console.log('No results for query:', debouncedQuery)
      setIsOpen(true) // Show "no results" message
    }
  }, [companies, debouncedQuery])

  const handleSelect = (company: Company) => {
    console.log('Selected company:', company)
    onSelect(company)
    setQuery('')
    setIsOpen(false)
  }

  const clearSearch = () => {
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (companies && companies.length > 0) {
              setIsOpen(true)
            }
          }}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute z-50 w-full mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-600 dark:text-red-400">
          Error: {error.message}
        </div>
      )}

      {/* Dropdown - Results */}
      {isOpen && companies && companies.length > 0 && (
        <div
          className={cn(
            'absolute z-[100] w-full mt-2',
            'bg-white dark:bg-gray-900',
            'border-2 border-primary/20',
            'rounded-lg shadow-2xl',
            'max-h-80 overflow-y-auto',
            'animate-fade-in'
          )}
        >
          <div className="p-2 text-xs text-muted-foreground border-b">
            {companies.length} result{companies.length > 1 ? 's' : ''} found
          </div>
          {companies.map((company) => (
            <button
              key={company.symbol}
              onClick={() => handleSelect(company)}
              className={cn(
                'w-full text-left px-4 py-3',
                'hover:bg-primary/10 transition-colors',
                'border-b border-border last:border-0',
                'focus:outline-none focus:bg-primary/10'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{company.symbol}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-sm text-foreground truncate">{company.shortname}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {company.sector} • {company.industry}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && companies && companies.length === 0 && debouncedQuery.length > 0 && !isLoading && (
        <div
          className={cn(
            'absolute z-[100] w-full mt-2',
            'bg-white dark:bg-gray-900',
            'border-2 border-yellow-500/50',
            'rounded-lg shadow-lg p-4 text-center text-muted-foreground text-sm',
            'animate-fade-in'
          )}
        >
          No companies found for "{debouncedQuery}"
        </div>
      )}
    </div>
  )
}
