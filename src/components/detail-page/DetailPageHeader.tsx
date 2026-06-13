import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

interface DetailPageHeaderProps {
  title: string
  description?: ReactNode
  status?: string
  /** Role-based action buttons rendered to the right of the status badge. */
  actions?: ReactNode
  /** Called when the back arrow is clicked. If omitted, arrow is hidden. */
  onBack?: () => void
  /** Label shown next to the back arrow. Defaults to "Back". */
  backLabel?: string
  className?: string
}

export function DetailPageHeader({
  title,
  description,
  status,
  actions,
  onBack,
  backLabel = 'Back',
  className,
}: DetailPageHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-1 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {backLabel}
        </Button>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {status && <StatusBadge status={status} />}
          {actions}
        </div>
      </div>
    </div>
  )
}
