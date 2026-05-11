import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { deliveryOrderApi } from '@/features/deliveryOrders/api/deliveryOrderApi'
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
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Route } from '@/routes/_app.delivery-orders.new'

const doVariantSchema = z.object({
  supplierItemVariantId: z.string(),
  dimensionSummary: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  orderedQty: z.number(),
  dispatchedQty: z.number(),
  remainingQty: z.number(),
  quantityDispatched: z.number().min(0),
})

const doItemSchema = z.object({
  supplierItemId: z.string(),
  supplierItemName: z.string(),
  orderedQty: z.number(),
  dispatchedQty: z.number(),
  remainingQty: z.number(),
  quantityDispatched: z.number().min(0),
  notes: z.string().optional(),
  hasVariants: z.boolean(),
  variants: z.array(doVariantSchema).optional(),
})

const createDOSchema = z.object({
  notes: z.string().optional(),
  items: z.array(doItemSchema),
})

type CreateDOForm = z.infer<typeof createDOSchema>

const STEPS = [
  { title: 'Basic Info', description: 'Enter optional notes for the Delivery Order.' },
  { title: 'Set Quantities', description: 'Enter the quantity to dispatch for each item.' },
  { title: 'Review & Create', description: 'Confirm the delivery order details.' },
]

export function CreateDeliveryOrderPage() {
  const { poId, piId } = Route.useSearch()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: po, isLoading: poLoading } = useQuery({
    queryKey: queryKeys.pos.detail(poId),
    queryFn: () => purchaseOrderApi.get(poId),
    enabled: !!poId,
  })

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: queryKeys.pos.dispatchBalance(poId),
    queryFn: () => purchaseOrderApi.getDispatchBalance(poId),
    enabled: !!poId,
  })

  const { register, handleSubmit, watch, reset, control, formState: { errors } } = useForm<CreateDOForm>({
    resolver: zodResolver(createDOSchema),
    defaultValues: { notes: '', items: [] },
  })

  const { fields } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (!po || !balance) return
    const availableItems = balance.filter(b => b.remainingQty > 0 || b.variants?.some(v => v.remainingQty > 0))
    reset({
      notes: '',
      items: availableItems.map(b => {
        const hasVariants = !!(b.variants && b.variants.length > 0)
        const availableVariants = hasVariants ? b.variants!.filter(v => v.remainingQty > 0) : []
        return {
          supplierItemId: b.supplierItemId,
          supplierItemName: b.supplierItemName,
          orderedQty: b.orderedQty,
          dispatchedQty: b.dispatchedQty,
          remainingQty: b.remainingQty,
          quantityDispatched: hasVariants ? 0 : b.remainingQty,
          notes: '',
          hasVariants,
          variants: availableVariants.map(v => ({
            supplierItemVariantId: v.supplierItemVariantId,
            dimensionSummary: v.dimensionSummary,
            sku: v.sku,
            orderedQty: v.orderedQty,
            dispatchedQty: v.invoicedQty,
            remainingQty: v.remainingQty,
            quantityDispatched: v.remainingQty,
          })),
        }
      }),
    })
  }, [po, balance, reset])

  const notes = watch('notes')
  const watchedItems = watch('items')

  const isLoading = poLoading || balanceLoading

  // No PI has been raised yet — all items have orderedQty (= PI invoiced qty) of 0
  const noPIExists = balance != null && balance.length > 0 && balance.every(b => b.orderedQty === 0)

  // All PI-authorised quantities have already been dispatched
  const allDispatched = balance != null && !noPIExists && balance.every(b =>
    b.remainingQty <= 0 && !(b.variants?.some(v => v.remainingQty > 0))
  )

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const id = await deliveryOrderApi.create({
        purchaseOrderId: poId,
        proformaInvoiceId: piId,
        notes: data.notes || undefined,
        items: data.items.map(item => ({
          supplierItemId: item.supplierItemId,
          quantityDispatched: item.hasVariants
            ? (item.variants?.reduce((s, v) => s + v.quantityDispatched, 0) ?? 0)
            : item.quantityDispatched,
          notes: item.notes || undefined,
          variants: item.hasVariants && item.variants?.length
            ? item.variants.map(v => ({
                supplierItemVariantId: v.supplierItemVariantId,
                quantityDispatched: v.quantityDispatched,
              }))
            : undefined,
        })),
      })
      toast.success('Delivery order created successfully')
      navigate({ to: '/delivery-orders/$id', params: { id } })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? err?.message ?? 'Failed to create delivery order')
    } finally {
      setIsSubmitting(false)
    }
  })

  if (isLoading || !po || !balance) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (noPIExists || allDispatched) {
    const message = noPIExists
      ? 'No Proforma Invoice has been raised for this Purchase Order yet. Create a Proforma Invoice first — only invoiced quantities can be dispatched.'
      : 'All invoiced quantities have been fully dispatched.'
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader
          title="Create Delivery Order"
          description={`For PO: ${po.documentNumber}`}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: poId } })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO
            </Button>
          }
        />
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground text-sm">{message}</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: poId } })}>
              Back to Purchase Order
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Step 1: Basic Info ────────────────────────────────────────────────────

  const step1 = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground font-normal">Purchase Order Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">PO Document #</p>
              <p className="text-sm font-medium">{po.documentNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Supplier</p>
              <p className="text-sm font-medium">{po.supplierName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant="default">{po.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Items with Remaining Qty</p>
              <p className="text-sm font-medium">{fields.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{format(new Date(po.createdAt), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Shipping instructions, carrier details, or other remarks…"
            className="min-h-24"
            {...register('notes')}
          />
        </div>
      </div>
    </div>
  )

  // ── Step 2: Set Quantities ────────────────────────────────────────────────

  const step2 = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the quantity to dispatch. The maximum is the remaining PI-invoiced balance for each item (PI invoiced qty − already dispatched).
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">PI Invoiced</TableHead>
              <TableHead className="text-right">Dispatched</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Dispatching Now</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, idx) => {
              const item = watchedItems[idx]
              if (field.hasVariants && field.variants?.length) {
                const totalDispatching = item?.variants?.reduce((s, v) => s + (v.quantityDispatched || 0), 0) ?? 0
                return (
                  <>
                    <TableRow key={field.id} className="bg-muted/30">
                      <TableCell className="text-sm font-semibold" colSpan={3}>{field.supplierItemName}</TableCell>
                      <TableCell className="text-right text-sm text-orange-600 font-medium">{field.remainingQty}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-muted-foreground">
                        {totalDispatching} units
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {field.variants.map((variant, vi) => {
                      const label = variant.dimensionSummary || variant.sku || `Variant ${vi + 1}`
                      return (
                        <TableRow key={variant.supplierItemVariantId} className="border-b border-dashed">
                          <TableCell className="text-sm pl-8 text-muted-foreground">{label}</TableCell>
                          <TableCell className="text-right text-sm">{variant.orderedQty}</TableCell>
                          <TableCell className="text-right text-sm text-green-600">{variant.dispatchedQty}</TableCell>
                          <TableCell className="text-right text-sm text-orange-600 font-medium">{variant.remainingQty}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={variant.remainingQty}
                              className="w-20 text-right h-8"
                              {...register(`items.${idx}.variants.${vi}.quantityDispatched`, { valueAsNumber: true })}
                            />
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )
                    })}
                  </>
                )
              }
              const maxQty = item?.remainingQty ?? 1
              return (
                <TableRow key={field.id}>
                  <TableCell className="text-sm font-medium">{field.supplierItemName}</TableCell>
                  <TableCell className="text-right text-sm">{field.orderedQty}</TableCell>
                  <TableCell className="text-right text-sm text-green-600">{field.dispatchedQty}</TableCell>
                  <TableCell className="text-right text-sm text-orange-600 font-medium">{field.remainingQty}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={1}
                      max={maxQty}
                      className="w-20 text-right h-8"
                      {...register(`items.${idx}.quantityDispatched`, { valueAsNumber: true })}
                    />
                    {errors.items?.[idx]?.quantityDispatched && (
                      <p className="text-xs text-destructive mt-1">{errors.items[idx]?.quantityDispatched?.message}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Optional"
                      className="text-sm h-8"
                      {...register(`items.${idx}.notes`)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  // ── Step 3: Review & Create ───────────────────────────────────────────────

  const step3 = (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Title</p>
            <p className="text-sm font-medium">{title || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Purchase Order</p>
            <p className="text-sm font-medium">{po.title}</p>
          </div>
          {notes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">PI Invoiced</TableHead>
              <TableHead className="text-right">Already Dispatched</TableHead>
              <TableHead className="text-right">Dispatching Now</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchedItems.map((item, idx) => {
              if (item.hasVariants && item.variants?.length) {
                return (
                  <>
                    <TableRow key={idx} className="bg-muted/30">
                      <TableCell className="text-sm font-semibold" colSpan={3}>{item.supplierItemName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {item.variants.reduce((s, v) => s + v.quantityDispatched, 0)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {item.variants.map((v, vi) => (
                      <TableRow key={vi} className="border-b border-dashed">
                        <TableCell className="text-sm pl-8 text-muted-foreground">
                          {v.dimensionSummary || v.sku || `Variant ${vi + 1}`}
                        </TableCell>
                        <TableCell className="text-right text-sm">{v.orderedQty}</TableCell>
                        <TableCell className="text-right text-sm text-green-600">{v.dispatchedQty}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{v.quantityDispatched}</TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                  </>
                )
              }
              return (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.supplierItemName}</TableCell>
                  <TableCell className="text-right text-sm">{item.orderedQty}</TableCell>
                  <TableCell className="text-right text-sm text-green-600">{item.dispatchedQty}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{item.quantityDispatched}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.notes || '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  const steps = [step1, step2, step3]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Create Delivery Order"
        description={`For PO: ${po.title}`}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: poId } })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO
          </Button>
        }
      />

      <MultiStepForm
        steps={STEPS}
        currentStep={currentStep}
        onNext={() => setCurrentStep(s => s + 1)}
        onBack={() => currentStep === 0
          ? navigate({ to: '/purchase-orders/$id', params: { id: poId } })
          : setCurrentStep(s => s - 1)}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        canProceed={currentStep === 0 ? title.trim().length > 0 : true}
        submitLabel="Create Delivery Order"
      >
        {steps[currentStep]}
      </MultiStepForm>
    </div>
  )
}
