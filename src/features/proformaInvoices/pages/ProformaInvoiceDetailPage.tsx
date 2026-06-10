import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { proformaInvoiceApi } from '@/features/proformaInvoices/api/proformaInvoiceApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Send, X, CheckCircle, Truck, Ticket, CreditCard } from 'lucide-react'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { VoucherTotalsCard } from '@/components/VoucherTotalsCard'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { DetailPageContainer, DetailPageGrid, DetailPageMainColumn, DetailPageSidebar, DetailPageSummary } from '@/components/detail-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePageTitle } from '@/hooks/usePageTitle'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Sent: 'default',
  Acknowledged: 'secondary',
  Cancelled: 'destructive',
}

export function ProformaInvoiceDetailPage() {
  const { id } = useParams({ from: '/_app/proforma-invoices/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role
  const [sending, setSending] = useState(false)
  const [acknowledging, setAcknowledging] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const { data: pi, isLoading } = useQuery({
    queryKey: queryKeys.proformaInvoices.detail(id),
    queryFn: () => proformaInvoiceApi.get(id),
  })

  usePageTitle(pi?.documentNumber)

  const sendPI = useMutation({
    mutationFn: () => proformaInvoiceApi.send(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.proformaInvoices.detail(id) }); setSending(false) },
  })
  const acknowledgePI = useMutation({
    mutationFn: () => proformaInvoiceApi.acknowledge(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.proformaInvoices.detail(id) }); setAcknowledging(false) },
  })
  const cancelPI = useMutation({
    mutationFn: () => proformaInvoiceApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.proformaInvoices.detail(id) }); setCancelling(false) },
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )

  if (!pi) return <div className="text-muted-foreground">Proforma Invoice not found.</div>

  return (
    <DetailPageContainer>
      <PageHeader
        title={pi.documentNumber}
        description={`Supplier: ${pi.supplierName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[pi.status]}>{pi.status}</Badge>

            {role === 'Supplier' && pi.status === 'Draft' && (
              <Button size="sm" onClick={() => setSending(true)}>
                <Send className="mr-2 h-4 w-4" /> Send PI
              </Button>
            )}
            {role === 'Supplier' && (pi.status === 'Draft' || pi.status === 'Sent') && (
              <Button size="sm" variant="outline" onClick={() => setCancelling(true)}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
            {role === 'Supplier' && (pi.status === 'Sent' || pi.status === 'Acknowledged') && (
              <Button size="sm" onClick={() => navigate({ to: '/delivery-orders/new', search: { piId: pi.id } })}>
                <Truck className="mr-2 h-4 w-4" /> Create DO
              </Button>
            )}
            {role === 'Customer' && pi.status === 'Sent' && (
              <Button size="sm" onClick={() => setAcknowledging(true)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge
              </Button>
            )}
            {role === 'Customer' && (pi.status === 'Sent' || pi.status === 'Acknowledged') && (
              <Button size="sm" variant="outline" onClick={() => navigate({ to: '/payments/new', search: { piId: id } })}>
                <CreditCard className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/tickets/new', search: { entityType: 'PI', entityId: pi.id, entityNumber: pi.documentNumber } })}>
              <Ticket className="mr-2 h-4 w-4" /> Create Ticket
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/proforma-invoices' })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <DetailPageGrid>
        <DetailPageMainColumn>
          <DetailPageSummary items={[
            { label: 'Document #', value: <span className="font-mono">{pi.documentNumber || '—'}</span> },
            { label: 'Status', value: <Badge variant={statusColors[pi.status]}>{pi.status}</Badge> },
            { label: 'Supplier', value: pi.supplierName },
            { label: 'Created', value: format(new Date(pi.createdAt), 'dd MMM yyyy') },
          ]} columns={4} />

          {pi.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm">{pi.notes}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent>
              <DocumentItemsTable
                mode="proforma-invoice"
                items={pi.items.map((item) => ({
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
                emptyMessage="No items in this proforma invoice."
              />
            </CardContent>
          </Card>

          <VoucherTotalsCard totals={{
            subtotal: pi.subtotal,
            discountAmount: pi.discountAmount,
            discountPercent: pi.discountPercent,
            taxAmount: pi.taxAmount,
            shippingAmount: pi.shippingAmount,
            totalAmount: pi.totalAmount,
            currency: pi.currency,
          }} />
        </DetailPageMainColumn>

        <DetailPageSidebar>
          <ThreadPanel
            threadId={`ProformaInvoice-${id}`}
            title={`PI ${pi.documentNumber}`}
            canPostInternal={role === 'Admin'}
            disabledReason={pi.status === 'Draft' ? 'Submit this proforma invoice to unlock messaging.' : undefined}
          />
        </DetailPageSidebar>
      </DetailPageGrid>

      <AttachmentPanel entityType="ProformaInvoice" entityId={id} />

      <ConfirmDialog open={sending} onOpenChange={(o) => { if (!o) setSending(false) }}
        title="Send Proforma Invoice" description="Are you sure you want to send this proforma invoice?"
        onConfirm={() => sendPI.mutate()} isLoading={sendPI.isPending} />
      <ConfirmDialog open={acknowledging} onOpenChange={(o) => { if (!o) setAcknowledging(false) }}
        title="Acknowledge Proforma Invoice" description="Are you sure you want to acknowledge this proforma invoice?"
        onConfirm={() => acknowledgePI.mutate()} isLoading={acknowledgePI.isPending} />
      <ConfirmDialog open={cancelling} onOpenChange={(o) => { if (!o) setCancelling(false) }}
        title="Cancel Proforma Invoice" description="Are you sure you want to cancel this proforma invoice?"
        onConfirm={() => cancelPI.mutate()} isLoading={cancelPI.isPending} />
    </DetailPageContainer>
  )
}
