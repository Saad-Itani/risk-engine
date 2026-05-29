import { AlertCircle, Sparkles, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
          <h3 className="text-sm font-semibold text-terminal-cyan mono uppercase">AI-Powered Analysis & Recommendations</h3>
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
          <h3 className="text-sm font-semibold text-terminal-cyan mono uppercase">AI-Powered Analysis & Recommendations</h3>
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
          AI-Powered Analysis & Recommendations
        </h3>
      </div>
      <div className="max-w-none">
        {/*
          Styles are applied via the `components` map below rather than `prose-*`
          variants, because this project does NOT include @tailwindcss/typography.
        */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => (
              <h2 className="mono text-base font-bold text-primary underline decoration-primary/40 underline-offset-4 mt-5 mb-2 first:mt-0">
                {children}
              </h2>
            ),
            h1: ({ children }) => (
              <h2 className="mono text-base font-bold text-primary underline decoration-primary/40 underline-offset-4 mt-5 mb-2 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mono text-sm font-bold text-primary mt-4 mb-1.5">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-sm text-foreground leading-relaxed my-1.5">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-primary">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 my-1.5 space-y-1 text-sm text-foreground">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 my-1.5 space-y-1 text-sm text-foreground">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            code: ({ children }) => (
              <code className="mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                {children}
              </code>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-xs italic text-foreground/60">
                {children}
              </blockquote>
            ),
            a: ({ children, href }) => (
              <a href={href} className="text-primary no-underline hover:underline">
                {children}
              </a>
            ),
          }}
        >
          {recommendations}
        </ReactMarkdown>
      </div>
    </div>
  )
}
