import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CheckCircle, Lock, FileText, CreditCard, Truck } from 'lucide-react'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { format } from 'date-fns'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Confirmed: 'default',
  Closed: 'secondary',
}

export function PurchaseOrderDetailPage() {
  const { id } = useParams({ from: '/_app/purchase-orders/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)

  const { data: purchaseOrder, isLoading } = useQuery({
    queryKey: queryKeys.pos.detail(id),
    queryFn: () => purchaseOrderApi.get(id),
  })

  const { data: dispatchBalance } = useQuery({
    queryKey: queryKeys.pos.dispatchBalance(id),
    queryFn: () => purchaseOrderApi.getDispatchBalance(id),
    enabled: !!purchaseOrder && purchaseOrder.status === 'Confirmed',
  })

  const { data: invoiceBalance } = useQuery({
    queryKey: queryKeys.pos.invoiceBalance(id),
    queryFn: () => purchaseOrderApi.getInvoiceBalance(id),
    enabled: !!purchaseOrder && purchaseOrder.status === 'Confirmed',
  })

  const fullyDispatched = dispatchBalance != null && dispatchBalance.length > 0 && dispatchBalance.every(b => b.remainingQty <= 0)
  const fullyInvoiced = invoiceBalance != null && invoiceBalance.length > 0 && invoiceBalance.every(b => b.remainingQty <= 0)

  const confirmPO = useMutation({
    mutationFn: () => purchaseOrderApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.detail(id) })
      setConfirming(false)
    },
  })

  const closePO = useMutation({
    mutationFn: () => purchaseOrderApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.detail(id) })
      setClosing(false)
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

  if (!purchaseOrder) {
    return <div className="text-muted-foreground">Purchase Order not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={purchaseOrder.documentNumber}
        description={`Supplier: ${purchaseOrder.supplierName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[purchaseOrder.status]}>
              {purchaseOrder.status}
            </Badge>

            {purchaseOrder.status === 'Draft' && (
              <Button
                size="sm"
                onClick={() => setConfirming(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Confirm PO
              </Button>
            )}

            {purchaseOrder.status === 'Confirmed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClosing(true)}
              >
                <Lock className="mr-2 h-4 w-4" /> Close PO
              </Button>
            )}

            {role === 'Supplier' && purchaseOrder.status === 'Confirmed' && (
              <Button
                size="sm"
                disabled={fullyInvoiced}
                onClick={() => navigate({ to: '/proforma-invoices/new', search: { poId: id } })}
                title={fullyInvoiced ? 'All items fully invoiced' : undefined}
              >
                <FileText className="mr-2 h-4 w-4" /> {fullyInvoiced ? 'Fully Invoiced' : 'Create PI'}
              </Button>
            )}

            {role === 'Supplier' && purchaseOrder.status === 'Confirmed' && (
              <Button
                size="sm"
                variant="outline"
                disabled={fullyDispatched}
                onClick={() => navigate({ to: '/delivery-orders/new', search: { poId: id } })}
                title={fullyDispatched ? 'All items fully dispatched' : undefined}
              >
                <Truck className="mr-2 h-4 w-4" /> {fullyDispatched ? 'Fully Dispatched' : 'Create DO'}
              </Button>
            )}

            {role === 'Customer' && purchaseOrder.status === 'Confirmed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: '/payments/new', search: { poId: id } })}
              >
                <CreditCard className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/purchase-orders' })}
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
                  <Badge variant={statusColors[purchaseOrder.status]}>{purchaseOrder.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Supplier</p>
                  <p className="text-sm font-medium">{purchaseOrder.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{format(new Date(purchaseOrder.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {purchaseOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{purchaseOrder.notes}</p>
              </CardContent>
            </Card>
          )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentItemsTable
            mode="purchase-order"
            items={purchaseOrder.items.map((item) => ({
              id: item.id,
              name: item.supplierItemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              notes: item.notes,
              variants: item.variants?.map((v) => ({
                id: v.id,
                dimensionSummary: v.dimensionSummary,
                sku: v.sku,
                quantity: v.quantity,
                unitPrice: v.unitPrice,
              })),
            }))}
            emptyMessage="No items in this purchase order."
          />
        </CardContent>
        </Card>
        </div>

        {/* Right sidebar: 1 column */}
        <aside>
          <ThreadPanel
            threadId={`PurchaseOrder-${id}`}
            title={`PO ${purchaseOrder.documentNumber}`}
            canPostInternal={user?.role === 'Admin'}
          />
        </aside>
      </div>

      <AttachmentPanel entityType="PurchaseOrder" entityId={id} />

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open) setConfirming(false)
        }}
        title="Confirm Purchase Order"
        description="This will confirm the purchase order."
        confirmLabel="Confirm"
        onConfirm={() => confirmPO.mutate()}
        isLoading={confirmPO.isPending}
      />

      <ConfirmDialog
        open={closing}
        onOpenChange={(open) => {
          if (!open) setClosing(false)
        }}
        title="Close Purchase Order"
        description="This will close the purchase order."
        confirmLabel="Close"
        onConfirm={() => closePO.mutate()}
        isLoading={closePO.isPending}
      />

    </div>
  )
}
