import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { quotationApi } from '@/features/quotations/api/quotationApi'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Send, Check, X, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Submitted: 'default',
  Accepted: 'secondary',
  Rejected: 'destructive',
}

const addItemSchema = z.object({
  supplierItemId: z.string().min(1, 'Item is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  notes: z.string().optional(),
})

type AddItemForm = z.infer<typeof addItemSchema>

const reviseSchema = z.object({
  notes: z.string().optional(),
})

type ReviseForm = z.infer<typeof reviseSchema>

export function QuotationDetailPage() {
  const { id } = useParams({ from: '/_app/quotations/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false)
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [removingItemId, setRemovingItemId] = useState<string | undefined>()
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>()

  const { data: quotation, isLoading } = useQuery({
    queryKey: queryKeys.quotations.detail(id),
    queryFn: () => quotationApi.get(id),
  })

  const { control: addItemControl, register: registerAddItem, handleSubmit: handleAddItem, reset: resetAddItem, formState: { errors: addItemErrors } } = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      quantity: 1,
      unitPrice: 0,
    },
  })

  const { data: supplierItemsResult } = useQuery({
    queryKey: ['supplier-items', 'browse', itemSearch],
    queryFn: () => supplierItemApi.browse({ page: 1, pageSize: 100, search: itemSearch }),
    enabled: addItemDialogOpen,
  })

  const { register: registerRevise, handleSubmit: handleRevise, reset: resetRevise } = useForm<ReviseForm>({
    resolver: zodResolver(reviseSchema),
  })

  const submitQuotation = useMutation({
    mutationFn: () => quotationApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      setSubmitting(false)
    },
  })

  const acceptQuotation = useMutation({
    mutationFn: () => quotationApi.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      setAccepting(false)
    },
  })

  const rejectQuotation = useMutation({
    mutationFn: () => quotationApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      setRejecting(false)
    },
  })

  const reviseQuotation = useMutation({
    mutationFn: (data: ReviseForm) =>
      quotationApi.revise(id, {
        notes: data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      setReviseDialogOpen(false)
      resetRevise()
    },
  })

  const addItemMutation = useMutation({
    mutationFn: (data: AddItemForm) => {
      const versionId = activeVersionId ?? quotation?.versions[0]?.id ?? ''
      return quotationApi.addItem(id, versionId, {
        supplierItemId: data.supplierItemId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        notes: data.notes,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      setAddItemDialogOpen(false)
      resetAddItem()
      setItemSearch('')
    },
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) =>
      quotationApi.removeItem(id, itemId, activeVersionId ?? quotation?.versions[0]?.id ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      setRemovingItemId(undefined)
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

  if (!quotation) {
    return <div className="text-muted-foreground">Quotation not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotation.rfqTitle}
        description={`From: ${quotation.supplierName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[quotation.status]}>
              {quotation.status}
            </Badge>

            {quotation.status === 'Draft' && (
              <Button
                size="sm"
                onClick={() => setSubmitting(true)}
              >
                <Send className="mr-2 h-4 w-4" /> Submit
              </Button>
            )}

            {quotation.status === 'Submitted' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setAccepting(true)}
                >
                  <Check className="mr-2 h-4 w-4" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejecting(true)}
                >
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
              </>
            )}

            {quotation.status === 'Submitted' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReviseDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Revise
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/quotations' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      {quotation.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotation Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={quotation.versions[0].id} onValueChange={setActiveVersionId}>
              <TabsList>
                {quotation.versions.map((version) => (
                  <TabsTrigger key={version.id} value={version.id}>
                    Version {version.versionNumber}
                  </TabsTrigger>
                ))}
              </TabsList>

              {quotation.versions.map((version) => (
                <TabsContent key={version.id} value={version.id} className="space-y-4">
                  {version.notes && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm whitespace-pre-wrap">{version.notes}</p>
                    </div>
                  )}

                  {version.validUntil && (
                    <div className="text-sm">
                      <span className="font-medium">Valid Until:</span>{' '}
                      {format(new Date(version.validUntil), 'dd MMM yyyy')}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Notes</TableHead>
                          {quotation.status === 'Draft' && <TableHead></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {version.items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={quotation.status === 'Draft' ? 6 : 5} className="text-center text-muted-foreground text-sm py-6">
                              No items in this version.
                            </TableCell>
                          </TableRow>
                        ) : (
                          version.items.flatMap((item) => {
                            const rows: React.ReactNode[] = [
                              <TableRow key={item.id}>
                                <TableCell className="text-sm font-medium">
                                  {item.supplierItemName}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                  {item.quantity} units
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatCurrency(item.unitPrice)}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                  {formatCurrency(item.totalPrice)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {item.notes || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                {quotation.status === 'Draft' && (
                                  <TableCell className="text-sm text-right">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setRemovingItemId(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>,
                            ]

                            // Add variant sub-rows if variants exist
                            if ((item as any).variants && (item as any).variants.length > 0) {
                              (item as any).variants.forEach((variant: any) => {
                                rows.push(
                                  <TableRow key={`${item.id}-variant-${variant.id}`} className="bg-slate-50">
                                    <TableCell className="text-xs pl-8">
                                      <div className="font-medium text-slate-700">Variant: {variant.dimensionSummary}</div>
                                      {variant.sku && <div className="text-muted-foreground">SKU: {variant.sku}</div>}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-700">{variant.quantity} units</TableCell>
                                    <TableCell className="text-xs text-slate-700">
                                      {formatCurrency((item as any).variantPrices?.[variant.id] ?? (item as any).unitPrice)}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-700">
                                      {formatCurrency(Number(variant.quantity) * ((item as any).variantPrices?.[variant.id] ?? (item as any).unitPrice))}
                                    </TableCell>
                                    <TableCell></TableCell>
                                    {quotation.status === 'Draft' && <TableCell></TableCell>}
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

                  {quotation.status === 'Draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddItemDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Dialog open={addItemDialogOpen} onOpenChange={(open) => { setAddItemDialogOpen(open); if (!open) { resetAddItem(); setItemSearch('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleAddItem((data) => addItemMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>Search Items</Label>
              <Input
                placeholder="Search by name…"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Item</Label>
              <Controller
                control={addItemControl}
                name="supplierItemId"
                render={({ field }) => (
                  <Select
                    value={field.value || '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>Select item</SelectItem>
                      {(supplierItemsResult?.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} — {item.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {addItemErrors.supplierItemId && (
                <p className="text-xs text-destructive">{addItemErrors.supplierItemId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                {...registerAddItem('quantity', { valueAsNumber: true })}
              />
              {addItemErrors.quantity && (
                <p className="text-xs text-destructive">{addItemErrors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="unit-price">Unit Price</Label>
              <Input
                id="unit-price"
                type="number"
                min="0"
                step="0.01"
                {...registerAddItem('unitPrice', { valueAsNumber: true })}
              />
              {addItemErrors.unitPrice && (
                <p className="text-xs text-destructive">{addItemErrors.unitPrice.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="item-notes">Notes (optional)</Label>
              <Textarea
                id="item-notes"
                {...registerAddItem('notes')}
                className="min-h-20"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddItemDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addItemMutation.isPending}>
                {addItemMutation.isPending ? 'Adding…' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revise Quotation</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleRevise((data) => reviseQuotation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="revise-notes">Notes (optional)</Label>
              <Textarea
                id="revise-notes"
                {...registerRevise('notes')}
                className="min-h-20"
                placeholder="Optional notes for the new version"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={reviseQuotation.isPending}>
                {reviseQuotation.isPending ? 'Creating…' : 'Create New Version'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={submitting}
        onOpenChange={(open) => {
          if (!open) setSubmitting(false)
        }}
        title="Submit Quotation"
        description="This will submit the quotation to the customer."
        confirmLabel="Submit"
        onConfirm={() => submitQuotation.mutate()}
        isLoading={submitQuotation.isPending}
      />

      <ConfirmDialog
        open={accepting}
        onOpenChange={(open) => {
          if (!open) setAccepting(false)
        }}
        title="Accept Quotation"
        description="Are you sure you want to accept this quotation?"
        confirmLabel="Accept"
        onConfirm={() => acceptQuotation.mutate()}
        isLoading={acceptQuotation.isPending}
      />

      <ConfirmDialog
        open={rejecting}
        onOpenChange={(open) => {
          if (!open) setRejecting(false)
        }}
        title="Reject Quotation"
        description="Are you sure you want to reject this quotation?"
        confirmLabel="Reject"
        onConfirm={() => rejectQuotation.mutate()}
        isLoading={rejectQuotation.isPending}
      />

      <ConfirmDialog
        open={!!removingItemId}
        onOpenChange={(open) => {
          if (!open) setRemovingItemId(undefined)
        }}
        title="Remove Item"
        description="Are you sure you want to remove this item from the quotation?"
        confirmLabel="Remove"
        onConfirm={() => removingItemId && removeItem.mutate(removingItemId)}
        isLoading={removeItem.isPending}
      />
    </div>
  )
}
