import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationApi } from '@/features/notifications/api/notificationApi'
import { queryKeys } from '@/lib/queryKeys'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Store } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface PartyNotificationsTabProps {
  customerId?: string
  supplierId?: string
}

function CreatorChip({ name, role }: { name?: string; role?: string }) {
  if (!name) return null
  const isCustomer = role === 'Customer'
  const isSupplier = role === 'Supplier'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        isCustomer && 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
        isSupplier && 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        !isCustomer && !isSupplier && 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
      )}
    >
      {isCustomer && <Building2 className="h-3 w-3" />}
      {isSupplier && <Store className="h-3 w-3" />}
      {name}
    </span>
  )
}

/**
 * Read-only tab showing notifications filtered to a specific customer or supplier.
 * Used inside CustomerDetailPage and SupplierDetailPage for Admin users.
 */
export function PartyNotificationsTab({ customerId, supplierId }: PartyNotificationsTabProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list({ customerId, supplierId, page }),
    queryFn: () => notificationApi.list(page, 20, false, true, customerId, supplierId),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  if (!data?.data.length) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        No notifications for this party yet.
      </p>
    )
  }

  const totalPages = Math.ceil((data.totalCount ?? 0) / 20)

  return (
    <div className="space-y-3">
      {data.data.map((n) => (
        <Card
          key={n.id}
          className={cn(!n.isRead && n.status !== 'Cleared' ? 'bg-blue-50 border-blue-200' : '')}
        >
          <CardContent className="p-4 space-y-1.5">
            <p className={cn('text-sm', !n.isRead ? 'font-semibold text-slate-900' : 'text-slate-700')}>
              {n.message}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {n.createdByName && (
                <CreatorChip name={n.createdByName} role={n.createdByRole} />
              )}
              {n.entityType && (
                <Badge variant="outline" className="text-xs">{n.entityType}</Badge>
              )}
              {n.status === 'Cleared' && (
                <Badge variant="secondary" className="text-xs">Cleared</Badge>
              )}
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
