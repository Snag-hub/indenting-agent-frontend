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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Send, X, CheckCircle, Truck, Ticket } from 'lucide-react'
import { format } from 'date-fns'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

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

  const sendPI = useMutation({
    mutationFn: () => proformaInvoiceApi.send(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.proformaInvoices.detail(id) })
      setSending(false)
    },
  })

  const acknowledgePI = useMutation({
    mutationFn: () => proformaInvoiceApi.acknowledge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.proformaInvoices.detail(id) })
      setAcknowledging(false)
    },
  })

  const cancelPI = useMutation({
    mutationFn: () => proformaInvoiceApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.proformaInvoices.detail(id) })
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

  if (!pi) {
    return <div className="text-muted-foreground">Proforma Invoice not found.</div>
  }

  const totalPrice = pi.items.reduce((sum, item) => sum + item.totalPrice, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={pi.title}
        description={`Supplier: ${pi.supplierName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[pi.status]}>
              {pi.status}
            </Badge>

            {/* Supplier actions */}
            {role === 'Supplier' && pi.status === 'Draft' && (
              <Button
                size="sm"
                onClick={() => setSending(true)}
              >
                <Send className="mr-2 h-4 w-4" /> Send PI
              </Button>
            )}

            {role === 'Supplier' && (pi.status === 'Draft' || pi.status === 'Sent') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelling(true)}
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}

            {role === 'Supplier' && pi.status === 'Acknowledged' && (
              <Button
                size="sm"
                onClick={() => navigate({ to: '/delivery-orders/new', search: { poId: pi.purchaseOrderId, piId: pi.id } })}
              >
                <Truck className="mr-2 h-4 w-4" /> Create DO
              </Button>
            )}

            {/* Customer actions */}
            {role === 'Customer' && pi.status === 'Sent' && (
              <Button
                size="sm"
                onClick={() => setAcknowledging(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Acknowledge
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({
                to: '/tickets/new',
                search: {
                  entityType: 'PI',
                  entityId: pi.id,
                  entityNumber: pi.documentNumber,
                },
              })}
            >
              <Ticket className="mr-2 h-4 w-4" /> Create Ticket
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/proforma-invoices' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={statusColors[pi.status]}>{pi.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Supplier</p>
              <p className="text-sm font-medium">{pi.supplierName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{format(new Date(pi.createdAt), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {pi.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{pi.notes}</p>
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
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pi.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.supplierItemName}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.notes ? <span className="line-clamp-1">{item.notes}</span> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell colSpan={3} className="text-right pr-4">
                    Total:
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totalPrice)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={sending}
        onOpenChange={(o) => { if (!o) setSending(false) }}
        title="Send Proforma Invoice"
        description="Are you sure you want to send this proforma invoice?"
        onConfirm={() => sendPI.mutate()}
        isLoading={sendPI.isPending}
      />

      <ConfirmDialog
        open={acknowledging}
        onOpenChange={(o) => { if (!o) setAcknowledging(false) }}
        title="Acknowledge Proforma Invoice"
        description="Are you sure you want to acknowledge this proforma invoice?"
        onConfirm={() => acknowledgePI.mutate()}
        isLoading={acknowledgePI.isPending}
      />

      <ConfirmDialog
        open={cancelling}
        onOpenChange={(o) => { if (!o) setCancelling(false) }}
        title="Cancel Proforma Invoice"
        description="Are you sure you want to cancel this proforma invoice?"
        onConfirm={() => cancelPI.mutate()}
        isLoading={cancelPI.isPending}
      />
    </div>
  )
}
