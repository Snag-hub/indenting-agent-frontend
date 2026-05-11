import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState, useEffect } from 'react'
// Typed route gives access to the optional `enquiryId` search param
import { Route } from '@/routes/_app.rfqs.new'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { rfqApi } from '@/features/rfqs/api/rfqApi'
import { enquiryApi, type AvailableEnquiryItemDto } from '@/features/enquiries/api/enquiryApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { queryKeys } from '@/lib/queryKeys'
import { VariantSelector } from '@/components/forms/VariantSelector'
import { ItemPicker } from '@/components/ItemPicker'
import { MultiStepForm } from '@/components/MultiStepForm'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

// Zod schema
const rfqItemVariantSchema = z.object({
  supplierItemVariantId: z.string(),
  quantity: z.number().min(1),
  dimensionSummary: z.string().optional(),
  sku: z.string().nullable().optional(),
})

const rfqItemSchema = z.object({
  supplierItemId: z.string().min(1, 'Item ID required'),
  itemName: z.string().optional(),
  hasVariants: z.boolean().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  variants: z.array(rfqItemVariantSchema).optional(),
  notes: z.string().optional(),
  checked: z.boolean(),
})

const createRFQSchema = z.object({
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  enquiryId: z.string().optional(),
  supplierIds: z.array(z.string()).min(1, 'Select at least one supplier'),
  items: z.array(rfqItemSchema),
})

type CreateRFQForm = z.infer<typeof createRFQSchema>

export function CreateRFQPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)

  // Read optional `enquiryId` URL param set by the EnquiryDetailPage "Create RFQ" button
  const { enquiryId: enquiryIdParam } = Route.useSearch()
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | undefined>()
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [selectedItemForVariant, setSelectedItemForVariant] = useState<{
    fieldIndex?: number   // set when editing an existing item
    id: string            // supplierItemId for the variant dialog
    name: string
  } | undefined>()

  const form = useForm<CreateRFQForm>({
    resolver: zodResolver(createRFQSchema),
    defaultValues: {
      notes: '',
      dueDate: '',
      enquiryId: undefined,
      supplierIds: [],
      items: [],
    },
  })
  const { control, register, watch, setValue, getValues, formState: { errors } } = form

  const { fields: itemFields, append: appendItem, remove: removeItem, update: updateItem } = useFieldArray({
    control,
    name: 'items',
  })

  // Fetch all enquiries (not just Open, to support linking to enquiries in any status)
  const { data: enquiriesResult } = useQuery({
    queryKey: ['enquiries', 'list'],
    queryFn: () =>
      enquiryApi.list({ page: 1, pageSize: 100 }),
  })
  const enquiries = enquiriesResult?.data ?? []

  // Fetch all suppliers
  const { data: suppliersResult } = useQuery({
    queryKey: queryKeys.suppliers.list(),
    queryFn: () => supplierApi.list({ page: 1, pageSize: 1000 }),
  })
  const suppliers = suppliersResult?.data ?? []

  const watchedSupplierIds = watch('supplierIds')
  // Live form items — used so re-renders pick up checkbox toggles (useFieldArray's
  // `fields` snapshot keeps the original `checked: true` and never updates).
  const watchedItems = watch('items') ?? []
  // Use the first selected supplier only for the manual ItemPicker filter
  const primarySupplierId = watchedSupplierIds[0]

  // Fetch ALL enquiry items across all suppliers — backend will split items per supplier on create
  // This includes variant data for the selected item
  const { data: enquiryItems = [] } = useQuery({
    queryKey: queryKeys.rfqs.enquiryItems(selectedEnquiryId ?? '', 'all'),
    queryFn: () => rfqApi.getEnquiryItems(selectedEnquiryId!),
    enabled: !!selectedEnquiryId,
  })

  // Fetch full enquiry detail with variant information for displaying enquiry quantities
  useQuery({
    queryKey: queryKeys.enquiries.detail(selectedEnquiryId ?? ''),
    queryFn: () => enquiryApi.get(selectedEnquiryId!),
    enabled: !!selectedEnquiryId,
  })

  // Create RFQ mutation
  const createRFQ = useMutation({
    mutationFn: (data: CreateRFQForm) => {
      const checkedItems = data.items.filter((i) => i.checked)
      return rfqApi.create({
        notes: data.notes || undefined,
        dueDate: data.dueDate || undefined,
        enquiryId: data.enquiryId || undefined,
        supplierIds: data.supplierIds,
        items: checkedItems.map(({ supplierItemId, quantity, notes, variants }) => {
          // CRITICAL: Filter out any variants with 0 quantity - only send variants that were explicitly selected
          const hasVariants = variants && Array.isArray(variants) && variants.length > 0
          const validVariants = hasVariants
            ? variants.filter((v) => v.quantity && v.quantity > 0)
            : []

          return {
            supplierItemId,
            quantity,
            notes: notes || undefined,
            // Only include variants if there are valid (non-zero) variants
            variants: validVariants.length > 0 ? validVariants : undefined,
          }
        }),
      })
    },
    onSuccess: (rfqIds) => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      toast.success(`${rfqIds.length} RFQ${rfqIds.length !== 1 ? 's' : ''} created successfully`)
      // Navigate back to the enquiry if one was linked, otherwise go to RFQ list
      const linkedEnquiryId = watch('enquiryId')
      if (linkedEnquiryId) {
        navigate({ to: '/enquiries/$id', params: { id: linkedEnquiryId } })
      } else {
        navigate({ to: '/rfqs' })
      }
    },
    onError: () => toast.error('Failed to create RFQ'),
  })

  // Auto-select the enquiry passed via URL param (from EnquiryDetailPage "Create RFQ" button).
  // Runs once after the enquiries list loads so the form value and local state stay in sync.
  useEffect(() => {
    if (enquiryIdParam && enquiries.length > 0) {
      setValue('enquiryId', enquiryIdParam)
      handleEnquiryChange(enquiryIdParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiryIdParam, enquiries.length])

  // Populate items when enquiry items are fetched
  useEffect(() => {
    if (selectedEnquiryId && enquiryItems.length > 0 && itemFields.length === 0) {
      enquiryItems.forEach((item) => {
        appendItem({
          supplierItemId: item.supplierItemId,
          itemName: item.itemName,
          hasVariants: item.hasVariants,
          quantity: item.suggestedQuantity,
          variants: [],
          notes: item.notes || '',
          checked: true,
        })
      })
    }
  }, [selectedEnquiryId, enquiryItems, itemFields.length, appendItem])

  const handleEnquiryChange = (enquiryId: string) => {
    const actualId = enquiryId === '__none__' ? undefined : enquiryId
    if (actualId) {
      // Remove all items safely by iterating in reverse (avoids index-shift bug)
      for (let i = itemFields.length - 1; i >= 0; i--) removeItem(i)
      setSelectedEnquiryId(actualId)
    } else {
      setSelectedEnquiryId(undefined)
      for (let i = itemFields.length - 1; i >= 0; i--) removeItem(i)
    }
  }

  const handleAddAvailableItem = (item: AvailableEnquiryItemDto) => {
    const resolvedSupplierItemId = item.supplierItemId ?? item.id

    if (item.hasVariants) {
      setSelectedItemForVariant({
        id: resolvedSupplierItemId,
        name: item.resolvedName,
      })
      setVariantDialogOpen(true)
    } else {
      appendItem({
        supplierItemId: resolvedSupplierItemId,
        itemName: item.resolvedName,
        hasVariants: false,
        quantity: 1,
        variants: [],
        notes: '',
        checked: true,
      })
    }
  }

  const handleEditVariants = (idx: number) => {
    const field = itemFields[idx]
    if (!field) return

    setSelectedItemForVariant({
      fieldIndex: idx,
      id: field.supplierItemId,
      name: field.itemName ?? '',
    })
    setVariantDialogOpen(true)
  }

  const handleVariantConfirm = (variants: Array<{ variantId: string; quantity: number; dimensionSummary: string; sku: string | null; price?: number; enquiryQuantity?: number; remainingQuantity?: number }>) => {
    if (!selectedItemForVariant) return
    const totalQty = variants.reduce((sum, v) => sum + v.quantity, 0)
    const mappedVariants = variants.map((v) => ({
      supplierItemVariantId: v.variantId,
      quantity: v.quantity,
      dimensionSummary: v.dimensionSummary,
      sku: v.sku,
    }))

    if (selectedItemForVariant.fieldIndex !== undefined) {
      // Editing existing item
      const existing = itemFields[selectedItemForVariant.fieldIndex]
      updateItem(selectedItemForVariant.fieldIndex, {
        ...existing,
        quantity: totalQty,
        hasVariants: true,
        variants: mappedVariants,
      })
    } else {
      // Adding new item
      appendItem({
        supplierItemId: selectedItemForVariant.id,
        itemName: selectedItemForVariant.name,
        hasVariants: true,
        quantity: totalQty,
        variants: mappedVariants,
        notes: '',
        checked: true,
      })
    }

    setVariantDialogOpen(false)
    setSelectedItemForVariant(undefined)
  }

  /**
   * Toggle a supplier in/out of the selected set.
   * Items are NOT cleared when toggling suppliers — in a multi-supplier RFQ the
   * same item list is sent to all suppliers. Each supplier quotes on the same items.
   */
  const handleSupplierToggle = (supplierId: string) => {
    const current = watchedSupplierIds
    const next = current.includes(supplierId)
      ? current.filter((id) => id !== supplierId)
      : [...current, supplierId]
    setValue('supplierIds', next)
  }


  // Step 1: RFQ Details
  const Step1 = (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="enquiryId">Link to Enquiry (optional)</Label>
        <Controller
          control={control}
          name="enquiryId"
          render={({ field }) => (
            <Select
              value={field.value ?? '__none__'}
              onValueChange={(v) => {
                field.onChange(v === '__none__' ? undefined : v)
                handleEnquiryChange(v)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No enquiry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No enquiry</SelectItem>
                {enquiries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title || e.documentNumber || 'Untitled'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes..."
          className="min-h-24"
          {...register('notes')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="dueDate">Due Date (optional)</Label>
        <Input
          id="dueDate"
          type="date"
          {...register('dueDate')}
        />
      </div>
    </div>
  )

  // Step 2: Supplier + Items
  const Step2 = (
    <div className="space-y-6">
      {/* Supplier Selection — multi-select checkboxes; each chosen supplier receives this RFQ */}
      <div className="space-y-2">
        <Label>Select Suppliers * <span className="text-xs text-muted-foreground">(pick one or more)</span></Label>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 max-h-48 overflow-y-auto border rounded-md p-2">
          {suppliers.map((s) => (
            // NOTE: do NOT use <label> wrapper here — Radix Checkbox renders a hidden <input>
            // inside, so a <label> parent causes double-firing (toggle on + toggle off = no change).
            // Instead: Checkbox handles its own click; span handles text click.
            <div key={s.id} className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded">
              <Checkbox
                checked={watchedSupplierIds.includes(s.id)}
                onCheckedChange={() => handleSupplierToggle(s.id)}
              />
              <span
                className="text-sm cursor-pointer select-none flex-1"
                onClick={() => handleSupplierToggle(s.id)}
              >
                {s.name}
              </span>
            </div>
          ))}
          {suppliers.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">No suppliers available</p>
          )}
        </div>
        {errors.supplierIds && <p className="text-xs text-destructive">{errors.supplierIds.message}</p>}
      </div>

      {/* Items Section - Only show once at least one supplier is selected */}
      {watchedSupplierIds.length > 0 && (
        <div className="space-y-4">
          {!selectedEnquiryId ? (
            // No enquiry: item browser (filtered by primary supplier catalog)
            <div className="space-y-2">
              <Label>Browse & Add Items</Label>
              <ItemPicker
                supplierId={primarySupplierId}
                selectedItemIds={itemFields.map((f) => f.supplierItemId)}
                onSelect={handleAddAvailableItem}
              />
            </div>
          ) : (
            // Enquiry selected: show enquiry items table
            enquiryItems.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Enquiry</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="w-24">This RFQ</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemFields.map((field, idx) => {
                      const enquiryItem = enquiryItems.find((i) => i.supplierItemId === field.supplierItemId)
                      const enquiryQty = enquiryItem?.suggestedQuantity ?? 0
                      const allocated = enquiryItem?.allocatedQuantity ?? 0
                      const available = enquiryItem?.availableQuantity ?? enquiryQty
                      const currentQty = field.quantity ?? 0
                      const balance = available - currentQty

                      return (
                        <React.Fragment key={field.id}>
                          <TableRow className={available === 0 ? 'opacity-50' : ''}>
                            <TableCell>
                              <Controller
                                control={control}
                                name={`items.${idx}.checked`}
                                render={({ field: checkField }) => (
                                  <Checkbox
                                    checked={checkField.value && available > 0}
                                    disabled={available === 0}
                                    onCheckedChange={(checked) => checkField.onChange(!!checked)}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-2">
                                {enquiryItem?.itemName ?? field.itemName}
                                {field.hasVariants && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => handleEditVariants(idx)}
                                  >
                                    {field.variants && field.variants.length > 0
                                      ? `Edit Variants (${field.variants.length})`
                                      : 'Select Variants'}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {enquiryItem?.supplierName ?? '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{enquiryQty}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{allocated}</TableCell>
                            <TableCell>
                              {field.hasVariants ? (
                                <span className="text-xs text-muted-foreground">{currentQty} total</span>
                              ) : (
                                <Controller
                                  control={control}
                                  name={`items.${idx}.quantity`}
                                  render={({ field: qtyField }) => (
                                    <Input
                                      type="number"
                                      min="1"
                                      max={available}
                                      className="w-16"
                                      {...qtyField}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1
                                        qtyField.onChange(Math.min(val, available))
                                      }}
                                    />
                                  )}
                                />
                              )}
                            </TableCell>
                            <TableCell className={`text-right text-sm font-medium ${balance < 0 ? 'text-red-600' : balance === 0 ? 'text-slate-400' : 'text-green-700'}`}>
                              {balance}
                            </TableCell>
                            <TableCell className="text-sm">
                              <Controller
                                control={control}
                                name={`items.${idx}.notes`}
                                render={({ field: notesField }) => (
                                  <Input
                                    placeholder="—"
                                    className="text-xs"
                                    {...notesField}
                                  />
                                )}
                              />
                            </TableCell>
                          </TableRow>
                          {field.hasVariants && field.variants && field.variants.length > 0 &&
                            field.variants.map((v) => (
                              <TableRow key={`${field.id}-v-${v.supplierItemVariantId}`} className="bg-slate-50">
                                <TableCell />
                                <TableCell className="text-xs pl-8 text-slate-500" colSpan={3}>
                                  {v.dimensionSummary || v.sku || v.supplierItemVariantId.slice(0, 8) + '…'}
                                </TableCell>
                                <TableCell className="text-xs text-slate-500">{v.quantity}</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell />
                              </TableRow>
                            ))
                          }
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No items in selected enquiry</p>
            )
          )}

          {itemFields.length > 0 && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              {watchedItems.filter((f) => f.checked).length} of {itemFields.length} items selected
            </div>
          )}
        </div>
      )}
    </div>
  )

  // Step 3: Review & Create
  const Step3 = (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supplier(s):</span>
            <span className="font-medium text-right">
              {watchedSupplierIds.length > 0
                ? suppliers.filter((s) => watchedSupplierIds.includes(s.id)).map((s) => s.name).join(', ')
                : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Linked Enquiry:</span>
            <span className="font-medium">
              {selectedEnquiryId ? (enquiries.find((e) => e.id === selectedEnquiryId)?.title || enquiries.find((e) => e.id === selectedEnquiryId)?.documentNumber) : 'None'}
            </span>
          </div>
          {watch('dueDate') && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-medium">{format(new Date(watch('dueDate')!), 'dd MMM yyyy')}</span>
            </div>
          )}
          {watch('notes') && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Notes:</span>
              <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-xs">{watch('notes')}</p>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t">
            <span className="text-muted-foreground">Line Items:</span>
            <span className="font-semibold text-lg">
              {watchedItems.filter((f) => f.checked).length}
            </span>
          </div>
        </CardContent>
      </Card>

      {watchedItems.filter((f) => f.checked).length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {watchedItems
                .map((field, idx) => ({ field, fieldId: itemFields[idx]?.id ?? `${idx}` }))
                .filter(({ field }) => field.checked)
                .flatMap(({ field, fieldId }) => {
                  const itemName =
                    enquiryItems.find((i) => i.supplierItemId === field.supplierItemId)?.itemName ||
                    field.itemName ||
                    field.supplierItemId

                  const rows: React.ReactNode[] = [
                    <TableRow key={fieldId}>
                      <TableCell className="text-sm font-medium">{itemName}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {field.quantity}
                        {field.hasVariants && field.variants && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {field.variants.length} variant(s)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {field.notes || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>,
                  ]

                  // Add variant sub-rows if exists
                  if (field.hasVariants && field.variants && field.variants.length > 0) {
                    field.variants.forEach((variant) => {
                      rows.push(
                        <TableRow key={`${fieldId}-variant-${variant.supplierItemVariantId}`} className="bg-slate-50">
                          <TableCell className="text-xs pl-8 text-slate-600">
                            {variant.dimensionSummary || variant.sku || variant.supplierItemVariantId.slice(0, 8) + '…'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{variant.quantity}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )
                    })
                  }

                  return rows
                })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )

  const steps = [
    { title: 'RFQ Details', description: 'Enter RFQ information' },
    { title: 'Select Items', description: 'Choose items for this RFQ' },
    { title: 'Review & Create', description: 'Confirm and create' },
  ]

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleCreateRFQ = () => {
    const data = getValues()
    createRFQ.mutate(data as CreateRFQForm)
  }

  const canProceedStep1 = true // Step 1 always allows proceeding to supplier selection
  const canProceedStep2 = watchedSupplierIds.length > 0 && watchedItems.some((f) => f.checked)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Create RFQ"
          description="Set up a new request for quotation"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: '/rfqs' })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <MultiStepForm
        steps={steps}
        currentStep={currentStep}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleCreateRFQ}
        isSubmitting={createRFQ.isPending}
        canProceed={
          currentStep === 0 ? canProceedStep1 : currentStep === 1 ? canProceedStep2 : true
        }
        submitLabel="Create RFQ"
      >
        {currentStep === 0 && Step1}
        {currentStep === 1 && Step2}
        {currentStep === 2 && Step3}
      </MultiStepForm>

      {/* Variant Selection / Edit Dialog with clearer column headers */}
      {selectedItemForVariant && (
        <VariantSelector
          open={variantDialogOpen}
          onOpenChange={setVariantDialogOpen}
          supplierItemId={selectedItemForVariant.id}
          supplierItemName={selectedItemForVariant.name}
          mode={selectedEnquiryId ? 'enquiry' : 'simple'}
          enquiryId={selectedEnquiryId}
          initialQuantities={
            selectedItemForVariant.fieldIndex !== undefined
              ? Object.fromEntries(
                  (itemFields[selectedItemForVariant.fieldIndex]?.variants ?? []).map(
                    (v) => [v.supplierItemVariantId, v.quantity]
                  )
                )
              : undefined
          }
          maxTotal={
            selectedItemForVariant.fieldIndex !== undefined
              ? enquiryItems.find(
                  (i) => i.supplierItemId === itemFields[selectedItemForVariant.fieldIndex!]?.supplierItemId
                )?.availableQuantity
              : undefined
          }
          onConfirm={handleVariantConfirm}
        />
      )}
    </div>
  )
}
