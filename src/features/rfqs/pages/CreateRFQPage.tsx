import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { rfqApi } from '@/features/rfqs/api/rfqApi'
import { enquiryApi } from '@/features/enquiries/api/enquiryApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { queryKeys } from '@/lib/queryKeys'
import { VariantQuantityDialog } from '@/features/catalog/components/VariantQuantityDialog'
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

// Zod schema
const rfqItemVariantSchema = z.object({
  supplierItemVariantId: z.string(),
  quantity: z.number().min(1),
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
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  enquiryId: z.string().optional(),
  supplierId: z.string().min(1, 'A supplier must be selected'),
  items: z.array(rfqItemSchema),
})

type CreateRFQForm = z.infer<typeof createRFQSchema>

export function CreateRFQPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [itemSearch, setItemSearch] = useState('')
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | undefined>()
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [selectedItemForVariant, setSelectedItemForVariant] = useState<{ id: string; name: string } | undefined>()

  const { control, register, watch, setValue, formState: { errors } } = useForm<CreateRFQForm>({
    resolver: zodResolver(createRFQSchema),
    defaultValues: {
      title: '',
      notes: '',
      dueDate: '',
      enquiryId: undefined,
      supplierId: '',
      items: [],
    },
  })

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: 'items',
  })

  // Fetch open enquiries
  const { data: enquiries = [] } = useQuery({
    queryKey: ['enquiries', 'list', { status: 'Open' }],
    queryFn: () =>
      enquiryApi.list({ status: 'Open', page: 1, pageSize: 100 }).then((r) => r.data ?? []),
  })

  // Fetch all suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: queryKeys.suppliers.list(),
    queryFn: () => supplierApi.list({ page: 1, pageSize: 1000 }).then((r) => r.data ?? []),
  })

  const watchedSupplierId = watch('supplierId')

  // Fetch enquiry items when enquiry is selected
  const { data: enquiryItems = [] } = useQuery({
    queryKey: queryKeys.rfqs.enquiryItems(selectedEnquiryId ?? '', watchedSupplierId ?? ''),
    queryFn: () => rfqApi.getEnquiryItems(selectedEnquiryId!, watchedSupplierId),
    enabled: !!selectedEnquiryId && !!watchedSupplierId,
  })

  // Fetch supplier items for search
  const { data: supplierItemsResult } = useQuery({
    queryKey: ['supplier-items', 'browse', itemSearch, watchedSupplierId],
    queryFn: () =>
      supplierItemApi.browse({ page: 1, pageSize: 100, search: itemSearch, supplierId: watchedSupplierId }),
    enabled: currentStep === 1 && !selectedEnquiryId && itemSearch.length > 0 && !!watchedSupplierId,
  })

  // Create RFQ mutation
  const createRFQ = useMutation({
    mutationFn: (data: CreateRFQForm) => {
      const checkedItems = data.items.filter((i) => i.checked)
      return rfqApi.create({
        title: data.title,
        notes: data.notes || undefined,
        dueDate: data.dueDate || undefined,
        enquiryId: data.enquiryId || undefined,
        supplierId: data.supplierId,
        items: checkedItems.map(({ supplierItemId, quantity, notes }) => ({
          supplierItemId,
          quantity,
          notes,
        })),
      })
    },
    onSuccess: (rfqId) => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      navigate({ to: '/rfqs/$id', params: { id: rfqId } })
    },
  })

  // Populate items when enquiry items are fetched
  useEffect(() => {
    if (selectedEnquiryId && enquiryItems.length > 0 && itemFields.length === 0) {
      enquiryItems.forEach((item) => {
        appendItem({
          supplierItemId: item.supplierItemId,
          quantity: item.suggestedQuantity,
          notes: item.notes || '',
          checked: true,
        })
      })
    }
  }, [selectedEnquiryId, enquiryItems, itemFields.length, appendItem])

  const handleEnquiryChange = (enquiryId: string) => {
    const actualId = enquiryId === '__none__' ? undefined : enquiryId
    if (actualId) {
      // Clear existing items before selecting new enquiry
      itemFields.forEach((_, idx) => removeItem(idx))
      setSelectedEnquiryId(actualId)
    } else {
      setSelectedEnquiryId(undefined)
      // Clear items from enquiry
      itemFields.forEach((_, idx) => removeItem(idx))
    }
  }

  const handleSupplierChange = (supplierId: string) => {
    const actualId = supplierId === '__none__' ? '' : supplierId
    setValue('supplierId', actualId)
    // Clear items when supplier changes
    itemFields.forEach((_, idx) => removeItem(idx))
  }

  const handleAddSupplierItem = (itemId: string) => {
    const item = supplierItemsResult?.data?.find((i) => i.id === itemId)
    if (item) {
      // Check if item has variants
      const supplierItem = supplierItemsResult?.data?.find((i) => i.id === itemId)
      if (supplierItem) {
        // For now, add directly with quantity 1 and check variants separately
        appendItem({
          supplierItemId: item.id,
          itemName: item.name,
          hasVariants: false,
          quantity: 1,
          variants: undefined,
          notes: '',
          checked: true,
        })
        setItemSearch('')
      }
    }
  }

  const handleVariantConfirm = (variants: Array<{ variantId: string; quantity: number }>) => {
    if (selectedItemForVariant) {
      const totalQty = variants.reduce((sum, v) => sum + v.quantity, 0)
      appendItem({
        supplierItemId: selectedItemForVariant.id,
        itemName: selectedItemForVariant.name,
        hasVariants: true,
        quantity: totalQty,
        variants: variants.map(v => ({
          supplierItemVariantId: v.variantId,
          quantity: v.quantity,
        })),
        notes: '',
        checked: true,
      })
      setVariantDialogOpen(false)
      setSelectedItemForVariant(undefined)
      setItemSearch('')
    }
  }

  // Step 1: RFQ Details
  const Step1 = (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">RFQ Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Q1 2024 supplies"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

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
                    {e.title}
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
      {/* Supplier Selection */}
      <div className="space-y-2">
        <Label htmlFor="supplierId">Select Supplier *</Label>
        <Controller
          control={control}
          name="supplierId"
          render={({ field }) => (
            <Select value={field.value ?? '__none__'} onValueChange={handleSupplierChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>
                  Select supplier
                </SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
      </div>

      {/* Items Section - Only show if supplier selected */}
      {watchedSupplierId && (
        <div className="space-y-4">
          {!selectedEnquiryId ? (
            // No enquiry: supplier item search
            <>
              <div className="space-y-1">
                <Label htmlFor="itemSearch">Search Items</Label>
                <Input
                  id="itemSearch"
                  placeholder="Search by name…"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>

              {itemSearch && supplierItemsResult?.data && supplierItemsResult.data.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Items</Label>
                  <div className="space-y-1">
                    {supplierItemsResult.data.map((item) => (
                      <Button
                        key={item.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleAddSupplierItem(item.id)}
                      >
                        {item.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Enquiry selected: show enquiry items table
            enquiryItems.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemFields.map((field, idx) => {
                      const item = enquiryItems.find((i) => i.supplierItemId === field.supplierItemId)
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`items.${idx}.checked`}
                              render={({ field: checkField }) => (
                                <Checkbox
                                  checked={checkField.value}
                                  onChange={(e) => checkField.onChange(e.currentTarget.checked)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{item?.itemName}</TableCell>
                          <TableCell className="text-sm">
                            <Controller
                              control={control}
                              name={`items.${idx}.quantity`}
                              render={({ field: qtyField }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-16"
                                  {...qtyField}
                                  onChange={(e) => qtyField.onChange(parseInt(e.target.value))}
                                />
                              )}
                            />
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
              {itemFields.filter((f) => f.checked).length} of {itemFields.length} items selected
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
            <span className="text-muted-foreground">RFQ Title:</span>
            <span className="font-medium">{watch('title') || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supplier:</span>
            <span className="font-medium">
              {suppliers.find((s) => s.id === watchedSupplierId)?.name || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Linked Enquiry:</span>
            <span className="font-medium">
              {selectedEnquiryId ? enquiries.find((e) => e.id === selectedEnquiryId)?.title : 'None'}
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
              {itemFields.filter((f) => f.checked).length}
            </span>
          </div>
        </CardContent>
      </Card>

          {itemFields.filter((f) => f.checked).length > 0 && (
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
              {itemFields
                .filter((f) => f.checked)
                .flatMap((field) => {
                  const itemName =
                    enquiryItems.find((i) => i.supplierItemId === field.supplierItemId)?.itemName ||
                    supplierItemsResult?.data?.find((i) => i.id === field.supplierItemId)?.name ||
                    field.itemName ||
                    field.supplierItemId

                  const rows: React.ReactNode[] = [
                    <TableRow key={field.id}>
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
                        <TableRow key={`${field.id}-variant-${variant.supplierItemVariantId}`} className="bg-slate-50">
                          <TableCell className="text-xs pl-8 text-slate-600">
                            Variant Detail
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
    const title = watch('title')
    if (currentStep === 0 && (!title || errors.title)) {
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleCreateRFQ = () => {
    const data = watch()
    createRFQ.mutate(data as CreateRFQForm)
  }

  const canProceedStep1 = !!watch('title') && !errors.title
  const canProceedStep2 = !!watchedSupplierId && itemFields.some((f) => f.checked)

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

      {/* Variant Selection Dialog */}
      {selectedItemForVariant && (
        <VariantQuantityDialog
          open={variantDialogOpen}
          onOpenChange={setVariantDialogOpen}
          supplierItemId={selectedItemForVariant.id}
          supplierItemName={selectedItemForVariant.name}
          onConfirm={handleVariantConfirm}
        />
      )}
    </div>
  )
}
