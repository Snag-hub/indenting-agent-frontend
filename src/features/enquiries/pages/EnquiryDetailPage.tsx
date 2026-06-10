import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { enquiryApi, type EnquiryItemVariantInput } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Send, Lock, FileText, Trash2, Plus, Users } from 'lucide-react'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { PageHeader } from '@/components/PageHeader'
import { DetailPageContainer, DetailPageGrid, DetailPageMainColumn, DetailPageSidebar, DetailPageSummary } from '@/components/detail-page'
import { VariantQuantityDialog } from '@/features/catalog/components/VariantQuantityDialog'
import { usePageTitle } from '@/hooks/usePageTitle'
import { format } from 'date-fns'

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
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [editingQty, setEditingQty] = useState<Record<string, number>>({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const pickerSearchRef = useRef<HTMLInputElement>(null)
  // Variant editing state for Draft mode items
  const [variantDialogItem, setVariantDialogItem] = useState<{ itemId: string; supplierItemId: string; itemName: string } | null>(null)
  // Pending picker item — when selected item has variants, hold it here until variants are chosen
  const [pendingPickerOffer, setPendingPickerOffer] = useState<{ supplierItemId: string; hasVariants: boolean } | null>(null)

  const { data: enquiry, isLoading } = useQuery({
    queryKey: queryKeys.enquiries.detail(id),
    queryFn: () => enquiryApi.get(id),
  })

  usePageTitle(enquiry?.documentNumber)

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

  const removeItem = useMutation({
    mutationFn: (itemId: string) => enquiryApi.removeItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.detail(id) })
      setRemovingItemId(null)
    },
    onError: () => toast.error('Failed to remove item.'),
  })

  const updateItemQty = useMutation({
    mutationFn: ({ itemId, quantity, variants }: { itemId: string; quantity: number; variants?: import('@/features/enquiries/api/enquiryApi').EnquiryItemVariantInput[] }) =>
      enquiryApi.updateItem(itemId, { quantity, variants }),
    onSuccess: (_data, { itemId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.detail(id) })
      setEditingQty((prev) => { const next = { ...prev }; delete next[itemId]; return next })
    },
    onError: () => toast.error('Failed to update quantity.'),
  })

  const { data: availableItems = [], isFetching: searchingItems } = useQuery({
    queryKey: ['enquiry-item-picker', id, pickerSearch, enquiry?.supplierId],
    queryFn: () =>
      enquiryApi.availableItems({
        search: pickerSearch || undefined,
        supplierIds: enquiry?.supplierId ? [enquiry.supplierId] : undefined,
      }),
    enabled: pickerOpen && !!enquiry,
    staleTime: 30_000,
  })

  const addItem = useMutation({
    mutationFn: (payload: { supplierItemId: string; quantity: number; variants?: EnquiryItemVariantInput[] }) =>
      enquiryApi.addItem(id, { supplierItemId: payload.supplierItemId, quantity: payload.quantity, variants: payload.variants }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.detail(id) })
      toast.success('Item added.')
      setPendingPickerOffer(null)
      setPickerOpen(false)
      setPickerSearch('')
    },
    onError: () => toast.error('Failed to add item.'),
  })

  useEffect(() => {
    if (pickerOpen) setTimeout(() => pickerSearchRef.current?.focus(), 50)
  }, [pickerOpen])

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

  const threadId = `Enquiry-${id}`

  return (
    <DetailPageContainer>
      <PageHeader
        title={enquiry.documentNumber}
        description={`${enquiry.enquiryType} · ${enquiry.priority} priority`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[enquiry.status]}>{enquiry.status}</Badge>
            {enquiry.status === 'Draft' && (
              <Button size="sm" onClick={() => setSubmitting(true)}>
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
                <Button size="sm" variant="outline" onClick={() => setClosing(true)}>
                  <Lock className="mr-2 h-4 w-4" /> Close
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/enquiries' })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <DetailPageGrid>
        <DetailPageMainColumn>
          <DetailPageSummary
            items={[
              { label: 'Status', value: <Badge variant={statusColors[enquiry.status]}>{enquiry.status}</Badge> },
              { label: 'Type', value: enquiry.enquiryType },
              { label: 'Priority', value: enquiry.priority },
              { label: 'Created', value: format(new Date(enquiry.createdAt), 'dd MMM yyyy') },
            ]}
            columns={4}
          />

          {enquiry.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{enquiry.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Items</CardTitle>
              {enquiry.status === 'Draft' && (
                <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {enquiry.status === 'Draft' ? (
                enquiry.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No items yet. Click "Add Item" to get started.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="pb-2">Item</th>
                        <th className="pb-2 w-48">Quantity / Variants</th>
                        <th className="pb-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {enquiry.items.map((item) => {
                        const hasVariants = (item.variants?.length ?? 0) > 0
                        const pendingQty = editingQty[item.id] ?? item.quantity
                        const dirty = !hasVariants && pendingQty !== item.quantity
                        return (
                          <tr key={item.id} className="border-b last:border-b-0 align-top">
                            <td className="py-2 pr-4">
                              <div className="font-medium">{item.itemName}</div>
                              {item.supplierName && (
                                <div className="text-xs text-muted-foreground">{item.supplierName}</div>
                              )}
                            </td>
                            <td className="py-2 pr-2">
                              {hasVariants ? (
                                <div className="space-y-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => item.supplierItemId && setVariantDialogItem({
                                      itemId: item.id,
                                      supplierItemId: item.supplierItemId,
                                      itemName: item.itemName,
                                    })}
                                  >
                                    <Users className="h-3 w-3 mr-1" />
                                    {item.variants!.length} variant{item.variants!.length !== 1 ? 's' : ''} — qty {item.quantity}
                                  </Button>
                                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                                    {item.variants!.map((v) => (
                                      <li key={v.id}>{v.dimensionSummary || v.sku || v.supplierItemVariantId} — {v.quantityRequested}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={pendingQty}
                                    onChange={(e) =>
                                      setEditingQty((prev) => ({
                                        ...prev,
                                        [item.id]: Number(e.target.value) || 1,
                                      }))
                                    }
                                    className="w-24 h-8"
                                  />
                                  {dirty && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 text-xs"
                                      disabled={updateItemQty.isPending}
                                      onClick={() =>
                                        updateItemQty.mutate({ itemId: item.id, quantity: pendingQty })
                                      }
                                    >
                                      Save
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => setRemovingItemId(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                <DocumentItemsTable
                  mode="enquiry"
                  items={enquiry.items.map((item) => ({
                    id: item.id,
                    name: item.itemName,
                    supplierName: item.supplierName,
                    quantity: item.quantity,
                    notes: item.notes,
                    variants: item.variants?.map((v) => ({
                      id: v.id,
                      dimensionSummary: v.dimensionSummary,
                      sku: v.sku,
                      quantity: v.quantityRequested,
                    })),
                  }))}
                  emptyMessage="No line items specified."
                />
              )}
            </CardContent>
          </Card>
        </DetailPageMainColumn>

        <DetailPageSidebar>
          <ThreadPanel
            threadId={threadId}
            disabledReason={enquiry.status === 'Draft' ? 'Submit this enquiry to unlock messaging.' : undefined}
          />
        </DetailPageSidebar>
      </DetailPageGrid>

      <AttachmentPanel entityType="Enquiry" entityId={id} />

      {/* Item picker overlay */}
      {pickerOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPickerOpen(false)
              setPickerSearch('')
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-item-picker-title"
            className="bg-white rounded-lg shadow-lg w-full max-w-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 id="enquiry-item-picker-title" className="font-semibold">Add Item</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setPickerOpen(false); setPickerSearch('') }}
              >
                ×
              </Button>
            </div>
            <Input
              ref={pickerSearchRef}
              placeholder="Search items…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto border rounded">
              {searchingItems ? (
                <div className="text-center py-4 text-sm text-muted-foreground">Searching…</div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">No items found.</div>
              ) : (
                availableItems.map((catalogItem) => {
                  const relevantOffers = enquiry.supplierId
                    ? catalogItem.offers.filter((o) => o.supplierId === enquiry.supplierId)
                    : catalogItem.offers

                  if (relevantOffers.length === 0) return null

                  const alreadyAddedIds = new Set(enquiry.items.map((i) => i.supplierItemId))
                  const allAdded = relevantOffers.every((o) => alreadyAddedIds.has(o.supplierItemId))

                  return (
                    <button
                      key={catalogItem.id}
                      type="button"
                      disabled={allAdded || addItem.isPending}
                      onClick={() => {
                        const offer = relevantOffers.find((o) => !alreadyAddedIds.has(o.supplierItemId))
                        if (!offer) return
                        if (offer.hasVariants) {
                          // Hold the offer and open the variant dialog before adding
                          setPendingPickerOffer({ supplierItemId: offer.supplierItemId, hasVariants: true })
                        } else {
                          addItem.mutate({
                            supplierItemId: offer.supplierItemId,
                            quantity: offer.quantityTiers[0] ?? 1,
                          })
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed border-b last:border-b-0"
                    >
                      <div className="text-sm font-medium">{catalogItem.resolvedName}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {relevantOffers.map((o) => {
                          const added = alreadyAddedIds.has(o.supplierItemId)
                          return (
                            <span key={o.supplierItemId} className={added ? 'line-through opacity-40' : ''}>
                              {o.supplierName}
                              {o.quantityTiers.length > 0 && (
                                <span className="ml-1">
                                  (lots: {o.quantityTiers.map((t) => t.toLocaleString()).join(', ')})
                                </span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                      {allAdded && (
                        <div className="mt-0.5 text-xs text-muted-foreground">Already added</div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Clicking an item adds it with the first available lot size (or qty 1 if no tiers).
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={submitting}
        onOpenChange={(open) => { if (!open) setSubmitting(false) }}
        title="Submit Enquiry"
        description="This will change the status to Open and notify relevant parties."
        confirmLabel="Submit"
        onConfirm={() => submitEnquiry.mutate()}
        isLoading={submitEnquiry.isPending}
      />
      <ConfirmDialog
        open={closing}
        onOpenChange={(open) => { if (!open) setClosing(false) }}
        title="Close Enquiry"
        description="This will mark the enquiry as Closed."
        confirmLabel="Close"
        onConfirm={() => closeEnquiry.mutate()}
        isLoading={closeEnquiry.isPending}
      />
      <ConfirmDialog
        open={!!removingItemId}
        onOpenChange={(open) => { if (!open) setRemovingItemId(null) }}
        title="Remove Item"
        description="This item will be removed from the enquiry."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => removingItemId && removeItem.mutate(removingItemId)}
        isLoading={removeItem.isPending}
      />

      {/* Variant dialog for editing variants on existing Draft items */}
      {variantDialogItem && (
        <VariantQuantityDialog
          open={!!variantDialogItem}
          onOpenChange={(open) => { if (!open) setVariantDialogItem(null) }}
          supplierItemId={variantDialogItem.supplierItemId}
          supplierItemName={variantDialogItem.itemName}
          onConfirm={(confirmed) => {
            const variants: EnquiryItemVariantInput[] = confirmed.map((v) => ({
              supplierItemVariantId: v.variantId,
              quantityRequested: v.quantity,
            }))
            const totalQty = variants.reduce((s, v) => s + v.quantityRequested, 0)
            updateItemQty.mutate({ itemId: variantDialogItem.itemId, quantity: totalQty, variants })
            setVariantDialogItem(null)
          }}
        />
      )}

      {/* Variant dialog for new items being added from the picker */}
      {pendingPickerOffer && (
        <VariantQuantityDialog
          open={!!pendingPickerOffer}
          onOpenChange={(open) => { if (!open) setPendingPickerOffer(null) }}
          supplierItemId={pendingPickerOffer.supplierItemId}
          supplierItemName="Select variants"
          onConfirm={(confirmed) => {
            const variants: EnquiryItemVariantInput[] = confirmed.map((v) => ({
              supplierItemVariantId: v.variantId,
              quantityRequested: v.quantity,
            }))
            const totalQty = variants.reduce((s, v) => s + v.quantityRequested, 0)
            addItem.mutate({
              supplierItemId: pendingPickerOffer.supplierItemId,
              quantity: totalQty,
              variants,
            })
          }}
        />
      )}
    </DetailPageContainer>
  )
}
