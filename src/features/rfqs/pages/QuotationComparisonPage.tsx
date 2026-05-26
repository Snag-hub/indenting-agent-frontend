import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { rfqApi, type SupplierQuotationComparisonDto } from '@/features/rfqs/api/rfqApi'
import { quotationApi } from '@/features/quotations/api/quotationApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency, supplierStatusBadgeVariant } from '@/lib/utils'

// ─── component ───────────────────────────────────────────────────────────────

export function QuotationComparisonPage() {
  const { id: rfqId } = useParams({ from: '/_app/rfqs/$id/comparison' })
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [acceptTarget, setAcceptTarget] = useState<SupplierQuotationComparisonDto | null>(null)

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['rfq-comparison', rfqId],
    queryFn: () => rfqApi.getComparison(rfqId),
  })

  const acceptQuotation = useMutation({
    mutationFn: ({ quotationId, rejectOthers }: { quotationId: string; rejectOthers: boolean }) =>
      quotationApi.accept(quotationId, { rejectOthers }),
    onSuccess: (_, { rejectOthers }) => {
      qc.invalidateQueries({ queryKey: ['rfq-comparison', rfqId] })
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(rfqId) })
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      toast.success(rejectOthers ? 'Quotation accepted; other bids rejected.' : 'Quotation accepted.')
      setAcceptTarget(null)
      navigate({ to: '/rfqs/$id', params: { id: rfqId } })
    },
    onError: () => toast.error('Failed to accept quotation.'),
  })

  const toggleExpand = (itemId: string) =>
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })

  // Derived values — default to empty arrays so the useMemo below is always called
  // (hooks must not appear after conditional returns).
  const { requestedItems = [], supplierQuotations = [] } = comparison ?? {}
  const quotedCount = supplierQuotations.filter(s => s.invitationStatus === 'Quoted').length
  const displayCurrency = supplierQuotations.find(s => s.currency)?.currency ?? 'USD'

  // ── pre-build all table rows so toggling expand doesn't re-run on every render ─
  const tableRows = useMemo(() => requestedItems.flatMap((reqItem) => {
    const rows: React.ReactNode[] = []

    const hasAnyVariants = supplierQuotations.some(sq =>
      sq.quotedItems.find(qi => qi.rfqItemId === reqItem.rfqItemId)?.variants?.length
    )
    const isExpanded = expandedItems.has(reqItem.rfqItemId)

    rows.push(
      <TableRow
        key={reqItem.rfqItemId}
        className={hasAnyVariants ? 'cursor-pointer select-none' : ''}
        onClick={() => hasAnyVariants && toggleExpand(reqItem.rfqItemId)}
      >
        <TableCell className="text-sm font-medium">
          <div className="flex items-center gap-1">
            {hasAnyVariants && (
              isExpanded
                ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <div>{reqItem.itemName}</div>
              {reqItem.notes && (
                <div className="text-xs text-muted-foreground">{reqItem.notes}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-center text-sm">{reqItem.quantityRequested}</TableCell>
        {supplierQuotations.map((sq) => {
          const qi = sq.quotedItems.find(q => q.rfqItemId === reqItem.rfqItemId)
          if (sq.invitationStatus === 'Declined') {
            return (
              <TableCell key={sq.supplierId} className="text-right text-xs text-muted-foreground italic">
                Declined
              </TableCell>
            )
          }
          if (!qi || sq.invitationStatus === 'Invited') {
            return (
              <TableCell key={sq.supplierId} className="text-right text-muted-foreground text-sm">—</TableCell>
            )
          }
          return (
            <TableCell key={sq.supplierId} className="text-right text-sm tabular-nums">
              {qi.unitPrice != null && qi.unitPrice > 0
                ? <>{formatCurrency(qi.unitPrice, sq.currency)} <span className="text-muted-foreground text-xs">/ {formatCurrency(qi.totalPrice, sq.currency)}</span></>
                : <span className="text-muted-foreground">—</span>
              }
            </TableCell>
          )
        })}
      </TableRow>
    )

    if (hasAnyVariants && isExpanded) {
      const allVariantLabels = new Map<string, string>()
      supplierQuotations.forEach((sq) => {
        const qi = sq.quotedItems.find(q => q.rfqItemId === reqItem.rfqItemId)
        qi?.variants?.forEach((v) => {
          const key = v.supplierItemVariantId
          if (!allVariantLabels.has(key)) {
            allVariantLabels.set(key, v.dimensionSummary ?? v.sku ?? key.slice(0, 8))
          }
        })
      })

      allVariantLabels.forEach((label, variantId) => {
        rows.push(
          <TableRow key={`${reqItem.rfqItemId}-v-${variantId}`} className="bg-muted/30">
            <TableCell className="text-xs pl-10 py-2 text-muted-foreground">
              {label}
            </TableCell>
            <TableCell className="py-2" />
            {supplierQuotations.map((sq) => {
              const qi = sq.quotedItems.find(q => q.rfqItemId === reqItem.rfqItemId)
              const v = qi?.variants?.find(vv => vv.supplierItemVariantId === variantId)
              if (!v) {
                return <TableCell key={sq.supplierId} className="text-right text-xs py-2 text-muted-foreground">—</TableCell>
              }
              return (
                <TableCell key={sq.supplierId} className="text-right text-xs py-2 tabular-nums">
                  {formatCurrency(v.unitPrice, sq.currency)}{' '}
                  <span className="text-muted-foreground">× {v.quantity}</span>
                  {' = '}
                  {formatCurrency(v.totalPrice, sq.currency)}
                </TableCell>
              )
            })}
          </TableRow>
        )
      })
    }

    return rows
  }), [requestedItems, supplierQuotations, expandedItems, toggleExpand])

  // ── loading / empty states (after all hooks) ───────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!comparison) {
    return <div className="text-muted-foreground">RFQ not found.</div>
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Comparison"
        description={`RFQ ${comparison.documentNumber} — ${supplierQuotations.length} invited supplier(s), ${quotedCount} quoted`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/rfqs/$id', params: { id: rfqId } })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to RFQ
          </Button>
        }
      />

      {/* ── Column header cards (one per supplier) ─────────────────────────── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${supplierQuotations.length}, minmax(0, 1fr))` }}>
        {supplierQuotations.map((sq) => (
          <Card key={sq.supplierId} className="text-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold leading-tight">{sq.supplierName}</p>
                  {sq.submittedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(sq.submittedAt), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
                <Badge variant={supplierStatusBadgeVariant(sq.invitationStatus)} className="shrink-0">
                  {sq.invitationStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1">
              {sq.invitationStatus === 'Declined' ? (
                <p className="text-xs text-muted-foreground italic">
                  {sq.declineReason ?? 'No reason provided.'}
                </p>
              ) : sq.invitationStatus === 'Invited' ? (
                <p className="text-xs text-muted-foreground italic">No quotation yet.</p>
              ) : (
                <>
                  {/* Totals strip */}
                  <div className="text-xs space-y-0.5 text-muted-foreground">
                    {sq.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span className="text-red-500">−{formatCurrency(sq.discountAmount, sq.currency)}</span>
                      </div>
                    )}
                    {sq.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{formatCurrency(sq.taxAmount, sq.currency)}</span>
                      </div>
                    )}
                    {sq.shippingAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>{formatCurrency(sq.shippingAmount, sq.currency)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between font-semibold text-sm pt-1 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(sq.totalAmount, sq.currency)}</span>
                  </div>
                  {sq.quotationId && (
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setAcceptTarget(sq)}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Accept
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Price comparison table ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line-item Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44 min-w-[11rem]">Item</TableHead>
                  <TableHead className="text-center w-16">Req.</TableHead>
                  {supplierQuotations.map((sq) => (
                    <TableHead key={sq.supplierId} className="text-right min-w-[9rem]">
                      <div className="text-xs font-semibold">{sq.supplierName}</div>
                      <div className="text-[11px] font-normal text-muted-foreground">Unit / Total</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={supplierQuotations.length + 2} className="text-center text-muted-foreground text-sm py-6">
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : tableRows}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Accept modal ──────────────────────────────────────────────────────── */}
      <Dialog open={!!acceptTarget} onOpenChange={(open) => { if (!open) setAcceptTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Accept quotation from {acceptTarget?.supplierName}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Total: <strong>{formatCurrency(acceptTarget?.totalAmount, acceptTarget?.currency ?? displayCurrency)}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            What should happen to the other submitted quotations?
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              onClick={() => acceptTarget?.quotationId && acceptQuotation.mutate({ quotationId: acceptTarget.quotationId, rejectOthers: true })}
              disabled={acceptQuotation.isPending}
            >
              Accept and reject other bids
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => acceptTarget?.quotationId && acceptQuotation.mutate({ quotationId: acceptTarget.quotationId, rejectOthers: false })}
              disabled={acceptQuotation.isPending}
            >
              Accept only this quotation
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setAcceptTarget(null)} disabled={acceptQuotation.isPending}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
