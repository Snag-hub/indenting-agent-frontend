import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/features/audit/api/auditApi'
import { queryKeys } from '@/lib/queryKeys'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Clock, Plus, Pencil, Trash2, RefreshCw, CheckCircle, ArrowRightLeft,
} from 'lucide-react'

interface AuditTimelineProps {
  entityType: string
  entityId: string
  className?: string
}

const ACTION_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  Created:        { label: 'Created',         icon: Plus,           color: 'bg-green-100 text-green-700' },
  Updated:        { label: 'Updated',         icon: Pencil,         color: 'bg-blue-100 text-blue-700' },
  Deleted:        { label: 'Deleted',         icon: Trash2,         color: 'bg-red-100 text-red-700' },
  StatusChanged:  { label: 'Status Changed',  icon: ArrowRightLeft, color: 'bg-purple-100 text-purple-700' },
  Restored:       { label: 'Restored',        icon: RefreshCw,      color: 'bg-amber-100 text-amber-700' },
  Approved:       { label: 'Approved',        icon: CheckCircle,    color: 'bg-teal-100 text-teal-700' },
}

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, icon: Clock, color: 'bg-slate-100 text-slate-600' }
}

/**
 * Vertical timeline of all audit events for a single entity.
 * Admin-only — only mount this component when `user.role === 'Admin'`.
 */
export function AuditTimeline({ entityType, entityId, className }: AuditTimelineProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.auditLogs.entityHistory(entityType, entityId),
    queryFn: () => auditApi.getEntityHistory(entityType, entityId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className={cn('text-sm text-red-500', className)}>
        Failed to load audit history.
      </p>
    )
  }

  if (!data || data.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        No audit history found.
      </p>
    )
  }

  return (
    <ol className={cn('relative border-l border-slate-200 space-y-6 pl-6', className)}>
      {data.map((entry) => {
        const { label, icon: Icon, color } = getActionMeta(entry.action)
        return (
          <li key={entry.id} className="relative">
            {/* Timeline dot */}
            <span
              className={cn(
                'absolute -left-[1.625rem] top-0.5 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white',
                color
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-xs font-medium', color)}>
                  {label}
                </Badge>
                <span
                  className="text-xs text-muted-foreground"
                  title={format(new Date(entry.changedAt), 'PPpp')}
                >
                  {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                </span>
              </div>

              {/* Show old → new for status changes / updates */}
              {entry.oldValue && entry.newValue && (
                <p className="text-xs text-slate-600">
                  <span className="line-through text-slate-400">{entry.oldValue}</span>
                  {' → '}
                  <span className="font-medium">{entry.newValue}</span>
                </p>
              )}
              {!entry.oldValue && entry.newValue && (
                <p className="text-xs text-slate-600">{entry.newValue}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
