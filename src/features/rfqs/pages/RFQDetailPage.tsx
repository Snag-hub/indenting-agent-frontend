import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { rfqApi, type RFQItemDto } from '@/features/rfqs/api/rfqApi'
import { quotationApi } from '@/features/quotations/api/quotationApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Send, Lock, Plus, Trash2, Edit2, Copy, ChevronRight, ChevronDown, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Sent: 'default',
  Closed: 'secondary',
}

const editRFQSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
})

type EditRFQForm = z.infer<typeof editRFQSchema>

const addItemSchema = z.object({
  supplierItemId: z.string().min(1, 'Item is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
})

type AddItemForm = z.infer<typeof addItemSchema>

export function RFQDetailPage() {
  const { id } = useParams({ from: '/_app/rfqs/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [replicateDialogOpen, setReplicateDialogOpen] = useState(false)
  const [selectedReplicateSupplier, setSelectedReplicateSupplier] = useState<string>('')
  const [removingItemId, setRemovingItemId] = useState<string | undefined>()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const { user } = useAuthStore()
  const role = user?.role

  const { data: rfq, isLoading } = useQuery({
    queryKey: queryKeys.rfqs.detail(id),
    queryFn: () => rfqApi.get(id),
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: queryKeys.suppliers.list(),
    queryFn: () => supplierApi.list({ page: 1, pageSize: 1000 }).then(r => r.data ?? []),
  })

  const { data: quotationsData } = useQuery({
    queryKey: queryKeys.quotations.list({ rfqId: id }),
    queryFn: () => quotationApi.list({ rfqId: id, pageSize: 50 }),
    enabled: !!rfq && rfq.status !== 'Draft',
  })

  // True when the current supplier already has a non-rejected quotation for this RFQ
  const alreadyQuoted = role === 'Supplier' && (quotationsData?.data ?? []).some(
    q => q.status !== 'Rejected'
  )

  const { data: supplierItemsResult } = useQuery({
    queryKey: ['supplier-items', 'browse', itemSearch],
    queryFn: () => supplierItemApi.browse({ page: 1, pageSize: 100, search: itemSearch }),
    enabled: addItemDialogOpen,
  })

  const { control: addItemControl, register: regItem, handleSubmit: handleAddItemSubmit, reset: resetAddItem, formState: { errors: addItemErrors } } = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { quantity: 1 },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<EditRFQForm>({
    resolver: zodResolver(editRFQSchema),
    defaultValues: {
      title: rfq?.title ?? '',
      notes: rfq?.notes ?? '',
      dueDate: rfq?.dueDate ?? '',
    },
  })

  const sendRFQ = useMutation({
    mutationFn: () => rfqApi.send(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      toast.success('RFQ sent to supplier')
      setSending(false)
    },
  })

  const closeRFQ = useMutation({
    mutationFn: () => rfqApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      toast.success('RFQ closed')
      setClosing(false)
    },
    onError: () => toast.error('Failed to close RFQ'),
  })

  const updateRFQ = useMutation({
    mutationFn: (data: EditRFQForm) =>
      rfqApi.update(id, {
        title: data.title,
        notes: data.notes || undefined,
        dueDate: data.dueDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(id) })
      setEditDialogOpen(false)
    },
  })

  const addItem = useMutation({
    mutationFn: (data: AddItemForm) =>
      rfqApi.addItem(id, { supplierItemId: data.supplierItemId, quantity: data.quantity, notes: data.notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(id) })
      setAddItemDialogOpen(false)
      resetAddItem()
      setItemSearch('')
    },
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => rfqApi.removeItem(id, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(id) })
      setRemovingItemId(undefined)
    },
  })

  const replicateRFQ = useMutation({
    mutationFn: (supplierId: string) => rfqApi.clone(id, supplierId),
    onSuccess: (newId) => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      setReplicateDialogOpen(false)
      setSelectedReplicateSupplier('')
      navigate({ to: '/rfqs/$id', params: { id: newId } })
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

  if (!rfq) {
    return <div className="text-muted-foreground">RFQ not found.</div>
  }

  const itemColumns: ColumnDef<RFQItemDto>[] = [
    {
      accessorKey: 'supplierItemName',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.supplierItemName}</div>
          <div className="text-xs text-muted-foreground">{row.original.supplierName}</div>
        </div>
      ),
    },
    { accessorKey: 'quantity', header: 'Qty' },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ getValue }) => getValue() ? <span className="text-sm">{getValue() as string}</span> : <span className="text-muted-foreground text-sm">—</span>,
    },
    ...(role === 'Customer' && rfq.status === 'Draft'
      ? [{
        id: 'actions',
        header: '',
        cell: ({ row }: { row: { original: RFQItemDto } }) => (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setRemovingItemId(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      }]
      : []),
  ]

  // Suppliers available for replication (exclude the supplier already on this RFQ)
  const replicateSupplierOptions = suppliers.filter(s => s.id !== rfq.supplierId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={rfq.title}
        description={rfq.dueDate ? `Due: ${format(new Date(rfq.dueDate), 'dd MMM yyyy')}` : ''}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[rfq.status]}>
              {rfq.status}
            </Badge>

            {/* Customer-only actions */}
            {role === 'Customer' && rfq.status === 'Draft' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSending(true)}
                >
                  <Send className="mr-2 h-4 w-4" /> Send
                </Button>
              </>
            )}

            {role === 'Customer' && rfq.status === 'Sent' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClosing(true)}
              >
                <Lock className="mr-2 h-4 w-4" /> Close
              </Button>
            )}

            {role === 'Customer' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReplicateDialogOpen(true)}
              >
                <Copy className="mr-2 h-4 w-4" /> Replicate
              </Button>
            )}

            {/* Customer: Compare quotations (when ≥ 2 exist) */}
            {role === 'Customer' && rfq.status === 'Sent' && (quotationsData?.data?.length ?? 0) >= 2 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: '/rfqs/$id/comparison', params: { id } })}
              >
                <Eye className="mr-2 h-4 w-4" /> Compare
              </Button>
            )}

            {/* Supplier-only actions */}
            {role === 'Supplier' && rfq.status === 'Sent' && (
              alreadyQuoted ? (
                <Badge variant="secondary">Quotation Submitted</Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => navigate({ to: '/quotations/new', search: { rfqId: id } })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quotation
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/rfqs' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      {/* Supplier + meta info card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Supplier</p>
              <p className="text-sm font-medium">{rfq.supplierName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={statusColors[rfq.status]}>{rfq.status}</Badge>
            </div>
            {rfq.dueDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <p className="text-sm">{format(new Date(rfq.dueDate), 'dd MMM yyyy')}</p>
              </div>
            )}
            {rfq.enquiryId && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Linked Enquiry</p>
                <p className="text-xs font-mono">{rfq.enquiryId}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{format(new Date(rfq.createdAt), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {rfq.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{rfq.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Quotation & Items</CardTitle>
          {role === 'Customer' && rfq.status === 'Draft' && (
            <Button size="sm" variant="outline" onClick={() => setAddItemDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="items">
            <TabsList className="mb-4">
              <TabsTrigger value="items">Line Items</TabsTrigger>
              <TabsTrigger value="quotations">Quotations</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {itemColumns.map((col, idx) => (
                        <TableHead key={idx}>
                          {typeof col.header === 'string' ? col.header : ''}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfq.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={itemColumns.length} className="text-center text-muted-foreground text-sm py-6">
                          No items added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rfq.items.flatMap((item) => {
                        const hasVariants = item.variants && item.variants.length > 0
                        const isExpanded = expandedItems.has(item.id)
                        const toggleExpand = () =>
                          setExpandedItems((prev) => {
                            const next = new Set(prev)
                            next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                            return next
                          })

                        const rows: React.ReactNode[] = [
                          <TableRow
                            key={item.id}
                            className={hasVariants ? 'cursor-pointer select-none' : ''}
                            onClick={hasVariants ? toggleExpand : undefined}
                          >
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1">
                                {hasVariants && (
                                  isExpanded
                                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <div>
                                  <div className="font-medium">{item.supplierItemName}</div>
                                  <div className="text-xs text-muted-foreground">{item.supplierName}</div>
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
                            {role === 'Customer' && rfq.status === 'Draft' && (
                              <TableCell className="text-sm text-right" onClick={(e) => e.stopPropagation()}>
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

                        // Add variant sub-rows if expanded
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
                                <TableCell className="text-xs text-muted-foreground py-2">{variant.quantityOffered}</TableCell>
                                <TableCell className="py-2"></TableCell>
                                {role === 'Customer' && rfq.status === 'Draft' && <TableCell className="py-2"></TableCell>}
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
            </TabsContent>

            <TabsContent value="quotations" className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Versions</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!quotationsData?.data || quotationsData.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                          No quotations yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      quotationsData.data.map((quotation) => (
                        <TableRow key={quotation.id}>
                          <TableCell className="text-sm font-medium">{quotation.supplierName}</TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline">{quotation.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{quotation.versionCount}</TableCell>
                          <TableCell className="text-sm text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate({ to: '/quotations/$id', params: { id: quotation.id } })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit RFQ Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit RFQ</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((data) => updateRFQ.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" {...register('title')} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea id="edit-notes" {...register('notes')} className="min-h-20" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-dueDate">Due Date</Label>
              <Input id="edit-dueDate" type="date" {...register('dueDate')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRFQ.isPending}>
                {updateRFQ.isPending ? 'Updating…' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={(open) => { setAddItemDialogOpen(open); if (!open) { resetAddItem(); setItemSearch('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddItemSubmit((data) => addItem.mutate(data))} className="space-y-4">
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
              <Label htmlFor="item-qty">Quantity</Label>
              <Input
                id="item-qty"
                type="number"
                min="1"
                {...regItem('quantity', { valueAsNumber: true })}
              />
              {addItemErrors.quantity && (
                <p className="text-xs text-destructive">{addItemErrors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="item-notes">Notes (optional)</Label>
              <Textarea id="item-notes" {...regItem('notes')} className="min-h-20" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addItem.isPending}>
                {addItem.isPending ? 'Adding…' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Replicate RFQ Dialog */}
      <Dialog
        open={replicateDialogOpen}
        onOpenChange={(open) => {
          setReplicateDialogOpen(open)
          if (!open) setSelectedReplicateSupplier('')
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replicate RFQ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Creates a copy of this RFQ with all items for a different supplier.
            </p>

            <div className="space-y-1">
              <Label htmlFor="replicate-supplier">Select Supplier</Label>
              <Select
                value={selectedReplicateSupplier || '__none__'}
                onValueChange={(v) => setSelectedReplicateSupplier(v === '__none__' ? '' : v)}
              >
                <SelectTrigger id="replicate-supplier">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Select a supplier</SelectItem>
                  {replicateSupplierOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {replicateSupplierOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">No other suppliers available.</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setReplicateDialogOpen(false); setSelectedReplicateSupplier('') }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedReplicateSupplier && replicateRFQ.mutate(selectedReplicateSupplier)}
                disabled={!selectedReplicateSupplier || replicateRFQ.isPending}
              >
                {replicateRFQ.isPending ? 'Replicating…' : 'Replicate'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={sending}
        onOpenChange={(open) => { if (!open) setSending(false) }}
        title="Send RFQ"
        description={`This will send the RFQ to ${rfq.supplierName}.`}
        confirmLabel="Send"
        onConfirm={() => sendRFQ.mutate()}
        isLoading={sendRFQ.isPending}
      />

      <ConfirmDialog
        open={closing}
        onOpenChange={(open) => { if (!open) setClosing(false) }}
        title="Close RFQ"
        description="This will mark the RFQ as Closed."
        confirmLabel="Close"
        onConfirm={() => closeRFQ.mutate()}
        isLoading={closeRFQ.isPending}
      />

      <ConfirmDialog
        open={!!removingItemId}
        onOpenChange={(open) => { if (!open) setRemovingItemId(undefined) }}
        title="Remove Item"
        description="Are you sure you want to remove this item from the RFQ?"
        confirmLabel="Remove"
        onConfirm={() => removingItemId && removeItem.mutate(removingItemId)}
        isLoading={removeItem.isPending}
      />
    </div>
  )
}
