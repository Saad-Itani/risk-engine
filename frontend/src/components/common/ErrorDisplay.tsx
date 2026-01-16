import { AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ErrorDisplayProps {
  error: Error | string
  onRetry?: () => void
  className?: string
}

/**
 * Error display component with optional retry button
 */
export function ErrorDisplay({ error, onRetry, className }: ErrorDisplayProps) {
  const message = typeof error === 'string' ? error : error.message

  return (
    <div
      className={cn(
        'backdrop-blur-md bg-red-500/10 border border-red-500/20',
        'rounded-lg p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">Error</h4>
          <p className="text-sm text-red-600 dark:text-red-300">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
