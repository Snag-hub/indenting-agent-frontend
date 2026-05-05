import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { rfqApi } from '@/features/rfqs/api/rfqApi'
import { quotationApi } from '@/features/quotations/api/quotationApi'
import { queryKeys } from '@/lib/queryKeys'
import { MultiStepForm } from '@/components/MultiStepForm'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { Route } from '@/routes/_app.quotations.new'

// ── Schema ────────────────────────────────────────────────────────────────────

const variantPriceSchema = z.object({
  supplierItemVariantId: z.string(),
  variantLabel: z.string(),
  rfqQty: z.number(),
  quantityOffered: z.number().min(1, 'Qty must be ≥ 1'),
  unitPrice: z.number().min(0, 'Price must be ≥ 0'),
})

const itemPriceSchema = z.object({
  supplierItemId: z.string(),
  itemName: z.string(),
  rfqQty: z.number(),
  quantityOffered: z.number().min(1, 'Qty must be ≥ 1'),
  unitPrice: z.number().min(0, 'Price must be ≥ 0'),
  hasVariants: z.boolean(),
  variants: z.array(variantPriceSchema),
})

const createQuotationSchema = z.object({
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  items: z.array(itemPriceSchema),
})

type CreateQuotationForm = z.infer<typeof createQuotationSchema>

// ── Steps config ──────────────────────────────────────────────────────────────

const STEPS = [
  { title: 'Basic Info', description: 'Add optional notes and validity date for your quotation.' },
  { title: 'Price Items', description: 'Set offered quantity and unit price for each item.' },
  { title: 'Review & Create', description: 'Review your quotation before submitting.' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateQuotationPage() {
  const { rfqId } = Route.useSearch()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const { data: rfq, isLoading } = useQuery({
    queryKey: queryKeys.rfqs.detail(rfqId),
    queryFn: () => rfqApi.get(rfqId),
    enabled: !!rfqId,
  })

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateQuotationForm>({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: { notes: '', validUntil: '', items: [] },
  })

  const { fields } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  // Populate form from RFQ once loaded
  useEffect(() => {
    if (!rfq) return
    reset({
      notes: '',
      validUntil: '',
      items: rfq.items.map(item => ({
        supplierItemId: item.supplierItemId,
        itemName: item.supplierItemName,
        rfqQty: item.quantity,
        quantityOffered: item.quantity,
        unitPrice: 0,
        hasVariants: (item.variants?.length ?? 0) > 0,
        variants: (item.variants ?? []).map(v => ({
          supplierItemVariantId: v.supplierItemVariantId,
          variantLabel: v.dimensionSummary || v.sku || v.supplierItemVariantId.slice(0, 8) + '…',
          rfqQty: v.quantityOffered,
          quantityOffered: v.quantityOffered,
          unitPrice: 0,
        })),
      })),
    })
  }, [rfq, reset])

  const toggleExpand = (idx: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const grandTotal = watchedItems.reduce((sum, item) => {
    if (item.hasVariants && item.variants.length > 0) {
      return sum + item.variants.reduce((s, v) => s + v.quantityOffered * (v.unitPrice || 0), 0)
    }
    return sum + item.quantityOffered * (item.unitPrice || 0)
  }, 0)

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      // 1. Create the quotation (backend seeds items at price 0, qty from RFQ)
      const quotationId = await quotationApi.create(rfqId)
      // 2. Fetch to get version + item IDs
      const quotation = await quotationApi.get(quotationId)
      const version = quotation.versions[0]
      // 3. Update each item sequentially — match by supplierItemId, not index, to avoid order mismatch
      for (const item of version.items) {
        const formItem = data.items.find(fi => fi.supplierItemId === item.supplierItemId)
        if (!formItem) continue
        await quotationApi.updateItem(quotationId, item.id, version.id, {
          quantity: formItem.quantityOffered,
          unitPrice: formItem.unitPrice,
          variants: formItem.hasVariants && formItem.variants.length > 0
            ? formItem.variants.map(v => ({
                supplierItemVariantId: v.supplierItemVariantId,
                quantity: v.quantityOffered,
                unitPrice: v.unitPrice,
              }))
            : undefined,
        })
      }
      navigate({ to: '/quotations/$id', params: { id: quotationId } })
    } finally {
      setIsSubmitting(false)
    }
  })

  if (isLoading || !rfq) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // ── Step 1: Basic Info ────────────────────────────────────────────────────

  const step1 = (
    <div className="space-y-6">
      {/* RFQ context card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground font-normal">RFQ Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Title</p>
              <p className="text-sm font-medium">{rfq.title}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Supplier</p>
              <p className="text-sm font-medium">{rfq.supplierName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Items</p>
              <p className="text-sm font-medium">{rfq.items.length}</p>
            </div>
            {rfq.dueDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <p className="text-sm">{format(new Date(rfq.dueDate), 'dd MMM yyyy')}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant="default">{rfq.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotation fields */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any terms, conditions or remarks for this quotation…"
            className="min-h-24"
            {...register('notes')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="validUntil">Valid Until (optional)</Label>
          <Input id="validUntil" type="date" {...register('validUntil')} className="max-w-xs" />
        </div>
      </div>
    </div>
  )

  // ── Step 2: Price Items ───────────────────────────────────────────────────

  const step2 = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set the quantity you can offer (≤ RFQ qty) and your unit price for each item.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">RFQ Qty</TableHead>
              <TableHead className="text-right">Offered Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, idx) => {
              const item = watchedItems[idx]
              const isExpanded = expandedItems.has(idx)
              const lineTotal = item?.hasVariants && item.variants.length > 0
                ? item.variants.reduce((s, v) => s + v.quantityOffered * (v.unitPrice || 0), 0)
                : (item?.quantityOffered ?? 0) * (item?.unitPrice || 0)

              return [
                <TableRow
                  key={field.id}
                  className={item?.hasVariants ? 'cursor-pointer select-none' : ''}
                  onClick={item?.hasVariants ? () => toggleExpand(idx) : undefined}
                >
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-1">
                      {item?.hasVariants && (
                        isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>{item?.itemName}</span>
                      {item?.hasVariants && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {item.variants.length} variant{item.variants.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{item?.rfqQty}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    {!item?.hasVariants && (
                      <Controller
                        control={control}
                        name={`items.${idx}.quantityOffered`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            min="1"
                            max={item?.rfqQty}
                            className="w-20 text-right ml-auto"
                            value={f.value}
                            onChange={e => {
                              const v = parseInt(e.target.value) || 1
                              f.onChange(Math.min(v, item?.rfqQty ?? v))
                            }}
                          />
                        )}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    {!item?.hasVariants && (
                      <Controller
                        control={control}
                        name={`items.${idx}.unitPrice`}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 text-right ml-auto"
                            value={f.value}
                            onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                          />
                        )}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {lineTotal > 0 ? lineTotal.toFixed(2) : '—'}
                  </TableCell>
                </TableRow>,

                // Variant sub-rows
                ...(item?.hasVariants && isExpanded
                  ? item.variants.map((v, vIdx) => {
                      const vTotal = v.quantityOffered * (v.unitPrice || 0)
                      return (
                        <TableRow key={`${field.id}-v${vIdx}`} className="bg-muted/30">
                          <TableCell className="pl-10 py-2 text-xs text-muted-foreground">
                            {v.variantLabel}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground py-2">
                            {v.rfqQty}
                          </TableCell>
                          <TableCell className="text-right py-2" onClick={e => e.stopPropagation()}>
                            <Controller
                              control={control}
                              name={`items.${idx}.variants.${vIdx}.quantityOffered`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  max={v.rfqQty}
                                  className="w-20 text-right ml-auto"
                                  value={f.value}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 1
                                    f.onChange(Math.min(val, v.rfqQty))
                                  }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right py-2" onClick={e => e.stopPropagation()}>
                            <Controller
                              control={control}
                              name={`items.${idx}.variants.${vIdx}.unitPrice`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-28 text-right ml-auto"
                                  value={f.value}
                                  onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground py-2">
                            {vTotal > 0 ? vTotal.toFixed(2) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  : []),
              ]
            })}

            {/* Grand total */}
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={4} className="text-right text-sm">Grand Total</TableCell>
              <TableCell className="text-right text-sm">{grandTotal.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {errors.items && (
        <p className="text-xs text-destructive">Please ensure all quantities and prices are valid.</p>
      )}
    </div>
  )

  // ── Step 3: Review ────────────────────────────────────────────────────────

  const notes = watch('notes')
  const validUntil = watch('validUntil')

  const step3 = (
    <div className="space-y-6">
      {(notes || validUntil) && (
        <Card>
          <CardContent className="pt-4 grid grid-cols-2 gap-4">
            {notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{notes}</p>
              </div>
            )}
            {validUntil && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valid Until</p>
                <p className="text-sm">{format(new Date(validUntil), 'dd MMM yyyy')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Offered Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchedItems.map((item, idx) => {
              const lineTotal = item.hasVariants && item.variants.length > 0
                ? item.variants.reduce((s, v) => s + v.quantityOffered * (v.unitPrice || 0), 0)
                : item.quantityOffered * (item.unitPrice || 0)

              return [
                <TableRow key={idx}>
                  <TableCell className="text-sm font-medium">{item.itemName}</TableCell>
                  <TableCell className="text-right text-sm">
                    {item.hasVariants
                      ? <span className="text-muted-foreground text-xs">per variant</span>
                      : item.quantityOffered}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.hasVariants ? <span className="text-muted-foreground text-xs">per variant</span> : item.unitPrice?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{lineTotal.toFixed(2)}</TableCell>
                </TableRow>,

                ...(item.hasVariants
                  ? item.variants.map((v, vIdx) => (
                    <TableRow key={`r${idx}-v${vIdx}`}>
                      <TableCell className="pl-10 py-2 text-xs text-muted-foreground">{v.variantLabel}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground py-2">{v.quantityOffered}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground py-2">{v.unitPrice?.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground py-2">
                        {(v.quantityOffered * (v.unitPrice || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                  : []),
              ]
            })}

            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={3} className="text-right text-sm">Grand Total</TableCell>
              <TableCell className="text-right text-sm">{grandTotal.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )

  const steps = [step1, step2, step3]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Create Quotation"
        description={`For RFQ: ${rfq.title}`}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/rfqs/$id', params: { id: rfqId } })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to RFQ
          </Button>
        }
      />

      <MultiStepForm
        steps={STEPS}
        currentStep={currentStep}
        onNext={() => setCurrentStep(s => s + 1)}
        onBack={() => currentStep === 0 ? navigate({ to: '/rfqs/$id', params: { id: rfqId } }) : setCurrentStep(s => s - 1)}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        canProceed={true}
        submitLabel="Create Quotation"
      >
        {steps[currentStep]}
      </MultiStepForm>
    </div>
  )
}
