import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { paymentApi } from '@/features/payments/api/paymentApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Check, X, Ticket } from 'lucide-react'
import { format } from 'date-fns'
import { AttachmentPanel } from '@/components/AttachmentPanel'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'outline',
  Confirmed: 'default',
  Rejected: 'destructive',
}

export function PaymentDetailPage() {
  const { id } = useParams({ from: '/_app/payments/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role

  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const { data: payment, isLoading } = useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: () => paymentApi.get(id),
  })

  const confirmPayment = useMutation({
    mutationFn: () => paymentApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.detail(id) })
      setConfirming(false)
    },
  })

  const rejectPayment = useMutation({
    mutationFn: () => paymentApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.detail(id) })
      setRejecting(false)
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

  if (!payment) {
    return <div className="text-muted-foreground">Payment not found.</div>
  }

  const isSupplierOrAdmin = role === 'Supplier' || role === 'Admin'
  const canConfirm = isSupplierOrAdmin && payment.status === 'Pending'
  const canReject = isSupplierOrAdmin && payment.status === 'Pending'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payment #${payment.referenceNumber}`}
        description={`Supplier: ${payment.supplierName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[payment.status]}>
              {payment.status}
            </Badge>

            {canConfirm && (
              <Button
                size="sm"
                onClick={() => setConfirming(true)}
              >
                <Check className="mr-2 h-4 w-4" /> Confirm
              </Button>
            )}

            {canReject && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejecting(true)}
              >
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/tickets/new', search: { entityType: 'Payment', entityId: payment.id, entityNumber: payment.referenceNumber } })}
            >
              <Ticket className="mr-2 h-4 w-4" /> Create Ticket
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/payments' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={statusColors[payment.status]}>{payment.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Reference #</p>
              <p className="text-sm font-mono font-medium">{payment.referenceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Amount</p>
              <p className="text-sm font-medium">
                {formatCurrency(payment.amount)} {payment.currency}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
              <p className="text-sm font-medium">{payment.paymentMethod}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Supplier</p>
              <p className="text-sm font-medium">{payment.supplierName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="text-sm">{format(new Date(payment.createdAt), 'dd MMM yyyy')}</p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-xs text-muted-foreground mb-1">PO Reference</p>
              <p className="text-sm font-mono">{payment.purchaseOrderId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {payment.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{payment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Attachments panel - allows uploading any file type (PDF, Excel, images, etc.) */}
      <AttachmentPanel entityType="Payment" entityId={payment.id} />

      <ConfirmDialog
        open={confirming}
        onOpenChange={(o) => { if (!o) setConfirming(false) }}
        title="Confirm Payment"
        description="Are you sure you want to confirm this payment?"
        onConfirm={() => confirmPayment.mutate()}
        isLoading={confirmPayment.isPending}
      />

      <ConfirmDialog
        open={rejecting}
        onOpenChange={(o) => { if (!o) setRejecting(false) }}
        title="Reject Payment"
        description="Are you sure you want to reject this payment?"
        onConfirm={() => rejectPayment.mutate()}
        isLoading={rejectPayment.isPending}
      />
    </div>
  )
}
