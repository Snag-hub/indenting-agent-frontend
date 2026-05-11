import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { quotationApi, type QuotationItemDto } from '@/features/quotations/api/quotationApi'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { QuotationItemEditor } from '@/features/quotations/components/QuotationItemEditor'
import { useAuthStore } from '@/stores/authStore'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Send, Check, X, Plus, Trash2, ShoppingCart, Eye, Pencil, Lock, RotateCcw } from 'lucide-react'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
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
  RevisionRequested: 'outline',
}

const reviseSchema = z.object({
  notes: z.string().optional(),
})

type ReviseForm = z.infer<typeof reviseSchema>

export function QuotationDetailPage() {
  const { id } = useParams({ from: '/_app/quotations/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [requestRevisionOpen, setRequestRevisionOpen] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | undefined>()
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>()
  const [deletingVersionId, setDeletingVersionId] = useState<string | undefined>()
  const [editorState, setEditorState] = useState<{
    open: boolean
    mode: 'add' | 'edit'
    item?: QuotationItemDto
    versionId?: string
  } | null>(null)

  const { data: quotation, isLoading } = useQuery({
    queryKey: queryKeys.quotations.detail(id),
    queryFn: () => quotationApi.get(id),
  })

  const { register: registerRevise, handleSubmit: handleRevise, reset: resetRevise } = useForm<ReviseForm>({
    resolver: zodResolver(reviseSchema),
  })

  const submitQuotation = useMutation({
    mutationFn: () => quotationApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Quotation submitted')
      setSubmitting(false)
    },
    onError: () => toast.error('Failed to submit quotation'),
  })

  const acceptQuotation = useMutation({
    mutationFn: () => quotationApi.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Quotation accepted')
      setAccepting(false)
    },
    onError: () => toast.error('Failed to accept quotation'),
  })

  const rejectQuotation = useMutation({
    mutationFn: () => quotationApi.reject(id, rejectionReason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Quotation rejected')
      setRejectDialogOpen(false)
      setRejectionReason('')
    },
    onError: () => toast.error('Failed to reject quotation'),
  })

  const requestRevisionMutation = useMutation({
    mutationFn: () => quotationApi.requestRevision(id, revisionNote || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Revision requested — supplier has been notified')
      setRequestRevisionOpen(false)
      setRevisionNote('')
    },
    onError: () => toast.error('Failed to request revision'),
  })

  const reviseQuotation = useMutation({
    mutationFn: (data: ReviseForm) =>
      quotationApi.revise(id, {
        notes: data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Revision requested')
      setReviseDialogOpen(false)
      resetRevise()
    },
    onError: () => toast.error('Failed to request revision'),
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) =>
      quotationApi.removeItem(id, itemId, activeVersionId ?? quotation?.versions[0]?.id ?? ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Item removed')
      setRemovingItemId(undefined)
    },
    onError: () => toast.error('Failed to remove item'),
  })

  const deleteVersion = useMutation({
    mutationFn: (versionId: string) => quotationApi.deleteVersion(id, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Version deleted')
      setDeletingVersionId(undefined)
    },
    onError: () => toast.error('Failed to delete version'),
  })

  const createPO = useMutation({
    mutationFn: () =>
      purchaseOrderApi.create({ quotationId: id }),
    onSuccess: (poId) => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })
      toast.success('Purchase Order created')
      navigate({ to: '/purchase-orders/$id', params: { id: poId } })
    },
    onError: () => toast.error('Failed to create Purchase Order'),
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
        title={quotation.documentNumber}
        description={`From: ${quotation.supplierName} · RFQ: ${quotation.rfqTitle}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[quotation.status]}>
              {quotation.status}
            </Badge>

            {role === 'Supplier' && quotation.status === 'Draft' && (
              <Button
                size="sm"
                onClick={() => setSubmitting(true)}
              >
                <Send className="mr-2 h-4 w-4" /> Submit
              </Button>
            )}

            {role === 'Supplier' && (quotation.status === 'Submitted' || quotation.status === 'Draft' || quotation.status === 'RevisionRequested') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReviseDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> New Version
              </Button>
            )}

            {role === 'Customer' && quotation.status === 'Submitted' && (
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
                  onClick={() => setRequestRevisionOpen(true)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Request Revision
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectDialogOpen(true)}
                >
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
              </>
            )}

            {role === 'Customer' && quotation.status === 'Accepted' && !quotation.purchaseOrderId && (
              <Button size="sm" onClick={() => createPO.mutate()} disabled={createPO.isPending}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {createPO.isPending ? 'Creating PO…' : 'Create PO'}
              </Button>
            )}

            {role === 'Customer' && quotation.status === 'Accepted' && quotation.purchaseOrderId && (
              <Button size="sm" variant="outline"
                onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: quotation.purchaseOrderId! } })}>
                <Eye className="mr-2 h-4 w-4" /> View PO
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

      <div className="grid grid-cols-3 gap-6">
        {/* Main content: 2 columns */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Document #</p>
                  <p className="text-sm font-mono font-medium">{quotation.documentNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={statusColors[quotation.status]}>{quotation.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Supplier</p>
                  <p className="text-sm font-medium">{quotation.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">RFQ</p>
                  <p className="text-sm font-mono">{quotation.rfqTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{format(new Date(quotation.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {quotation.rejectionReason && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-3 px-4">
                <p className="text-sm font-medium text-destructive mb-1">Rejection Reason</p>
                <p className="text-sm">{quotation.rejectionReason}</p>
              </CardContent>
            </Card>
          )}

          {quotation.revisionRequestNote && (
            <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="py-3 px-4">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Customer Revision Request</p>
                <p className="text-sm">{quotation.revisionRequestNote}</p>
              </CardContent>
            </Card>
          )}

          {quotation.versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quotation Versions</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={quotation.versions[quotation.versions.length - 1].id} onValueChange={setActiveVersionId}>
                  <TabsList>
                    {quotation.versions.map((version, idx) => {
                      const isLatest = idx === quotation.versions.length - 1
                      const canDeleteVersion = role === 'Supplier' && quotation.status === 'Draft'
                      return (
                        <TabsTrigger key={version.id} value={version.id} className="gap-1">
                          Version {version.versionNumber}
                          {!isLatest && <Lock className="h-3 w-3 text-muted-foreground" />}
                          {canDeleteVersion && (
                            <span
                              role="button"
                              className="ml-1 rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingVersionId(version.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </span>
                          )}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>

                  {quotation.versions.map((version, versionIdx) => {
                    const isLatestVersion = versionIdx === quotation.versions.length - 1
                    const canEdit = role === 'Supplier' && quotation.status === 'Draft' && isLatestVersion
                    return (
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

                        <DocumentItemsTable
                          mode="quotation"
                          items={version.items.map((item) => ({
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
                          actions={canEdit ? {
                            onEdit: (item) => {
                              const original = version.items.find((i) => i.id === item.id)
                              if (original) setEditorState({ open: true, mode: 'edit', item: original, versionId: version.id })
                            },
                            onDelete: (item) => setRemovingItemId(item.id),
                          } : undefined}
                          emptyMessage="No items in this version."
                        />

                        {!isLatestVersion && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            This version is locked — only the latest version can be edited.
                          </div>
                        )}

                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditorState({ open: true, mode: 'add', versionId: version.id })}
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                          </Button>
                        )}
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar: 1 column */}
        <aside>
          <ThreadPanel
            threadId={`Quotation-${id}`}
            title={`Q ${quotation.documentNumber}`}
            canPostInternal={user?.role === 'Admin'}
          />
        </aside>
      </div>

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

      <AttachmentPanel entityType="Quotation" entityId={id} />

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

      {/* Reject with reason dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { setRejectDialogOpen(open); if (!open) setRejectionReason('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to reject this quotation?
            </p>
            <div className="space-y-1">
              <Label htmlFor="rejection-reason">Reason (optional)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why you are rejecting this quotation…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={rejectQuotation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => rejectQuotation.mutate()} disabled={rejectQuotation.isPending}>
              {rejectQuotation.isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request revision dialog */}
      <Dialog open={requestRevisionOpen} onOpenChange={(open) => { setRequestRevisionOpen(open); if (!open) setRevisionNote('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="revision-note">Message to supplier (optional)</Label>
            <Textarea
              id="revision-note"
              placeholder="Describe what changes you'd like the supplier to make…"
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              className="min-h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestRevisionOpen(false)} disabled={requestRevisionMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => requestRevisionMutation.mutate()} disabled={requestRevisionMutation.isPending}>
              {requestRevisionMutation.isPending ? 'Sending…' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <ConfirmDialog
        open={!!deletingVersionId}
        onOpenChange={(open) => { if (!open) setDeletingVersionId(undefined) }}
        title="Delete Version"
        description="This will permanently remove this version and all its items. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingVersionId && deleteVersion.mutate(deletingVersionId)}
        isLoading={deleteVersion.isPending}
      />

      {editorState && (
        <QuotationItemEditor
          open={editorState.open}
          onOpenChange={(open) => { if (!open) setEditorState(null) }}
          mode={editorState.mode}
          quotationId={id}
          versionId={
            editorState.versionId ??
            activeVersionId ??
            quotation.versions[quotation.versions.length - 1]?.id ??
            ''
          }
          item={editorState.item}
          onSuccess={() => qc.invalidateQueries({ queryKey: queryKeys.quotations.detail(id) })}
        />
      )}
    </div>
  )
}
