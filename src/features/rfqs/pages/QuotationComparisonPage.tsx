import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { rfqApi, type RFQItemDto } from '@/features/rfqs/api/rfqApi'
import { quotationApi } from '@/features/quotations/api/quotationApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Eye } from 'lucide-react'
import { format } from 'date-fns'

interface QuotationPrice {
  supplierName: string;
  quotationId: string;
  unitPrice?: number;
  totalPrice?: number;
  status: string;
}

export function QuotationComparisonPage() {
  const { id: rfqId } = useParams({ from: '/_app/rfqs/$id/comparison' })
  const navigate = useNavigate()

  const { data: rfq, isLoading: rfqLoading } = useQuery({
    queryKey: queryKeys.rfqs.detail(rfqId),
    queryFn: () => rfqApi.get(rfqId),
  })

  const { data: quotationsData, isLoading: quotationsLoading } = useQuery({
    queryKey: queryKeys.quotations.list({ rfqId }),
    queryFn: () => quotationApi.list({ rfqId, pageSize: 100 }),
    enabled: !!rfqId,
  })

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  if (rfqLoading || quotationsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!rfq) {
    return <div className="text-muted-foreground">RFQ not found.</div>
  }

  if (!quotationsData?.data || quotationsData.data.length < 2) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Quotation Comparison"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/rfqs/$id', params: { id: rfqId } })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          }
        />
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            At least 2 quotations are needed to compare. Currently, {quotationsData?.data?.length ?? 0} quotation{(quotationsData?.data?.length ?? 0) !== 1 ? 's' : ''} available.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get the latest version of each quotation
  const quotations = quotationsData.data.map((q) => {
    // Fetch full quotation details to get versions
    // For now, we'll use the summary data
    return q
  })

  // Group prices by item
  const itemPrices = new Map<string, { item: RFQItemDto; prices: QuotationPrice[] }>()

  rfq.items.forEach((item) => {
    itemPrices.set(item.id, {
      item,
      prices: [],
    })
  })

  // Populate prices from quotations (would need to fetch full quotation details)
  quotations.forEach((quotation) => {
    rfq.items.forEach((item) => {
      const entry = itemPrices.get(item.id)
      if (entry) {
        entry.prices.push({
          supplierName: quotation.supplierName,
          quotationId: quotation.id,
          status: quotation.status,
          // unitPrice and totalPrice would come from the full quotation detail
        })
      }
    })
  })

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Comparison"
        description={`RFQ ${rfq.documentNumber} — ${quotations.length} quotations`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/rfqs/$id', params: { id: rfqId } })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      {/* Quotations Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suppliers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {quotations.map((q) => (
              <div key={q.id} className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{q.supplierName}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  v{q.versionCount}
                </p>
                <Badge variant="outline" className="text-xs">
                  {q.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Comparison by Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Item</TableHead>
                  <TableHead className="text-center w-20">Qty</TableHead>
                  {quotations.map((q) => (
                    <TableHead key={q.id} className="text-right min-w-32">
                      <div className="text-xs font-semibold">{q.supplierName}</div>
                      <div className="text-[11px] font-normal text-muted-foreground">
                        Unit / Total
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={quotations.length + 3} className="text-center text-muted-foreground text-sm py-6">
                      No items to compare.
                    </TableCell>
                  </TableRow>
                ) : (
                  rfq.items.flatMap((item) => {
                    const rows: React.ReactNode[] = []
                    const hasVariants = item.variants && item.variants.length > 0
                    const isExpanded = expandedItems.has(item.id)

                    rows.push(
                      <TableRow key={item.id} className={hasVariants ? 'cursor-pointer select-none' : ''}>
                        <TableCell className="text-sm font-medium" onClick={() => hasVariants && toggleExpand(item.id)}>
                          <div>
                            <div>{item.supplierItemName}</div>
                            <div className="text-xs text-muted-foreground">{item.supplierName}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {item.quantity}
                          {hasVariants && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {item.variants.length}v
                            </Badge>
                          )}
                        </TableCell>
                        {quotations.map((quotation) => (
                          <TableCell key={`${item.id}-${quotation.id}`} className="text-right text-sm">
                            <span className="text-muted-foreground">—</span>
                          </TableCell>
                        ))}
                        <TableCell>
                          {quotations.some((q) => q.id) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate({ to: '/quotations/$id', params: { id: quotations[0].id } })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )

                    // Add variant sub-rows if expanded
                    if (hasVariants && isExpanded) {
                      item.variants.forEach((variant) => {
                        rows.push(
                          <TableRow key={`${item.id}-variant-${variant.id}`}>
                            <TableCell className="text-xs pl-10 py-2">
                              <span className="text-muted-foreground">
                                {variant.dimensionSummary || variant.supplierItemVariantId.slice(0, 8) + '…'}
                                {variant.sku && (
                                  <span className="ml-2 font-mono text-[11px]">· {variant.sku}</span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-center text-muted-foreground py-2">
                              {variant.quantityOffered}
                            </TableCell>
                            {quotations.map((quotation) => (
                              <TableCell key={`${item.id}-variant-${variant.id}-${quotation.id}`} className="text-right text-xs py-2">
                                <span className="text-muted-foreground">—</span>
                              </TableCell>
                            ))}
                            <TableCell className="py-2"></TableCell>
                          </TableRow>
                        )
                      })
                    }

                    return rows
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">RFQ</p>
              <p className="text-sm font-medium">{rfq.documentNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Items</p>
              <p className="text-sm font-medium">{rfq.items.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Suppliers</p>
              <p className="text-sm font-medium">{quotations.length}</p>
            </div>
            {rfq.dueDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <p className="text-sm font-medium">{format(new Date(rfq.dueDate), 'dd MMM yyyy')}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-medium">{format(new Date(rfq.createdAt), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
