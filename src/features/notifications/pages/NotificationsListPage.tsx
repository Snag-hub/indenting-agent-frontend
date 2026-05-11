import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { notificationApi, type NotificationDto } from '@/features/notifications/api/notificationApi'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, CheckCheck, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const QUERY_KEY = ['notifications', 'list']

const ENTITY_ROUTES: Record<string, string> = {
  'Enquiry': '/enquiries/$id',
  'RFQ': '/rfqs/$id',
  'Quotation': '/quotations/$id',
  'PurchaseOrder': '/purchase-orders/$id',
  'ProformaInvoice': '/proforma-invoices/$id',
  'DeliveryOrder': '/delivery-orders/$id',
  'Payment': '/payments/$id',
  'Ticket': '/tickets/$id',
}

export function NotificationsListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // includeCleared=true → full 30-day history (Unread + Read + Cleared).
  // Soft-deleted rows are still hidden; they're physically removed by the daily cleanup job
  // (CleanupOldNotificationsJob, runs 03:15 UTC, retention 30 days).
  const { data: notifications, isLoading, isFetching } = useQuery({
    queryKey: [...QUERY_KEY, page, unreadOnly, 'includeCleared'],
    queryFn: () => notificationApi.list(page, 20, unreadOnly, /* includeCleared */ true),
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      setSelectedIds(new Set())
    },
  })

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === notifications?.data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications?.data.map(n => n.id) || []))
    }
  }

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleNotificationClick = (notification: NotificationDto) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id)
    }
    const route = notification.entityType ? ENTITY_ROUTES[notification.entityType] : undefined
    if (route && notification.entityId) {
      navigate({ to: route, params: { id: notification.entityId } })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil((notifications?.totalCount ?? 0) / 20)
  const unreadCount = notifications?.data.filter(n => !n.isRead).length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Complete history of your notifications, including cleared ones. Items are automatically removed after 30 days."
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => {
              setUnreadOnly(!unreadOnly)
              setPage(1)
            }}
            size="sm"
          >
            {unreadOnly ? 'Showing Unread' : 'Show Unread Only'}
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All as Read
                </>
              )}
            </Button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {selectedIds.size}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications?.data && notifications.data.length > 0 ? (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Checkbox
              checked={selectedIds.size === notifications.data.length && notifications.data.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium text-slate-600">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all on this page'}
            </span>
          </div>

          {/* Notification items */}
          {notifications.data.map((notification) => {
            const isCleared = notification.status === 'Cleared'
            return (
            <Card
              key={notification.id}
              className={cn(
                'transition-colors',
                isCleared
                  ? 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                  : !notification.isRead
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-slate-50',
                notification.entityType && ENTITY_ROUTES[notification.entityType] && notification.entityId
                  ? 'cursor-pointer'
                  : 'cursor-default'
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <Checkbox
                  checked={selectedIds.has(notification.id)}
                  onCheckedChange={() => handleToggleSelect(notification.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={cn(
                        'text-sm',
                        isCleared
                          ? 'text-slate-500 line-through decoration-slate-400/60'
                          : !notification.isRead
                            ? 'font-semibold text-slate-900'
                            : 'text-slate-700'
                      )}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {notification.entityType && (
                          <Badge variant="outline" className="text-xs">
                            {notification.entityType}
                          </Badge>
                        )}
                        {isCleared && (
                          <Badge variant="secondary" className="text-xs">
                            Cleared
                          </Badge>
                        )}
                        {!notification.isRead && !isCleared && (
                          <Badge variant="default" className="text-xs bg-blue-600">
                            New
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!notification.isRead && !isCleared && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      disabled={markAsReadMutation.isPending}
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(notification.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-center text-slate-500">
              {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages} ({notifications?.totalCount} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
