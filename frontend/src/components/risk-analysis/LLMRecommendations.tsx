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
      <div className="terminal-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="text-sm font-semibold text-terminal-cyan mono uppercase">AI-Powered Recommendations</h3>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted/50 rounded animate-pulse w-3/4"></div>
          <div className="h-3 bg-muted/50 rounded animate-pulse w-full"></div>
          <div className="h-3 bg-muted/50 rounded animate-pulse w-5/6"></div>
          <div className="h-3 bg-muted/50 rounded animate-pulse w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="terminal-card bg-red-500/10 border-red-500/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-500 mb-2 mono uppercase">
              LLM Error
            </h3>
            <p className="text-xs text-foreground/80 mb-3">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold mono uppercase rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!recommendations) {
    return (
      <div className="terminal-card p-4">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-terminal-cyan mono uppercase">AI-Powered Recommendations</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Enable LLM recommendations in the configuration to receive AI-powered portfolio insights and
          suggestions.
        </p>
      </div>
    )
  }

  return (
    <div className="terminal-card bg-primary/10 border-primary/30 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-primary mono uppercase">
          AI-Powered Recommendations
        </h3>
      </div>
      <div
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'prose-headings:text-foreground prose-headings:font-semibold prose-headings:mono',
          'prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:text-xs',
          'prose-strong:text-foreground prose-strong:font-semibold',
          'prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-ul:text-xs prose-ol:text-xs',
          'prose-li:my-0.5',
          'prose-code:text-primary prose-code:mono',
          'prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
          'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:text-xs',
          'prose-blockquote:border-l-primary prose-blockquote:text-foreground/80',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline'
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{recommendations}</ReactMarkdown>
      </div>
    </div>
  )
}
