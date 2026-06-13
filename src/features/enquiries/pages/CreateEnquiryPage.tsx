'use client'

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, X } from 'lucide-react'
import { LineItemsEditor, type LineItem, type CatalogItem } from '@/components/LineItemsEditor'
import { enquiryApi, type EnquiryItemInput } from '../api/enquiryApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { useAuthStore } from '@/stores/authStore'

const createEnquirySchema = z.object({
  enquiryType: z.enum(['General', 'ItemSpecific'] as const),
  title: z.string().optional(),
  addTitle: z.boolean().default(false),
  notes: z.string().optional(),
})

type CreateEnquiryFormData = z.infer<typeof createEnquirySchema>

export function CreateEnquiryPage() {
  const navigate = useNavigate()
  const customerId = useAuthStore((s) => s.user?.id)
  const [supplierIds, setSupplierIds] = useState<string[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  // Tracks newly-added supplier IDs that need existing items fanned out to them
  // once their catalog data finishes loading.
  const [pendingFanOut, setPendingFanOut] = useState<Set<string>>(new Set())

  const form = useForm<CreateEnquiryFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createEnquirySchema) as any,
    defaultValues: {
      enquiryType: 'General',
      title: '',
      addTitle: false,
      notes: '',
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const enquiryType = form.watch('enquiryType')
  const addTitle = form.watch('addTitle')

  // Fetch suppliers for customer
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', customerId],
    queryFn: () => supplierApi.list({ search: '', page: 1, pageSize: 100 }),
    enabled: !!customerId,
    select: (data) => (data ? data.data : []),
  })

  // Fetch available items across selected suppliers
  const { data: availableItems = [] } = useQuery({
    queryKey: ['availableEnquiryItems', supplierIds.slice().sort().join(',')],
    queryFn: () => enquiryApi.availableItems({ supplierIds }),
    enabled: supplierIds.length > 0,
  })

  // Drop selected supplier IDs that are no longer permitted (defensive)
  const catalog: CatalogItem[] = useMemo(
    () =>
      availableItems.map((i) => ({
        id: i.id,
        label: i.resolvedName,
        offers: i.offers.map((o) => ({
          supplierId: o.supplierId,
          supplierName: o.supplierName,
          supplierItemId: o.supplierItemId,
          hasVariants: o.hasVariants,
          quantityTiers: o.quantityTiers,
        })),
      })),
    [availableItems],
  )

  function toggleSupplier(id: string, checked: boolean) {
    setSupplierIds((prev) => {
      const next = checked ? [...prev, id] : prev.filter((s) => s !== id)
      // Drop line items whose supplier was deselected
      setLineItems((items) => items.filter((li) => next.includes(li.supplierId)))
      return next
    })
    if (checked) {
      // Mark this supplier as needing fan-out once its catalog data loads
      setPendingFanOut((prev) => new Set([...prev, id]))
    } else {
      setPendingFanOut((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function removeSupplier(id: string) {
    setSupplierIds((prev) => prev.filter((s) => s !== id))
    setLineItems((items) => items.filter((li) => li.supplierId !== id))
    setPendingFanOut((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // When catalog data updates (new supplier's items loaded), fan out existing line items
  // to any newly-added suppliers that share the same master catalog item.
  useEffect(() => {
    if (pendingFanOut.size === 0 || lineItems.length === 0) return

    const addedKeys = new Set(lineItems.map((li) => `${li.supplierId}::${li.supplierItemId}`))
    const newItems: LineItem[] = []
    const processedSuppliers = new Set<string>()

    for (const newSupplierId of pendingFanOut) {
      // Wait until this supplier's offers have actually loaded into the catalog
      const hasInCatalog = catalog.some((ci) =>
        ci.offers.some((o) => o.supplierId === newSupplierId),
      )
      if (!hasInCatalog) continue

      processedSuppliers.add(newSupplierId)

      for (const li of lineItems) {
        // Find the catalog entry that produced this existing line item
        const catalogItem = catalog.find((ci) =>
          ci.offers.some(
            (o) =>
              o.supplierId === li.supplierId &&
              o.supplierItemId === li.supplierItemId,
          ),
        )
        if (!catalogItem) continue

        // Check if the new supplier also offers this same item
        const newOffer = catalogItem.offers.find((o) => o.supplierId === newSupplierId)
        if (!newOffer) continue // supplier doesn't carry this item — skip

        const key = `${newSupplierId}::${newOffer.supplierItemId}`
        if (addedKeys.has(key)) continue // already in the list

        addedKeys.add(key)
        newItems.push({
          id: crypto.randomUUID(),
          supplierId: newSupplierId,
          supplierName: newOffer.supplierName,
          supplierItemId: newOffer.supplierItemId,
          itemName: li.itemName,
          quantity: li.quantity,
          quantityTiers: newOffer.quantityTiers,
          hasVariants: newOffer.hasVariants,
          variants: [],
        })
      }
    }

    if (newItems.length > 0) {
      setLineItems((prev) => [...prev, ...newItems])
    }

    if (processedSuppliers.size > 0) {
      setPendingFanOut((prev) => {
        const next = new Set(prev)
        processedSuppliers.forEach((id) => next.delete(id))
        return next
      })
    }
  }, [catalog, pendingFanOut, lineItems])

  // Create enquiry / batch mutations
  const createGeneralMutation = useMutation({
    mutationFn: (data: Parameters<typeof enquiryApi.create>[0]) => enquiryApi.create(data),
    onSuccess: (enquiryId) => {
      navigate({ to: '/enquiries/$id', params: { id: enquiryId } })
    },
  })

  const createBatchMutation = useMutation({
    mutationFn: (data: Parameters<typeof enquiryApi.createBatch>[0]) => enquiryApi.createBatch(data),
    onSuccess: (ids) => {
      if (ids.length === 1) {
        navigate({ to: '/enquiries/$id', params: { id: ids[0] } })
      } else {
        toast.success(`Created ${ids.length} enquiries.`)
        navigate({ to: '/enquiries' })
      }
    },
  })

  const isSubmitting = createGeneralMutation.isPending || createBatchMutation.isPending

  const handleSubmit = () => {
    const data = form.getValues()

    if (data.enquiryType === 'General') {
      createGeneralMutation.mutate({
        enquiryType: 'General',
        title: addTitle ? data.title! : '',
        notes: data.notes || undefined,
        items: [],
      })
      return
    }

    // ItemSpecific — split lineItems by supplier and create one enquiry per supplier
    const bySupplier = new Map<string, LineItem[]>()
    for (const li of lineItems) {
      if (!bySupplier.has(li.supplierId)) bySupplier.set(li.supplierId, [])
      bySupplier.get(li.supplierId)!.push(li)
    }

    const entries = Array.from(bySupplier.entries()).map(([supplierId, items]) => ({
      supplierId,
      title: addTitle ? (data.title || undefined) : undefined,
      notes: data.notes || undefined,
      items: items.map<EnquiryItemInput>((item) => {
        const validVariants = item.variants.filter((v) => v.quantity > 0)
        return {
          supplierItemId: item.supplierItemId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          variants:
            validVariants.length > 0
              ? validVariants.map((v) => ({
                  supplierItemVariantId: v.supplierItemVariantId,
                  quantityRequested: v.quantity,
                }))
              : undefined,
        }
      }),
    }))

    createBatchMutation.mutate({ enquiries: entries })
  }

  const enquiryTypeField = (
    <div>
      <Label htmlFor="enquiryType">Enquiry Type</Label>
      <Controller
        control={form.control}
        name="enquiryType"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="enquiryType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General Enquiry</SelectItem>
              <SelectItem value="ItemSpecific">Item-Specific Enquiry</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
    </div>
  )

  const titleToggle = (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="addTitle"
          checked={addTitle}
          onCheckedChange={(checked) => form.setValue('addTitle', !!checked)}
        />
        <Label htmlFor="addTitle" className="font-normal cursor-pointer">
          Add a title (optional)
        </Label>
      </div>
      {addTitle && (
        <Input id="title" placeholder="Enquiry title" {...form.register('title')} />
      )}
    </div>
  )

  const notesField = (
    <div>
      <Label htmlFor="notes">Notes & Description</Label>
      <Textarea
        id="notes"
        placeholder="Provide any additional details for suppliers..."
        {...form.register('notes')}
        rows={4}
      />
    </div>
  )

  const enquiriesToCreate = useMemo(() => {
    const set = new Set(lineItems.map((li) => li.supplierId))
    return set.size
  }, [lineItems])

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/enquiries' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Enquiry</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          {enquiryType === 'General' ? (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {enquiryTypeField}
              {titleToggle}
              {notesField}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Enquiry'}
              </Button>
            </form>
          ) : (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {enquiryTypeField}

              {/* Supplier multi-select */}
              <div className="border-t pt-4 space-y-2">
                <Label>Suppliers (one enquiry will be created per supplier)</Label>
                {supplierIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {supplierIds.map((id) => {
                      const s = suppliers.find((x) => x.id === id)
                      if (!s) return null
                      return (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          {s.name}
                          <button
                            type="button"
                            onClick={() => removeSupplier(id)}
                            className="rounded-full hover:bg-muted p-0.5"
                            aria-label={`Remove ${s.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
                <div className="border rounded-md max-h-40 overflow-y-auto divide-y">
                  {suppliers.length === 0 && (
                    <div className="text-sm text-slate-500 py-2 px-3">No suppliers available.</div>
                  )}
                  {suppliers.map((s) => {
                    const checked = supplierIds.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleSupplier(s.id, !!c)}
                        />
                        {s.name}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Items Section */}
              {supplierIds.length > 0 && (
                <div className="border-t pt-4">
                  <LineItemsEditor
                    items={lineItems}
                    catalog={catalog}
                    onAdd={(item) => setLineItems((prev) => [...prev, item])}
                    onAddMany={(items) => setLineItems((prev) => [...prev, ...items])}
                    onRemove={(id) => setLineItems((prev) => prev.filter((i) => i.id !== id))}
                    onUpdate={(id, patch) =>
                      setLineItems((prev) =>
                        prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
                      )
                    }
                    emptyMessage='No items added. Click "Add Item" to start.'
                  />
                </div>
              )}

              {titleToggle}
              {notesField}

              {/* Summary */}
              {lineItems.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-4 border">
                  <p className="text-sm font-medium mb-2">Summary</p>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Suppliers:</dt>
                      <dd className="font-medium">{supplierIds.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Line items:</dt>
                      <dd className="font-medium">{lineItems.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Enquiries to create:</dt>
                      <dd className="font-medium">{enquiriesToCreate}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || supplierIds.length === 0 || lineItems.length === 0}
              >
                {isSubmitting
                  ? 'Creating...'
                  : enquiriesToCreate > 1
                    ? `Create ${enquiriesToCreate} Enquiries`
                    : 'Create Enquiry'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
