import { useNavigate, useParams, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { rfqApi } from '@/features/rfqs/api/rfqApi'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Send, Lock, Plus, Edit2, Copy, Eye } from 'lucide-react'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { DetailPageContainer, DetailPageGrid, DetailPageMainColumn, DetailPageSidebar, DetailPageSummary } from '@/components/detail-page'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Submitted: 'default',
  Closed: 'secondary',
  Declined: 'destructive',
}

const editRFQSchema = z.object({
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
  const childMatches = useChildMatches()
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [replicateDialogOpen, setReplicateDialogOpen] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | undefined>()
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const { user } = useAuthStore()
  const role = user?.role

  const { data: rfq, isLoading } = useQuery({
    queryKey: queryKeys.rfqs.detail(id),
    queryFn: () => rfqApi.get(id),
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

  const { register, handleSubmit } = useForm<EditRFQForm>({
    resolver: zodResolver(editRFQSchema),
    defaultValues: {
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
    // Clone without a supplierId keeps the source's supplier.
    mutationFn: () => rfqApi.clone(id),
    onSuccess: (newId) => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      setReplicateDialogOpen(false)
      navigate({ to: '/rfqs/$id', params: { id: newId } })
    },
  })

  const declineRFQ = useMutation({
    mutationFn: () => rfqApi.decline(id, declineReason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.detail(id) })
      toast.success('You have declined this RFQ')
      setDeclineDialogOpen(false)
      setDeclineReason('')
    },
    onError: () => toast.error('Failed to decline RFQ'),
  })

  // Child route active (e.g. /comparison) — let it render instead of this page.
  if (childMatches.length > 0) return <Outlet />

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

  // For Supplier role: this RFQ is theirs, so status/declineReason live directly on rfq.
  const isDeclined = rfq.status === 'Declined'

  const summaryItems = [
    { label: 'Status', value: <Badge variant={statusColors[rfq.status]}>{rfq.status}</Badge> },
    ...(rfq.dueDate ? [{ label: 'Due Date', value: format(new Date(rfq.dueDate), 'dd MMM yyyy') }] : []),
    ...(rfq.enquiryDocumentNumber ? [{ label: 'Linked Enquiry', value: <a href={`/enquiries/${rfq.enquiryId}`} className="text-blue-600 hover:underline font-semibold text-sm">{rfq.enquiryDocumentNumber}</a> }] : []),
    { label: 'Supplier', value: rfq.supplierName },
    { label: 'Created', value: format(new Date(rfq.createdAt), 'dd MMM yyyy') },
  ]

  return (
    <DetailPageContainer>
      <PageHeader
        title={`RFQ ${rfq.documentNumber || '(unsaved)'}`}
        description={rfq.dueDate ? `Due: ${format(new Date(rfq.dueDate), 'dd MMM yyyy')}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[rfq.status]}>
              {rfq.status}
            </Badge>

            {role === 'Customer' && rfq.status === 'Draft' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" onClick={() => setSending(true)}>
                  <Send className="mr-2 h-4 w-4" /> Send
                </Button>
              </>
            )}

            {role === 'Customer' && rfq.status === 'Submitted' && (
              <Button size="sm" variant="outline" onClick={() => setClosing(true)}>
                <Lock className="mr-2 h-4 w-4" /> Close
              </Button>
            )}

            {role === 'Customer' && (
              <Button size="sm" variant="outline" onClick={() => setReplicateDialogOpen(true)}>
                <Copy className="mr-2 h-4 w-4" /> Replicate
              </Button>
            )}

            {role === 'Supplier' && rfq.status === 'Submitted' && (
              alreadyQuoted ? (
                <Badge variant="secondary">Quotation Submitted</Badge>
              ) : (
                <>
                  <Button size="sm" onClick={() => navigate({ to: '/quotations/new', search: { rfqId: id } })}>
                    <Plus className="mr-2 h-4 w-4" /> Create Quotation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => setDeclineDialogOpen(true)}
                  >
                    Decline
                  </Button>
                </>
              )
            )}

            {role === 'Supplier' && isDeclined && (
              <Badge variant="destructive">Declined</Badge>
            )}

            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/rfqs' })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <DetailPageGrid>
        <DetailPageMainColumn>
          <DetailPageSummary items={summaryItems} columns={3} />

          {rfq.status === 'Declined' && rfq.declineReason && (
            <Card>
              <CardHeader><CardTitle className="text-base">Decline Reason</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{rfq.declineReason}</p>
              </CardContent>
            </Card>
          )}

          {rfq.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
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
                  <DocumentItemsTable
                    mode="rfq"
                    items={rfq.items.map((item) => ({
                      id: item.id,
                      name: item.supplierItemName,
                      supplierName: item.supplierName,
                      quantity: item.quantity,
                      notes: item.notes,
                      variants: item.variants?.map((v) => ({
                        id: v.id,
                        dimensionSummary: v.dimensionSummary,
                        sku: v.sku,
                        quantity: v.quantityOffered,
                      })),
                    }))}
                    actions={role === 'Customer' && rfq.status === 'Draft'
                      ? { onDelete: (item) => setRemovingItemId(item.id) }
                      : undefined}
                    emptyMessage="No items added yet."
                  />
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

          <AttachmentPanel entityType="RFQ" entityId={id} />
        </DetailPageMainColumn>

        <DetailPageSidebar>
          <ThreadPanel
            threadId={`RFQ-${id}`}
            title={`RFQ ${rfq.documentNumber}`}
            canPostInternal={user?.role === 'Admin'}
            disabledReason={rfq.status === 'Draft' ? 'Submit this RFQ to suppliers to unlock messaging.' : undefined}
          />
        </DetailPageSidebar>
      </DetailPageGrid>

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

      {/* Replicate RFQ Dialog — copies the same invited suppliers */}
      <Dialog open={replicateDialogOpen} onOpenChange={setReplicateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replicate RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Creates a copy of this RFQ with all its items and the same invited suppliers. The new RFQ will be in Draft state.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReplicateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => replicateRFQ.mutate()}
                disabled={replicateRFQ.isPending}
              >
                {replicateRFQ.isPending ? 'Replicating…' : 'Replicate'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline RFQ Dialog — Supplier declines to quote */}
      <Dialog open={declineDialogOpen} onOpenChange={(open) => { setDeclineDialogOpen(open); if (!open) setDeclineReason('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline RFQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to decline to quote on this RFQ. This will be visible to the customer. Provide an optional reason.
            </p>
            <div className="space-y-1">
              <Label htmlFor="decline-reason">Reason (optional)</Label>
              <Textarea
                id="decline-reason"
                placeholder="e.g. Out of stock, capacity constraints…"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeclineDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => declineRFQ.mutate()}
                disabled={declineRFQ.isPending}
              >
                {declineRFQ.isPending ? 'Declining…' : 'Decline RFQ'}
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
    </DetailPageContainer>
  )
}
