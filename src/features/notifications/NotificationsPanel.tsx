import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { notificationApi, type NotificationDto } from '@/features/notifications/api/notificationApi'
import { customerApi } from '@/features/accounts/api/customerApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { queryKeys } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Building2, CheckCheck, Loader2, SlidersHorizontal, Store, Trash2, X } from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import { cn } from '@/lib/utils'

const DRAWER_ENTITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'Enquiry', label: 'Enquiries' },
  { value: 'RFQ', label: 'RFQs' },
  { value: 'Quotation', label: 'Quotations' },
  { value: 'PurchaseOrder', label: 'Purchase Orders' },
  { value: 'ProformaInvoice', label: 'Proforma Invoices' },
  { value: 'DeliveryOrder', label: 'Delivery Orders' },
  { value: 'Payment', label: 'Payments' },
  { value: 'Ticket', label: 'Tickets' },
]

/** Compact chip showing who triggered the notification */
function CreatorChip({ name, role }: { name?: string; role?: string }) {
  if (!name) return null
  const isCustomer = role === 'Customer'
  const isSupplier = role === 'Supplier'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
        isCustomer && 'bg-blue-50 text-blue-700',
        isSupplier && 'bg-amber-50 text-amber-700',
        !isCustomer && !isSupplier && 'bg-slate-100 text-slate-500',
      )}
    >
      {isCustomer && <Building2 className="h-2.5 w-2.5" />}
      {isSupplier && <Store className="h-2.5 w-2.5" />}
      {name}
    </span>
  )
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function groupNotificationsByDate(notifications: NotificationDto[]) {
  const today: NotificationDto[] = []
  const yesterday: NotificationDto[] = []
  const thisWeek: NotificationDto[] = []
  const older: NotificationDto[] = []

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt)
    if (isToday(date)) {
      today.push(notification)
    } else if (isYesterday(date)) {
      yesterday.push(notification)
    } else if (isThisWeek(date)) {
      thisWeek.push(notification)
    } else {
      older.push(notification)
    }
  })

  return [
    { label: 'Today', notifications: today },
    { label: 'Yesterday', notifications: yesterday },
    { label: 'This Week', notifications: thisWeek },
    { label: 'Older', notifications: older },
  ].filter((group) => group.notifications.length > 0)
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { unreadCount, setUnreadCount, decrement } = useNotificationStore()
  const [swipeStates, setSwipeStates] = useState<Record<string, number>>({})
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [partyId, setPartyId] = useState('all')
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'Admin'
  const isSupplier = user?.role === 'Supplier'
  const isCustomer = user?.role === 'Customer'

  const { data: customersData } = useQuery({
    queryKey: queryKeys.customers.list({ page: 1, pageSize: 100 }),
    queryFn: () => customerApi.list({ page: 1, pageSize: 100 }),
    enabled: isOpen && (isAdmin || isSupplier),
  })
  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.suppliers.list({ page: 1, pageSize: 100 }),
    queryFn: () => supplierApi.list({ page: 1, pageSize: 100 }),
    enabled: isOpen && (isAdmin || isCustomer),
  })

  const resolvedEntityType = entityTypeFilter !== 'all' ? entityTypeFilter : undefined
  const resolvedCustomerId = partyId !== 'all' && (isAdmin || isSupplier) ? partyId : undefined
  const resolvedSupplierId = partyId !== 'all' && isCustomer ? partyId : undefined

  const hasActiveFilters = unreadOnly || entityTypeFilter !== 'all' || partyId !== 'all'

  const clearFilters = () => {
    setUnreadOnly(false)
    setEntityTypeFilter('all')
    setPartyId('all')
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite({ drawer: true, unreadOnly, resolvedEntityType, resolvedCustomerId, resolvedSupplierId }),
    queryFn: ({ pageParam }) => notificationApi.list(pageParam as number, 20, unreadOnly, false, resolvedEntityType, resolvedCustomerId, resolvedSupplierId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalCount / lastPage.pageSize)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
    enabled: isOpen,
  })

  useEffect(() => {
    const sentinel = sentinelRef.current
    const scrollEl = scrollRef.current
    if (!sentinel || !scrollEl) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: scrollEl, rootMargin: '150px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      // Decrement badge atomically — the notification just moved from Unread → Read.
      decrement()
      qc.invalidateQueries({ queryKey: ['notifications', 'infinite'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'infinite'] })
      setUnreadCount(0)
    },
  })

  const deleteNotification = useMutation({
    mutationFn: (id: string) => {
      // Capture unread status at call time, before the query list potentially changes.
      const wasUnread = !notifications.find((n) => n.id === id)?.isRead
      return notificationApi.delete(id).then(() => ({ wasUnread }))
    },
    onSuccess: (data) => {
      // Use atomic decrement() to avoid stale-closure races on unreadCount.
      if (data.wasUnread) {
        decrement()
      }
      qc.invalidateQueries({ queryKey: ['notifications', 'infinite'] })
    },
    onError: () => {
      // Refetch the authoritative count to correct any optimistic state.
      qc.invalidateQueries({ queryKey: ['notifications', 'infinite'] })
    },
  })

  const clearAll = useMutation({
    mutationFn: () => notificationApi.clearAll(),
    onSuccess: () => {
      setUnreadCount(0)
      qc.invalidateQueries({ queryKey: ['notifications', 'infinite'] })
    },
    onError: () => {
      // Re-fetch authoritative count so the badge is not stuck at 0.
      notificationApi.getUnreadCount().then(setUnreadCount).catch(() => {})
      qc.invalidateQueries({ queryKey: ['notifications', 'infinite'] })
    },
  })


  const notifications = data?.pages.flatMap((p) => p.data) ?? []
  // Use the store's authoritative count (kept in sync by useSignalR + mutations)
  // rather than counting from the current page slice, which may not include all notifications.
  const groupedNotifications = groupNotificationsByDate(notifications)

  const handleNotificationClick = (notification: NotificationDto) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id)
    }

    // Navigate based on entityType
    if (notification.entityType && notification.entityId) {
      const routes: Record<string, string> = {
        'Enquiry': '/enquiries/$id',
        'RFQ': '/rfqs/$id',
        'Quotation': '/quotations/$id',
        'PurchaseOrder': '/purchase-orders/$id',
        'ProformaInvoice': '/proforma-invoices/$id',
        'DeliveryOrder': '/delivery-orders/$id',
        'Payment': '/payments/$id',
        'Ticket': '/tickets/$id',
      }

      const route = routes[notification.entityType]
      if (route) {
        navigate({ to: route, params: { id: notification.entityId } })
        onClose()
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0]
    setSwipeStates((prev) => ({
      ...prev,
      [notificationId]: touch.clientX,
    }))
  }

  const handleTouchMove = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0]
    const startX = swipeStates[notificationId] ?? 0
    const diff = startX - touch.clientX

    // Update swipe state with current position (negative values = swiping left)
    if (diff > 0) {
      setSwipeStates((prev) => ({
        ...prev,
        [notificationId]: -diff, // Negative value indicates swiping
      }))
    }
  }

  const handleTouchEnd = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.changedTouches[0]
    const startX = Math.abs(swipeStates[notificationId] ?? 0)
    const endX = touch.clientX
    const diff = startX - endX

    // Swiped left more than 50px - delete notification
    if (diff > 50) {
      deleteNotification.mutate(notificationId)
    }

    // Clear swipe state
    setSwipeStates((prev) => {
      const newState = { ...prev }
      delete newState[notificationId]
      return newState
    })
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Always-visible header bar */}
      <div className="p-3 border-b bg-slate-50 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">
            {unreadCount > 0 ? `${unreadCount} unread` : 'Notifications'}
            {hasActiveFilters && <span className="ml-1.5 text-xs font-normal text-blue-600">(filtered)</span>}
          </span>
          <div className="flex items-center gap-1">
            <p className="text-xs text-slate-500 hidden sm:block">Swipe left to dismiss</p>
            <Button
              variant={showFilters ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowFilters((v) => !v)}
              title="Filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Collapsible filter row */}
        {showFilters && (
          <div className="space-y-2 pt-1">
            {/* Unread only + entity type */}
            <div className="flex gap-2">
              <Button
                variant={unreadOnly ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs shrink-0"
                onClick={() => setUnreadOnly((v) => !v)}
              >
                Unread only
              </Button>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAWER_ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Party filter — role-aware */}
            {(isAdmin || isSupplier) && (
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder={isAdmin ? 'Filter by customer' : 'All Customers'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Customers</SelectItem>
                  {customersData?.data.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isCustomer && (
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Suppliers</SelectItem>
                  {suppliersData?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        )}

        {/* Action buttons — only show when there's something to act on */}
        {notifications.length > 0 && (
          <div className="flex gap-2 pt-1">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex-1 h-8 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearAllDialogOpen(true)}
              className="flex-1 h-8 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear drawer
            </Button>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No notifications</div>
        ) : (
          <div>
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                {/* Date Group Header */}
                <div className="sticky top-0 bg-slate-100 px-4 py-2 z-10 border-b">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {group.label}
                  </p>
                </div>

                {/* Notifications in group */}
                {group.notifications.map((notification) => {
                  const swipeAmount = swipeStates[notification.id] ?? 0
                  const isSwiping = swipeAmount < 0
                  return (
                    <div
                      key={notification.id}
                      className="relative overflow-hidden bg-white border-b"
                      onTouchStart={(e) => handleTouchStart(e, notification.id)}
                      onTouchMove={(e) => handleTouchMove(e, notification.id)}
                      onTouchEnd={(e) => handleTouchEnd(e, notification.id)}
                    >
                      {/* Swipe background (delete action) - only show when swiping */}
                      {isSwiping && (
                        <div className="absolute inset-y-0 right-0 bg-red-500 flex items-center justify-center w-20">
                          <Trash2 className="h-4 w-4 text-white" />
                        </div>
                      )}

                      {/* Main notification content */}
                      <div
                        className={cn(
                          'relative px-4 py-3 cursor-pointer transition-all border-b',
                          !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                        )}
                        style={{
                          transform: isSwiping ? `translateX(${swipeAmount * 0.3}px)` : 'translateX(0)',
                          transition: !isSwiping ? 'transform 0.2s ease-out' : 'none',
                        }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm line-clamp-3',
                              !notification.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                            )}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {notification.entityDocumentNumber && (
                                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 ring-1 ring-slate-300">
                                  {notification.entityDocumentNumber}
                                </span>
                              )}
                              {notification.createdByName && (
                                <CreatorChip
                                  name={notification.createdByName}
                                  role={notification.createdByRole}
                                />
                              )}
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification.mutate(notification.id)
                              }}
                              disabled={deleteNotification.isPending}
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="py-3 flex justify-center">
          {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!hasNextPage && notifications.length > 0 && (
            <p className="text-xs text-slate-400 py-1">All caught up</p>
          )}
        </div>
      </div>

      {/* Clear All Confirmation Dialog */}
      <ConfirmDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title="Clear All Notifications"
        description="Dismiss every notification in this drawer. They stay in the database for 30 days for audit and will then be automatically deleted."
        confirmLabel="Clear All"
        isLoading={clearAll.isPending}
        variant="default"
        onConfirm={() => {
          clearAll.mutate(undefined, {
            onSettled: () => {
              setClearAllDialogOpen(false)
            },
          })
        }}
      />
    </div>
  )
}
