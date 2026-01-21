import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TerminalDialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  variant?: 'warning' | 'error' | 'info'
}

/**
 * Bloomberg Terminal-styled dialog/modal component
 * Clean, professional warning/error messages that fit the terminal aesthetic
 */
export function TerminalDialog({
  open,
  onClose,
  title,
  children,
  variant = 'warning',
}: TerminalDialogProps) {
  if (!open) return null

  const variantStyles = {
    warning: {
      border: 'border-warning/60',
      titleColor: 'text-warning',
      accentBorder: 'border-l-warning',
    },
    error: {
      border: 'border-destructive/60',
      titleColor: 'text-destructive',
      accentBorder: 'border-l-destructive',
    },
    info: {
      border: 'border-info/60',
      titleColor: 'text-info',
      accentBorder: 'border-l-info',
    },
  }

  const styles = variantStyles[variant]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto w-full max-w-lg',
            'bg-card border-2 rounded-md p-6',
            styles.border,
            'border-l-4',
            styles.accentBorder,
            'animate-in zoom-in-95 duration-200',
            'shadow-2xl'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={cn('text-xs font-bold uppercase mono tracking-widest', styles.titleColor)}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-2"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            {children}
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-primary text-black font-bold text-xs mono uppercase tracking-wide rounded hover:bg-primary/90 transition-colors"
            >
              ACKNOWLEDGED
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
