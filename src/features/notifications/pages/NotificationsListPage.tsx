import { useEffect, useRef } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { notificationApi, type NotificationDto } from '@/features/notifications/api/notificationApi'
import { customerApi } from '@/features/accounts/api/customerApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, CheckCheck, Loader2, Building2, Store } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const NOTIFICATION_ENTITY_TYPES = [
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

export function NotificationsListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'
  const isSupplier = user?.role === 'Supplier'
  const isCustomer = user?.role === 'Customer'
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [unreadOnly, setUnreadOnly] = useState(false)
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [partyType, setPartyType] = useState<'all' | 'customer' | 'supplier'>('all')
  const [partyId, setPartyId] = useState<string>('all')

  const { data: customersData } = useQuery({
    queryKey: queryKeys.customers.list({ page: 1, pageSize: 100 }),
    queryFn: () => customerApi.list({ page: 1, pageSize: 100 }),
    enabled: isAdmin || isSupplier,
  })
  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.suppliers.list({ page: 1, pageSize: 100 }),
    queryFn: () => supplierApi.list({ page: 1, pageSize: 100 }),
    enabled: isAdmin || isCustomer,
  })

  const resolvedCustomerId =
    partyId !== 'all' && (partyType === 'customer' || isSupplier) ? partyId : undefined
  const resolvedSupplierId =
    partyId !== 'all' && (partyType === 'supplier' || isCustomer) ? partyId : undefined

  const resolvedEntityType = entityTypeFilter !== 'all' ? entityTypeFilter : undefined

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite({ unreadOnly, resolvedEntityType, resolvedCustomerId, resolvedSupplierId }),
    queryFn: ({ pageParam }) =>
      notificationApi.list(pageParam as number, 20, unreadOnly, true, resolvedEntityType, resolvedCustomerId, resolvedSupplierId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalCount / lastPage.pageSize)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
  })

  const notifications = data?.pages.flatMap((p) => p.data) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.notifications.infinite() }) },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.notifications.infinite() }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.infinite() })
      setSelectedIds(new Set())
    },
  })

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(notifications.map((n) => n.id)))
  }

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) await deleteMutation.mutateAsync(id)
  }

  const handleNotificationClick = (notification: NotificationDto) => {
    if (!notification.isRead) markAsReadMutation.mutate(notification.id)
    const route = notification.entityType ? ENTITY_ROUTES[notification.entityType] : undefined
    if (route && notification.entityId)
      navigate({ to: route, params: { id: notification.entityId } })
  }

  const handlePartyTypeChange = (value: string) => {
    setPartyType(value as 'all' | 'customer' | 'supplier')
    setPartyId('all')
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`Complete history of your notifications. ${totalCount > 0 ? `${totalCount} total — ` : ''}Items are automatically removed after 30 days.`}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => setUnreadOnly(!unreadOnly)}
            size="sm"
          >
            {unreadOnly ? 'Showing Unread' : 'Show Unread Only'}
          </Button>

          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_ENTITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Marking...</>
              ) : (
                <><CheckCheck className="h-4 w-4 mr-2" />Mark All as Read</>
              )}
            </Button>
          )}

          {/* Admin: two-level party picker */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Select value={partyType} onValueChange={handlePartyTypeChange}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  <SelectItem value="customer">By Customer</SelectItem>
                  <SelectItem value="supplier">By Supplier</SelectItem>
                </SelectContent>
              </Select>

              {partyType === 'customer' && (
                <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
                  <SelectTrigger className="h-9 w-48">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customersData?.data.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {partyType === 'supplier' && (
                <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
                  <SelectTrigger className="h-9 w-48">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliersData?.data.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Supplier: single customer picker */}
          {isSupplier && (
            <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customersData?.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Customer: single supplier picker */}
          {isCustomer && (
            <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliersData?.data.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      {notifications.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Checkbox
              checked={selectedIds.size === notifications.length && notifications.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium text-slate-600">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all (${notifications.length} loaded)`}
            </span>
          </div>

          {notifications.map((notification) => {
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
                      <div className="flex-1 space-y-1.5">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {notification.entityDocumentNumber && (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 ring-1 ring-slate-300">
                              {notification.entityDocumentNumber}
                            </span>
                          )}
                          {notification.createdByName && (
                            <CreatorChip name={notification.createdByName} role={notification.createdByRole} />
                          )}
                          {notification.entityType && (
                            <Badge variant="outline" className="text-xs">{notification.entityType}</Badge>
                          )}
                          {isCleared && <Badge variant="secondary" className="text-xs">Cleared</Badge>}
                          {!notification.isRead && !isCleared && (
                            <Badge variant="default" className="text-xs bg-blue-600">New</Badge>
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
                        variant="ghost" size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => deleteMutation.mutate(notification.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-4 flex justify-center">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!hasNextPage && notifications.length > 0 && (
          <p className="text-xs text-slate-400">All notifications loaded</p>
        )}
      </div>
    </div>
  )
}
