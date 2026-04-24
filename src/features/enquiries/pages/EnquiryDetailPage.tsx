import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { enquiryApi, type EnquiryItemDto } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Send, Lock, ChevronRight, ChevronDown, FileText } from 'lucide-react'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Open: 'default',
  Closed: 'secondary',
}

export function EnquiryDetailPage() {
  const { id } = useParams({ from: '/_app/enquiries/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const { data: enquiry, isLoading } = useQuery({
    queryKey: queryKeys.enquiries.detail(id),
    queryFn: () => enquiryApi.get(id),
  })

  const submitEnquiry = useMutation({
    mutationFn: () => enquiryApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setSubmitting(false)
    },
  })

  const closeEnquiry = useMutation({
    mutationFn: () => enquiryApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setClosing(false)
    },
  })

  const columns: ColumnDef<EnquiryItemDto>[] = [
    {
      accessorKey: 'itemName',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.itemName}</div>
          {row.original.supplierName && (
            <div className="text-xs text-muted-foreground">{row.original.supplierName}</div>
          )}
        </div>
      ),
    },
    { accessorKey: 'quantity', header: 'Qty' },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ getValue }) => getValue() ? <span>{getValue() as string}</span> : <span className="text-muted-foreground">—</span>,
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!enquiry) {
    return <div className="text-muted-foreground">Enquiry not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={enquiry.title}
        description={`Status: ${enquiry.status}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[enquiry.status]}>
              {enquiry.status}
            </Badge>
            {enquiry.status === 'Draft' && (
              <Button
                size="sm"
                onClick={() => setSubmitting(true)}
              >
                <Send className="mr-2 h-4 w-4" /> Submit
              </Button>
            )}

            {enquiry.status === 'Open' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate({ to: '/rfqs/new', search: { enquiryId: id } })}
                >
                  <FileText className="mr-2 h-4 w-4" /> Create RFQ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClosing(true)}
                >
                  <Lock className="mr-2 h-4 w-4" /> Close
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/enquiries' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      {enquiry.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{enquiry.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={typeof col.id === 'string' ? col.id : 'accessor'}>
                      {typeof col.header === 'string' ? col.header : ''}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiry.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-6">
                      No line items specified.
                    </TableCell>
                  </TableRow>
                ) : enquiry.items.flatMap((item) => {
                  const hasVariants = item.variants && item.variants.length > 0
                  const isExpanded = expandedItems.has(item.id)
                  const toggleExpand = () =>
                    setExpandedItems((prev) => {
                      const next = new Set(prev)
                      next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                      return next
                    })

                  const rows: React.ReactNode[] = [
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          {hasVariants && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 shrink-0"
                              onClick={toggleExpand}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          <div>
                            <div className="font-medium">{item.itemName}</div>
                            {item.supplierName && (
                              <div className="text-xs text-muted-foreground">{item.supplierName}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {item.quantity}
                        {hasVariants && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {item.variants!.length} variant{item.variants!.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.notes ? item.notes : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>,
                  ]

                  // Add variant sub-rows when expanded
                  if (hasVariants && isExpanded) {
                    item.variants!.forEach((variant) => {
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
                          <TableCell className="text-xs text-muted-foreground py-2">{variant.quantity}</TableCell>
                          <TableCell className="py-2"></TableCell>
                        </TableRow>
                      )
                    })
                  }

                  return rows
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={submitting}
        onOpenChange={(open) => {
          if (!open) setSubmitting(false)
        }}
        title="Submit Enquiry"
        description="This will change the status to Open and notify relevant parties."
        confirmLabel="Submit"
        onConfirm={() => submitEnquiry.mutate()}
        isLoading={submitEnquiry.isPending}
      />

      <ConfirmDialog
        open={closing}
        onOpenChange={(open) => {
          if (!open) setClosing(false)
        }}
        title="Close Enquiry"
        description="This will mark the enquiry as Closed."
        confirmLabel="Close"
        onConfirm={() => closeEnquiry.mutate()}
        isLoading={closeEnquiry.isPending}
      />
    </div>
  )
}
