import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { proformaInvoiceApi } from '@/features/proformaInvoices/api/proformaInvoiceApi'
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
import { Route } from '@/routes/_app.proforma-invoices.new'

const piVariantSchema = z.object({
  supplierItemVariantId: z.string(),
  dimensionSummary: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  orderedQty: z.number(),
  invoicedQty: z.number(),
  remainingQty: z.number(),
  quantityInvoiced: z.number().min(0),
  unitPrice: z.number(),
})

const piItemSchema = z.object({
  supplierItemId: z.string(),
  supplierItemName: z.string(),
  orderedQty: z.number(),
  invoicedQty: z.number(),
  remainingQty: z.number(),
  quantityInvoiced: z.number().min(0),
  unitPrice: z.number(),
  notes: z.string().optional(),
  hasVariants: z.boolean(),
  variants: z.array(piVariantSchema).optional(),
})

const createPISchema = z.object({
  notes: z.string().optional(),
  items: z.array(piItemSchema),
})

type CreatePIForm = z.infer<typeof createPISchema>

const STEPS = [
  { title: 'Basic Info', description: 'Enter optional notes for the Proforma Invoice.' },
  { title: 'Invoice Items', description: 'Set the quantity to invoice for each item.' },
  { title: 'Review & Create', description: 'Confirm and create the Proforma Invoice.' },
]

export function CreateProformaInvoicePage() {
  const { poId } = Route.useSearch()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: po, isLoading: poLoading } = useQuery({
    queryKey: queryKeys.pos.detail(poId),
    queryFn: () => purchaseOrderApi.get(poId),
    enabled: !!poId,
  })

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: queryKeys.pos.invoiceBalance(poId),
    queryFn: () => purchaseOrderApi.getInvoiceBalance(poId),
    enabled: !!poId,
  })

  const { register, handleSubmit, watch, control, reset, formState: { errors } } = useForm<CreatePIForm>({
    resolver: zodResolver(createPISchema),
    defaultValues: { notes: '', items: [] },
  })

  const { fields } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (po && balance) {
      const availableItems = balance.filter(b => b.remainingQty > 0 || (b.variants?.some(v => v.remainingQty > 0)))
      reset({
        notes: '',
        items: availableItems.map(b => {
          const poItem = po.items.find(i => i.supplierItemId === b.supplierItemId)
          const hasVariants = !!(b.variants && b.variants.length > 0)
          const availableVariants = hasVariants ? b.variants!.filter(v => v.remainingQty > 0) : []
          return {
            supplierItemId: b.supplierItemId,
            supplierItemName: b.supplierItemName,
            orderedQty: b.orderedQty,
            invoicedQty: b.dispatchedQty,
            remainingQty: b.remainingQty,
            quantityInvoiced: hasVariants ? 0 : b.remainingQty,
            unitPrice: poItem?.unitPrice ?? 0,
            notes: undefined,
            hasVariants,
            variants: availableVariants.map(v => ({
              supplierItemVariantId: v.supplierItemVariantId,
              dimensionSummary: v.dimensionSummary,
              sku: v.sku,
              orderedQty: v.orderedQty,
              invoicedQty: v.invoicedQty,
              remainingQty: v.remainingQty,
              quantityInvoiced: v.remainingQty,
              unitPrice: v.unitPrice,
            })),
          }
        }),
      })
    }
  }, [po, balance, reset])

  const watchItems = watch('items')
  const watchNotes = watch('notes')

  const grandTotal = watchItems.reduce((sum, item) => {
    if (item.hasVariants && item.variants?.length) {
      return sum + item.variants.reduce((vs, v) => vs + (v.quantityInvoiced || 0) * v.unitPrice, 0)
    }
    return sum + (item.quantityInvoiced || 0) * item.unitPrice
  }, 0)

  const isLoading = poLoading || balanceLoading
  const allInvoiced = balance != null && balance.every(b =>
    b.remainingQty <= 0 && !(b.variants?.some(v => v.remainingQty > 0))
  )

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const piId = await proformaInvoiceApi.create({
        purchaseOrderId: poId,
        notes: data.notes || undefined,
        items: data.items.map(item => ({
          supplierItemId: item.supplierItemId,
          quantityInvoiced: item.hasVariants
            ? (item.variants?.reduce((s, v) => s + v.quantityInvoiced, 0) ?? 0)
            : item.quantityInvoiced,
          notes: item.notes || undefined,
          variants: item.hasVariants && item.variants?.length
            ? item.variants.map(v => ({
                supplierItemVariantId: v.supplierItemVariantId,
                quantityInvoiced: v.quantityInvoiced,
              }))
            : undefined,
        })),
      })
      toast.success('Proforma invoice created successfully')
      navigate({ to: '/proforma-invoices/$id', params: { id: piId } })
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ??
        err?.response?.data?.title ??
        err?.message ??
        'Failed to create proforma invoice'
      toast.error(detail)
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

  if (allInvoiced) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader
          title="Create Proforma Invoice"
          description={`For PO: ${po.documentNumber}`}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: poId } })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO
            </Button>
          }
        />
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground text-sm">All items have been fully invoiced. No remaining quantities to invoice.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: poId } })}
            >
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
            placeholder="Payment terms, shipping details, or other remarks…"
            className="min-h-24"
            {...register('notes')}
          />
        </div>
      </div>
    </div>
  )

  // ── Step 2: Invoice Items ──────────────────────────────────────────────────

  const step2 = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set the quantity to invoice for each item. You can only invoice up to the remaining quantity.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Already Invoiced</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Invoicing Now</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, idx) => {
              const item = watchItems[idx]
              if (field.hasVariants && field.variants?.length) {
                const variantTotal = item?.variants?.reduce((s, v) => s + (v.quantityInvoiced || 0) * v.unitPrice, 0) ?? 0
                return (
                  <>
                    <TableRow key={field.id} className="bg-muted/30">
                      <TableCell className="text-sm font-semibold" colSpan={4}>{field.supplierItemName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-muted-foreground">
                        {item?.variants?.reduce((s, v) => s + (v.quantityInvoiced || 0), 0) ?? 0} units
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{variantTotal.toFixed(2)}</TableCell>
                    </TableRow>
                    {field.variants.map((variant, vi) => {
                      const vItem = item?.variants?.[vi]
                      const lineTotal = (vItem?.quantityInvoiced || 0) * (variant.unitPrice || 0)
                      const label = variant.dimensionSummary || variant.sku || `Variant ${vi + 1}`
                      return (
                        <TableRow key={variant.supplierItemVariantId} className="border-b border-dashed">
                          <TableCell className="text-sm pl-8 text-muted-foreground">{label}</TableCell>
                          <TableCell className="text-right text-sm">{variant.orderedQty}</TableCell>
                          <TableCell className="text-right text-sm text-green-600">{variant.invoicedQty}</TableCell>
                          <TableCell className="text-right text-sm text-orange-600 font-medium">{variant.remainingQty}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={variant.remainingQty}
                              className="w-20 text-right h-8"
                              {...register(`items.${idx}.variants.${vi}.quantityInvoiced`, { valueAsNumber: true })}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm">{variant.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">{lineTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </>
                )
              }
              const lineTotal = (item?.quantityInvoiced || 0) * (item?.unitPrice || 0)
              return (
                <TableRow key={field.id}>
                  <TableCell className="text-sm font-medium">{field.supplierItemName}</TableCell>
                  <TableCell className="text-right text-sm">{field.orderedQty}</TableCell>
                  <TableCell className="text-right text-sm text-green-600">{field.invoicedQty}</TableCell>
                  <TableCell className="text-right text-sm text-orange-600 font-medium">{field.remainingQty}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={1}
                      max={field.remainingQty}
                      className="w-20 text-right h-8"
                      {...register(`items.${idx}.quantityInvoiced`, { valueAsNumber: true })}
                    />
                    {errors.items?.[idx]?.quantityInvoiced && (
                      <p className="text-xs text-destructive mt-1">{errors.items[idx]?.quantityInvoiced?.message}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{field.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm">{lineTotal.toFixed(2)}</TableCell>
                </TableRow>
              )
            })}
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={6} className="text-right text-sm">Grand Total</TableCell>
              <TableCell className="text-right text-sm">{grandTotal.toFixed(2)}</TableCell>
            </TableRow>
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
            <p className="text-sm font-medium">{watchTitle || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Purchase Order</p>
            <p className="text-sm font-medium">{po.title}</p>
          </div>
          {watchNotes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{watchNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Already Invoiced</TableHead>
              <TableHead className="text-right">Invoicing Now</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchItems.map((item, idx) => {
              if (item.hasVariants && item.variants?.length) {
                const variantTotal = item.variants.reduce((s, v) => s + v.quantityInvoiced * v.unitPrice, 0)
                return (
                  <>
                    <TableRow key={idx} className="bg-muted/30">
                      <TableCell className="text-sm font-semibold" colSpan={3}>{item.supplierItemName}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {item.variants.reduce((s, v) => s + v.quantityInvoiced, 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{variantTotal.toFixed(2)}</TableCell>
                    </TableRow>
                    {item.variants.map((v, vi) => (
                      <TableRow key={vi} className="border-b border-dashed">
                        <TableCell className="text-sm pl-8 text-muted-foreground">
                          {v.dimensionSummary || v.sku || `Variant ${vi + 1}`}
                        </TableCell>
                        <TableCell className="text-right text-sm">{v.orderedQty}</TableCell>
                        <TableCell className="text-right text-sm text-green-600">{v.invoicedQty}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{v.quantityInvoiced}</TableCell>
                        <TableCell className="text-right text-sm">{v.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm">{(v.quantityInvoiced * v.unitPrice).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )
              }
              const lineTotal = item.quantityInvoiced * item.unitPrice
              return (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.supplierItemName}</TableCell>
                  <TableCell className="text-right text-sm">{item.orderedQty}</TableCell>
                  <TableCell className="text-right text-sm text-green-600">{item.invoicedQty}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{item.quantityInvoiced}</TableCell>
                  <TableCell className="text-right text-sm">{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm">{lineTotal.toFixed(2)}</TableCell>
                </TableRow>
              )
            })}
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={5} className="text-right text-sm">Grand Total</TableCell>
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
        title="Create Proforma Invoice"
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
        canProceed={currentStep === 0 ? watchTitle.trim().length > 0 : true}
        submitLabel="Create Proforma Invoice"
      >
        {steps[currentStep]}
      </MultiStepForm>
    </div>
  )
}
