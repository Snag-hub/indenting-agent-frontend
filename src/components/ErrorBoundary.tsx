import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /** Optional custom fallback — rendered instead of the default error card. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * React class-based error boundary.
 *
 * Catches unhandled render/lifecycle errors in its subtree and shows a
 * friendly recovery UI instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 *
 * With custom fallback:
 *   <ErrorBoundary fallback={(err, reset) => <MyFallback error={err} onRetry={reset} />}>
 *     <SomePage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production you'd forward to Sentry / Datadog here.
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (fallback) return fallback(error, this.reset)
      return <DefaultErrorFallback error={error} onReset={this.reset} />
    }

    return children
  }
}

function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Something went wrong</h2>
      <p className="text-sm text-slate-500 mb-2 max-w-md">
        An unexpected error occurred while rendering this page.
      </p>
      {import.meta.env.DEV && (
        <p className="text-xs font-mono text-red-600 bg-red-50 rounded px-3 py-2 mb-4 max-w-lg break-all">
          {error.message}
        </p>
      )}
      <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
