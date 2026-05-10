'use client'

import { useNavigate } from '@tanstack/react-router'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { VariantQuantityDialog } from '@/features/catalog/components/VariantQuantityDialog'
import { enquiryApi } from '../api/enquiryApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { useAuthStore } from '@/stores/authStore'

const enquiryItemVariantSchema = z.object({
  supplierItemVariantId: z.string(),
  quantity: z.number().positive(),
  dimensionSummary: z.string().optional(),
  sku: z.string().nullable().optional(),
})

const enquiryItemSchema = z.object({
  supplierItemId: z.string(),
  availableItemId: z.string(), // tracks which dropdown option is selected (for display)
  quantity: z.number().positive('Quantity must be greater than 0'),
  notes: z.string().optional(),
  variants: z.array(enquiryItemVariantSchema).optional(),
  hasVariants: z.boolean(),
  itemName: z.string(),
})

const createEnquirySchema = z.object({
  enquiryType: z.enum(['General', 'ItemSpecific'] as const),
  supplierId: z.string().optional(),
  title: z.string().optional(),
  addTitle: z.boolean().default(false),
  notes: z.string().optional(),
  items: z.array(enquiryItemSchema).optional(),
})

type CreateEnquiryFormData = z.infer<typeof createEnquirySchema>

export function CreateEnquiryPage() {
  const navigate = useNavigate()
  const customerId = useAuthStore((s) => s.user?.id)
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<{
    index: number
    availableItemId: string
    supplierItemId: string
    itemName: string
  } | null>(null)

  const form = useForm<CreateEnquiryFormData>({
    resolver: zodResolver(createEnquirySchema) as any,
    defaultValues: {
      enquiryType: 'General',
      title: '',
      addTitle: false,
      notes: '',
      items: [],
    },
  })

  const enquiryType = form.watch('enquiryType')
  const supplierId = form.watch('supplierId')
  const items = form.watch('items')
  const addTitle = form.watch('addTitle')

  const { fields: itemFields, append: appendItem, remove: removeItem, update: updateItem } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // Fetch suppliers for customer
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', customerId],
    queryFn: () => supplierApi.list({ search: '', page: 1, pageSize: 100 }),
    enabled: !!customerId,
    select: (data) => (data ? data.data : []),
  })

  // Fetch available items for selected supplier
  const { data: availableItems = [] } = useQuery({
    queryKey: ['availableEnquiryItems', supplierId],
    queryFn: () => enquiryApi.availableItems({ supplierId }),
    enabled: supplierId !== undefined,
  })

  // Create enquiry mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof enquiryApi.create>[0]) => enquiryApi.create(data),
    onSuccess: (enquiryId) => {
      navigate({ to: '/enquiries/$id', params: { id: enquiryId } })
    },
  })

  const handleSubmit = () => {
    const data = form.getValues()

    if (data.enquiryType === 'General') {
      createMutation.mutate({
        enquiryType: 'General',
        title: addTitle ? data.title! : '',
        notes: data.notes || undefined,
        items: [],
      })
    } else {
      createMutation.mutate({
        enquiryType: 'ItemSpecific',
        supplierId: data.supplierId,
        title: addTitle ? data.title! : '',
        notes: data.notes || undefined,
        items: (data.items ?? []).map((item) => {
          const hasVariants = item.variants && Array.isArray(item.variants) && item.variants.length > 0
          const validVariants = hasVariants
            ? item.variants!.filter((v) => v.quantity && v.quantity > 0)
            : []

          return {
            supplierItemId: item.supplierItemId,
            quantity: item.quantity,
            notes: item.notes || undefined,
            variants: validVariants.length > 0
              ? validVariants.map((v) => ({
                  supplierItemVariantId: v.supplierItemVariantId,
                  quantityRequested: v.quantity,
                }))
              : undefined,
          }
        }),
      })
    }
  }

  const handleAddItem = () => {
    appendItem({
      supplierItemId: '',
      availableItemId: '',
      quantity: 1,
      itemName: '',
      hasVariants: false,
    })
  }

  const handleItemSelect = (itemIndex: number, availableItemId: string) => {
    const availableItem = availableItems.find((item) => item.id === availableItemId)
    if (availableItem) {
      // For Master type items, use the linked supplierItemId for variant loading and as the line item FK.
      // For Supplier type items, supplierItemId === id.
      const resolvedSupplierItemId = availableItem.supplierItemId ?? availableItemId

      if (availableItem.hasVariants) {
        setSelectedItemForVariants({
          index: itemIndex,
          availableItemId: availableItemId,
          supplierItemId: resolvedSupplierItemId,
          itemName: availableItem.resolvedName,
        })
        setVariantDialogOpen(true)
      } else {
        updateItem(itemIndex, {
          supplierItemId: resolvedSupplierItemId,
          availableItemId: availableItemId,
          quantity: 1,
          itemName: availableItem.resolvedName,
          hasVariants: false,
        })
      }
    }
  }

  const handleVariantConfirm = (variants: Array<{ variantId: string; quantity: number; dimensionSummary: string; sku: string | null }>) => {
    if (selectedItemForVariants) {
      const totalQty = variants.reduce((sum, v) => sum + v.quantity, 0)
      const mappedVariants = variants.map((v) => ({
        supplierItemVariantId: v.variantId,
        quantity: v.quantity,
        dimensionSummary: v.dimensionSummary,
        sku: v.sku,
      }))
      updateItem(selectedItemForVariants.index, {
        supplierItemId: selectedItemForVariants.supplierItemId,
        availableItemId: selectedItemForVariants.availableItemId,
        quantity: totalQty,
        itemName: selectedItemForVariants.itemName,
        hasVariants: true,
        variants: mappedVariants,
      })
      setVariantDialogOpen(false)
      setSelectedItemForVariants(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
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
            // General enquiry: single form
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
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

              <div className="space-y-3 border-t pt-4">
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
                  <Input
                    id="title"
                    placeholder="Enquiry title"
                    {...form.register('title')}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes & Description</Label>
                <Textarea
                  id="notes"
                  placeholder="Provide any additional details for suppliers..."
                  {...form.register('notes')}
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Enquiry'}
              </Button>
            </form>
          ) : (
            // ItemSpecific enquiry: 2-step form (Supplier + Items combined, then Review)
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

              {/* Supplier Selection */}
              <div className="border-t pt-4">
                <Label htmlFor="supplier">Select Supplier</Label>
                <Controller
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger id="supplier">
                        <SelectValue placeholder="Choose a supplier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier: typeof suppliers[0]) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Items Section */}
              {supplierId && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    <Button
                      type="button"
                      onClick={handleAddItem}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                  </div>

                  {itemFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No items added. Click "Add Item" to start.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {itemFields.map((field, index) => (
                        <Card key={field.id} className="bg-slate-50">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <Label htmlFor={`item-${index}`} className="text-xs">
                                    Item
                                  </Label>
                                  <Select
                                    value={items?.[index]?.availableItemId || ''}
                                    onValueChange={(value) => handleItemSelect(index, value)}
                                  >
                                    <SelectTrigger id={`item-${index}`} className="mt-1">
                                      <SelectValue placeholder="Select item..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableItems.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                          {item.resolvedName}
                                          {item.hasVariants && ' (variants)'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {!items?.[index]?.hasVariants && (
                                <div>
                                  <Label htmlFor={`qty-${index}`} className="text-xs">
                                    Quantity
                                  </Label>
                                  <Input
                                    id={`qty-${index}`}
                                    type="number"
                                    min="1"
                                    className="mt-1"
                                    {...form.register(`items.${index}.quantity`, {
                                      valueAsNumber: true,
                                    })}
                                  />
                                </div>
                              )}

                              {items?.[index]?.hasVariants && items[index]?.variants && (
                                <div className="rounded bg-white p-2 text-sm">
                                  <p className="font-medium text-xs">Variants selected:</p>
                                  <div className="mt-1 space-y-1">
                                    {items[index].variants.map((v, vIdx) => (
                                      <p key={vIdx} className="text-xs text-muted-foreground">
                                        {v.dimensionSummary || v.sku || `Variant ${vIdx + 1}`} — Qty {v.quantity}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title Toggle */}
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
                  <Input
                    id="title"
                    placeholder="Enquiry title"
                    {...form.register('title')}
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes & Description (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Provide any additional details..."
                  {...form.register('notes')}
                  rows={3}
                />
              </div>

              {/* Inline Review Summary */}
              {itemFields.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-4 border">
                  <p className="text-sm font-medium mb-2">Summary</p>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Supplier:</dt>
                      <dd className="font-medium">
                        {suppliers.find((s: typeof suppliers[0]) => s.id === supplierId)?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Items:</dt>
                      <dd className="font-medium">{itemFields.length}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || !supplierId || itemFields.length === 0}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Enquiry'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {selectedItemForVariants && (
        <VariantQuantityDialog
          open={variantDialogOpen}
          onOpenChange={setVariantDialogOpen}
          supplierItemId={selectedItemForVariants.supplierItemId}
          supplierItemName={selectedItemForVariants.itemName}
          onConfirm={handleVariantConfirm}
        />
      )}
    </div>
  )
}
