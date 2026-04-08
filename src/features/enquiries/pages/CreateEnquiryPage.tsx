'use client'

import { useNavigate } from '@tanstack/react-router'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { MultiStepForm } from '@/components/MultiStepForm'
import { VariantQuantityDialog } from '@/features/catalog/components/VariantQuantityDialog'
import { enquiryApi, type EnquiryItemVariantInput } from '../api/enquiryApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { useAuthStore } from '@/stores/authStore'

const enquiryItemVariantSchema = z.object({
  supplierItemVariantId: z.string(),
  quantity: z.number().positive(),
})

const enquiryItemSchema = z.object({
  supplierItemId: z.string(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  notes: z.string().optional(),
  variants: z.array(enquiryItemVariantSchema).optional(),
  hasVariants: z.boolean(),
  itemName: z.string(),
})

const createEnquirySchema = z.object({
  enquiryType: z.enum(['General', 'ItemSpecific'] as const),
  supplierId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  items: z.array(enquiryItemSchema).optional(),
})

type CreateEnquiryFormData = z.infer<typeof createEnquirySchema>

export function CreateEnquiryPage() {
  const navigate = useNavigate()
  const customerId = useAuthStore((s) => s.user?.id)
  const [currentStep, setCurrentStep] = useState(0)
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<{
    index: number
    supplierItemId: string
    itemName: string
  } | null>(null)

  const form = useForm<CreateEnquiryFormData>({
    resolver: zodResolver(createEnquirySchema),
    defaultValues: {
      enquiryType: 'General',
      title: '',
      notes: '',
      items: [],
    },
  })

  const enquiryType = form.watch('enquiryType')
  const supplierId = form.watch('supplierId')
  const items = form.watch('items')

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
    mutationFn: (data: CreateEnquiryFormData) => enquiryApi.create(data),
    onSuccess: (enquiryId) => {
      navigate({ to: `/enquiries/${enquiryId}` })
    },
  })

  // Determine which steps to show based on enquiry type
  const allSteps = [
    { title: 'Details', description: 'Enquiry type and basic information' },
    { title: 'Supplier', description: 'Select a supplier' },
    { title: 'Items', description: 'Add items to the enquiry' },
    { title: 'Review', description: 'Review and submit' },
  ]

  const visibleSteps = useMemo(() => {
    if (enquiryType === 'General') {
      return [allSteps[0], allSteps[3]]
    }
    return allSteps
  }, [enquiryType])

  // Map current visual step to allSteps index
  const getActualStepIndex = (visualStep: number) => {
    if (enquiryType === 'General') {
      return visualStep === 0 ? 0 : 3
    }
    return visualStep
  }

  const handleNext = () => {
    if (currentStep < visibleSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = form.handleSubmit((data) => {
    // For General enquiries, don't send supplier/items
    const submitData: CreateEnquiryFormData = data.enquiryType === 'General'
      ? {
          ...data,
          supplierId: undefined,
          items: undefined,
        }
      : data
    createMutation.mutate(submitData)
  })

  const handleAddItem = () => {
    appendItem({
      supplierItemId: '',
      quantity: 1,
      itemName: '',
      hasVariants: false,
    })
  }

  const handleItemSelect = (itemIndex: number, availableItemId: string) => {
    const availableItem = availableItems.find((item) => item.id === availableItemId)
    if (availableItem) {
      if (availableItem.hasVariants) {
        setSelectedItemForVariants({
          index: itemIndex,
          supplierItemId: availableItemId,
          itemName: availableItem.resolvedName,
        })
        setVariantDialogOpen(true)
      } else {
        updateItem(itemIndex, {
          supplierItemId: availableItemId,
          quantity: 1,
          itemName: availableItem.resolvedName,
          hasVariants: false,
        })
      }
    }
  }

  const handleVariantConfirm = (variants: Array<{ variantId: string; quantity: number }>) => {
    if (selectedItemForVariants) {
      const totalQty = variants.reduce((sum, v) => sum + v.quantity, 0)
      const mappedVariants: EnquiryItemVariantInput[] = variants.map((v) => ({
        supplierItemVariantId: v.variantId,
        quantity: v.quantity,
      }))
      updateItem(selectedItemForVariants.index, {
        supplierItemId: selectedItemForVariants.supplierItemId,
        quantity: totalQty,
        itemName: selectedItemForVariants.itemName,
        hasVariants: true,
        variants: mappedVariants,
      })
      setVariantDialogOpen(false)
      setSelectedItemForVariants(null)
    }
  }

  const canProceedToNext = () => {
    const actualStep = getActualStepIndex(currentStep)
    switch (actualStep) {
      case 0: // Details
        return form.formState.isValid && form.watch('title').trim() !== ''
      case 1: // Supplier
        return form.formState.isValid && supplierId !== undefined
      case 2: // Items
        return form.formState.isValid && itemFields.length > 0 && itemFields.every((item) => item.supplierItemId)
      case 3: // Review
        return true
      default:
        return false
    }
  }

  const renderStepContent = () => {
    const actualStep = getActualStepIndex(currentStep)

    switch (actualStep) {
      case 0: // Details
        return (
          <div className="space-y-4">
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

            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enquiry title" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" placeholder="Additional details..." {...form.register('notes')} />
            </div>
          </div>
        )

      case 1: // Supplier
        return (
          <div className="space-y-4">
            <div>
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
              {form.formState.errors.supplierId && (
                <p className="mt-1 text-sm text-red-500">Supplier is required</p>
              )}
            </div>
          </div>
        )

      case 2: // Items
        return (
          <div className="space-y-4">
            {itemFields.length === 0 ? (
              <p className="text-sm text-gray-500">No items added yet.</p>
            ) : (
              <div className="space-y-3">
                {itemFields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-end gap-4">
                          <div className="flex-1">
                            <Label htmlFor={`item-${index}`}>Item</Label>
                            <Controller
                              control={form.control}
                              name={`items.${index}.supplierItemId`}
                              render={({ field: selectField }) => (
                                <Select
                                  value={selectField.value || ''}
                                  onValueChange={(value) =>
                                    handleItemSelect(index, value)
                                  }
                                >
                                  <SelectTrigger id={`item-${index}`}>
                                    <SelectValue placeholder="Select item..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableItems.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.resolvedName}
                                        {item.hasVariants && ' (has variants)'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {!items?.[index]?.hasVariants && (
                          <div>
                            <Label htmlFor={`qty-${index}`}>Quantity</Label>
                            <Input
                              id={`qty-${index}`}
                              type="number"
                              min="1"
                              {...form.register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                            />
                          </div>
                        )}

                        {items?.[index]?.hasVariants && items[index]?.variants && (
                          <div className="rounded bg-slate-50 p-3">
                            <p className="text-sm font-medium">Variants:</p>
                            <div className="mt-2 space-y-1 text-sm">
                              {items[index].variants.map((v, vIdx) => (
                                <p key={vIdx} className="text-gray-600">
                                  Variant {vIdx + 1}: Qty {v.quantity}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor={`notes-${index}`}>Notes (optional)</Label>
                          <Input
                            id={`notes-${index}`}
                            placeholder="Item notes..."
                            {...form.register(`items.${index}.notes`)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button onClick={handleAddItem} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        )

      case 3: // Review
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="font-semibold">Enquiry Details</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-gray-600">Type:</dt>
                  <dd className="text-gray-900">{enquiryType}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Title:</dt>
                  <dd className="text-gray-900">{form.watch('title')}</dd>
                </div>
                {form.watch('notes') && (
                  <div>
                    <dt className="font-medium text-gray-600">Notes:</dt>
                    <dd className="text-gray-900">{form.watch('notes')}</dd>
                  </div>
                )}
                {enquiryType === 'ItemSpecific' && supplierId && (
                  <div>
                    <dt className="font-medium text-gray-600">Supplier:</dt>
                    <dd className="text-gray-900">
                      {suppliers.find((s: typeof suppliers[0]) => s.id === supplierId)?.name}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {enquiryType === 'ItemSpecific' && itemFields.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-semibold">Items ({itemFields.length})</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {itemFields.map((field, index) => {
                    const item = items?.[index]
                    return (
                      <div key={field.id} className="flex justify-between">
                        <span>{item?.itemName}</span>
                        <Badge variant="secondary">Qty: {item?.quantity}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6 p-6">
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

      <MultiStepForm
        steps={visibleSteps}
        currentStep={currentStep}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        canProceed={canProceedToNext()}
        submitLabel="Create Enquiry"
      >
        {renderStepContent()}
      </MultiStepForm>

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
