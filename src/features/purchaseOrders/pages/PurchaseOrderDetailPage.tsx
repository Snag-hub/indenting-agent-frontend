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
import { ArrowLeft, CheckCircle, Lock, FileText, Pencil, Trash2 } from 'lucide-react'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { VoucherTotalsCard } from '@/components/VoucherTotalsCard'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { DetailPageContainer, DetailPageGrid, DetailPageMainColumn, DetailPageSidebar, DetailPageSummary } from '@/components/detail-page'
import { usePageTitle } from '@/hooks/usePageTitle'
import { format } from 'date-fns'

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
  const [deleting, setDeleting] = useState(false)

  const { data: po, isLoading } = useQuery({
    queryKey: queryKeys.pos.detail(id),
    queryFn: () => purchaseOrderApi.get(id),
  })

  usePageTitle(po?.documentNumber)

  const { data: invoiceBalance } = useQuery({
    queryKey: queryKeys.pos.invoiceBalance(id),
    queryFn: () => purchaseOrderApi.getInvoiceBalance(id),
    enabled: !!po && po.status === 'Confirmed',
  })

  const fullyInvoiced = invoiceBalance != null && invoiceBalance.length > 0 && invoiceBalance.every(b => b.remainingQty <= 0)

  const confirmPO = useMutation({
    mutationFn: () => purchaseOrderApi.confirm(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.pos.detail(id) }); setConfirming(false) },
  })
  const closePO = useMutation({
    mutationFn: () => purchaseOrderApi.close(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.pos.detail(id) }); setClosing(false) },
  })
  const deletePO = useMutation({
    mutationFn: () => purchaseOrderApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.pos.list() }); navigate({ to: '/purchase-orders' }) },
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!po) return <div className="text-muted-foreground">Purchase Order not found.</div>

  return (
    <DetailPageContainer>
      <PageHeader
        title={po.documentNumber}
        description={`Supplier: ${po.supplierName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[po.status]}>{po.status}</Badge>

            {role === 'Customer' && po.status === 'Draft' && (
              <>
                {po.source === 'Direct' && (
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: '/purchase-orders/new', search: { editId: id } })}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
                <Button size="sm" onClick={() => setConfirming(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Confirm &amp; Send
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleting(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </>
            )}
            {role === 'Customer' && po.status === 'Confirmed' && (
              <Button size="sm" variant="outline" onClick={() => setClosing(true)}>
                <Lock className="mr-2 h-4 w-4" /> Close PO
              </Button>
            )}
            {role === 'Supplier' && po.status === 'Confirmed' && (
              <Button size="sm" disabled={fullyInvoiced} onClick={() => navigate({ to: '/proforma-invoices/new', search: { poId: id } })} title={fullyInvoiced ? 'All items fully invoiced' : undefined}>
                <FileText className="mr-2 h-4 w-4" /> {fullyInvoiced ? 'Fully Invoiced' : 'Create PI'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/purchase-orders' })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <DetailPageGrid>
        <DetailPageMainColumn>
          <DetailPageSummary items={[
            { label: 'Status', value: <Badge variant={statusColors[po.status]}>{po.status}</Badge> },
            { label: 'Supplier', value: po.supplierName },
            { label: 'Created', value: format(new Date(po.createdAt), 'dd MMM yyyy') },
          ]} />

          {po.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm">{po.notes}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent>
              <DocumentItemsTable
                mode="purchase-order"
                currency={po.currency}
                items={po.items.map((item) => ({
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

          <VoucherTotalsCard totals={{
            subtotal: po.subtotal,
            discountAmount: po.discountAmount,
            discountPercent: po.discountPercent,
            taxAmount: po.taxAmount,
            shippingAmount: po.shippingAmount,
            totalAmount: po.totalAmount,
            currency: po.currency,
          }} />
        </DetailPageMainColumn>

        <DetailPageSidebar>
          <ThreadPanel
            threadId={`PurchaseOrder-${id}`}
            title={`PO ${po.documentNumber}`}
            canPostInternal={role === 'Admin'}
            disabledReason={po.status === 'Draft' ? 'Confirm this purchase order to unlock messaging.' : undefined}
          />
        </DetailPageSidebar>
      </DetailPageGrid>

      <AttachmentPanel entityType="PurchaseOrder" entityId={id} />

      <ConfirmDialog open={confirming} onOpenChange={(o) => { if (!o) setConfirming(false) }}
        title="Confirm & Send Purchase Order"
        description="This will confirm the purchase order and send it to the supplier. You will no longer be able to edit it."
        confirmLabel="Confirm & Send" onConfirm={() => confirmPO.mutate()} isLoading={confirmPO.isPending} />
      <ConfirmDialog open={closing} onOpenChange={(o) => { if (!o) setClosing(false) }}
        title="Close Purchase Order" description="This will close the purchase order."
        confirmLabel="Close" onConfirm={() => closePO.mutate()} isLoading={closePO.isPending} />
      <ConfirmDialog open={deleting} onOpenChange={(o) => { if (!o) setDeleting(false) }}
        title="Delete Purchase Order"
        description="This will permanently delete the purchase order. This action cannot be undone."
        confirmLabel="Delete" variant="destructive" onConfirm={() => deletePO.mutate()} isLoading={deletePO.isPending} />
    </DetailPageContainer>
  )
}
