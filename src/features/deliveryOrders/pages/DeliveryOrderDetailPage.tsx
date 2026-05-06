import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deliveryOrderApi } from '@/features/deliveryOrders/api/deliveryOrderApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Send, X, CheckCircle, Ticket, CreditCard } from 'lucide-react'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'outline',
  Dispatched: 'default',
  Delivered: 'secondary',
  Cancelled: 'destructive',
}

export function DeliveryOrderDetailPage() {
  const { id } = useParams({ from: '/_app/delivery-orders/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role

  const [dispatching, setDispatching] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const { data: deliveryOrder, isLoading } = useQuery({
    queryKey: queryKeys.deliveryOrders.detail(id),
    queryFn: () => deliveryOrderApi.get(id),
  })

  const dispatchDO = useMutation({
    mutationFn: () => deliveryOrderApi.dispatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryOrders.detail(id) })
      setDispatching(false)
    },
  })

  const deliverDO = useMutation({
    mutationFn: () => deliveryOrderApi.deliver(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryOrders.detail(id) })
      setDelivering(false)
    },
  })

  const cancelDO = useMutation({
    mutationFn: () => deliveryOrderApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryOrders.detail(id) })
      setCancelling(false)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!deliveryOrder) {
    return <div className="text-muted-foreground">Delivery Order not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={deliveryOrder.title}
        description={`Supplier: ${deliveryOrder.supplierName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[deliveryOrder.status]}>
              {deliveryOrder.status}
            </Badge>

            {/* Supplier actions */}
            {role === 'Supplier' && deliveryOrder.status === 'Pending' && (
              <Button
                size="sm"
                onClick={() => setDispatching(true)}
              >
                <Send className="mr-2 h-4 w-4" /> Dispatch
              </Button>
            )}

            {role === 'Supplier' && (deliveryOrder.status === 'Pending' || deliveryOrder.status === 'Dispatched') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelling(true)}
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}

            {/* Customer actions */}
            {role === 'Customer' && deliveryOrder.status === 'Dispatched' && (
              <Button
                size="sm"
                onClick={() => setDelivering(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Confirm Delivery
              </Button>
            )}

            {role === 'Customer' && (deliveryOrder.status === 'Dispatched' || deliveryOrder.status === 'Delivered') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: '/payments/new', search: { doId: id } })}
              >
                <CreditCard className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({
                to: '/tickets/new',
                search: {
                  entityType: 'DO',
                  entityId: deliveryOrder.id,
                  entityNumber: deliveryOrder.documentNumber,
                },
              })}
            >
              <Ticket className="mr-2 h-4 w-4" /> Create Ticket
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/delivery-orders' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Main content: 2 columns */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={statusColors[deliveryOrder.status]}>{deliveryOrder.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Supplier</p>
                  <p className="text-sm font-medium">{deliveryOrder.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{format(new Date(deliveryOrder.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {deliveryOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{deliveryOrder.notes}</p>
              </CardContent>
            </Card>
          )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-xs">Item Name</TableHead>
                  <TableHead className="text-right">Qty Dispatched</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryOrder.items.map((item) => {
                  const hasVariants = item.variants && item.variants.length > 0
                  if (hasVariants) {
                    return (
                      <>
                        <TableRow key={item.id} className="bg-muted/30">
                          <TableCell className="font-semibold text-sm" colSpan={2}>{item.supplierItemName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.notes ? <span className="line-clamp-1">{item.notes}</span> : '—'}
                          </TableCell>
                        </TableRow>
                        {item.variants!.map((v) => (
                          <TableRow key={v.id} className="border-b border-dashed">
                            <TableCell className="pl-8 text-sm text-muted-foreground">
                              {v.dimensionSummary || v.sku || v.supplierItemVariantId}
                            </TableCell>
                            <TableCell className="text-right text-sm">{v.quantity}</TableCell>
                            <TableCell />
                          </TableRow>
                        ))}
                      </>
                    )
                  }
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.supplierItemName}</TableCell>
                      <TableCell className="text-right">{item.quantityDispatched}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes ? <span className="line-clamp-1">{item.notes}</span> : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        </Card>
        </div>

        {/* Right sidebar: 1 column */}
        <aside>
          <ThreadPanel
            threadId={`DeliveryOrder-${id}`}
            title={`DO ${deliveryOrder.title}`}
            canPostInternal={user?.role === 'Admin'}
          />
        </aside>
      </div>

      <AttachmentPanel entityType="DeliveryOrder" entityId={id} />

      <ConfirmDialog
        open={dispatching}
        onOpenChange={(o) => { if (!o) setDispatching(false) }}
        title="Dispatch Delivery Order"
        description="Are you sure you want to dispatch this delivery order?"
        onConfirm={() => dispatchDO.mutate()}
        isLoading={dispatchDO.isPending}
      />

      <ConfirmDialog
        open={delivering}
        onOpenChange={(o) => { if (!o) setDelivering(false) }}
        title="Confirm Delivery"
        description="Are you sure you want to confirm delivery of this order?"
        onConfirm={() => deliverDO.mutate()}
        isLoading={deliverDO.isPending}
      />

      <ConfirmDialog
        open={cancelling}
        onOpenChange={(o) => { if (!o) setCancelling(false) }}
        title="Cancel Delivery Order"
        description="Are you sure you want to cancel this delivery order?"
        onConfirm={() => cancelDO.mutate()}
        isLoading={cancelDO.isPending}
      />
    </div>
  )
}
