import { AlertCircle, Sparkles, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib/utils'

interface LLMRecommendationsProps {
  recommendations?: string
  error?: string
  isLoading?: boolean
  onRetry?: () => void
}

/**
 * Display LLM-generated portfolio recommendations with markdown rendering
 */
export function LLMRecommendations({
  recommendations,
  error,
  isLoading = false,
  onRetry,
}: LLMRecommendationsProps) {
  if (isLoading) {
    return (
      <div className="backdrop-blur-md bg-accent/10 border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-pulse" />
          <h3 className="text-lg font-semibold">AI-Powered Recommendations</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-muted/50 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-muted/50 rounded animate-pulse w-5/6"></div>
          <div className="h-4 bg-muted/50 rounded animate-pulse w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="backdrop-blur-md bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
              LLM Recommendations Error
            </h3>
            <p className="text-sm text-foreground/80 mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Analysis
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!recommendations) {
    return (
      <div className="backdrop-blur-md bg-accent/10 border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold">AI-Powered Recommendations</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable LLM recommendations in the configuration to receive AI-powered portfolio insights and
          suggestions.
        </p>
      </div>
    )
  }

  return (
    <div className="backdrop-blur-md bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400">
          AI-Powered Recommendations
        </h3>
      </div>
      <div
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'prose-headings:text-foreground prose-headings:font-semibold',
          'prose-p:text-foreground/90 prose-p:leading-relaxed',
          'prose-strong:text-foreground prose-strong:font-semibold',
          'prose-ul:text-foreground/90 prose-ol:text-foreground/90',
          'prose-li:my-1',
          'prose-code:text-purple-600 dark:prose-code:text-purple-400',
          'prose-code:bg-purple-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
          'prose-pre:bg-muted prose-pre:border prose-pre:border-border',
          'prose-blockquote:border-l-purple-500 prose-blockquote:text-foreground/80',
          'prose-a:text-purple-600 dark:prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline'
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{recommendations}</ReactMarkdown>
      </div>
    </div>
  )
}
