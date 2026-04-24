import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

const createDOSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  items: z.array(z.object({
    supplierItemId: z.string(),
    supplierItemName: z.string(),
    orderedQty: z.number(),
    dispatchedQty: z.number(),
    remainingQty: z.number(),
    quantityDispatched: z.number().min(1, 'Must dispatch at least 1'),
    notes: z.string().optional(),
  })),
})

type CreateDOForm = z.infer<typeof createDOSchema>

const STEPS = [
  { title: 'Basic Info', description: 'Enter title and optional notes for the Delivery Order.' },
  { title: 'Set Quantities', description: 'Enter the quantity dispatched for each item.' },
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
    defaultValues: { title: '', notes: '', items: [] },
  })

  const { fields } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (!po || !balance) return
    reset({
      title: '',
      notes: '',
      items: po.items.map(item => {
        const bal = balance.find(b => b.supplierItemId === item.supplierItemId)
        const remainingQty = bal?.remainingQty ?? item.quantity
        return {
          supplierItemId: item.supplierItemId,
          supplierItemName: item.supplierItemName,
          orderedQty: bal?.orderedQty ?? item.quantity,
          dispatchedQty: bal?.dispatchedQty ?? 0,
          remainingQty,
          quantityDispatched: remainingQty,
          notes: '',
        }
      }),
    })
  }, [po, balance, reset])

  const title = watch('title')
  const notes = watch('notes')
  const watchedItems = watch('items')

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const id = await deliveryOrderApi.create({
        purchaseOrderId: poId,
        proformaInvoiceId: piId,
        title: data.title,
        notes: data.notes || undefined,
        items: data.items.map(i => ({
          supplierItemId: i.supplierItemId,
          quantityDispatched: i.quantityDispatched,
          notes: i.notes || undefined,
        })),
      })
      navigate({ to: '/delivery-orders/$id', params: { id } })
    } finally {
      setIsSubmitting(false)
    }
  })

  const isLoading = poLoading || balanceLoading

  if (isLoading || !po || !balance) {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground font-normal">Purchase Order Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">PO Title</p>
              <p className="text-sm font-medium">{po.title}</p>
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
              <p className="text-xs text-muted-foreground mb-1">Items</p>
              <p className="text-sm font-medium">{po.items.length}</p>
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
          <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
          <Input
            id="title"
            placeholder="e.g. Delivery Order — Office Chairs Batch 1"
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
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
        Enter the quantity to dispatch. Maximum is the remaining balance for each item.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Dispatched</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right w-32">Dispatching</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, idx) => {
              const item = watchedItems[idx]
              const maxQty = item?.remainingQty ?? 1
              return (
                <TableRow key={field.id}>
                  <TableCell className="text-sm font-medium">
                    {item?.supplierItemName}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {item?.orderedQty}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {item?.dispatchedQty}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-green-700">
                    {item?.remainingQty}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={1}
                      max={maxQty}
                      className="w-24 text-right ml-auto"
                      {...register(`items.${idx}.quantityDispatched`, {
                        valueAsNumber: true,
                        onChange: (e) => {
                          const val = parseInt(e.target.value) || 1
                          if (val > maxQty) e.target.value = String(maxQty)
                        },
                      })}
                      onClick={e => e.stopPropagation()}
                    />
                    {errors.items?.[idx]?.quantityDispatched && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.items[idx]?.quantityDispatched?.message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Optional note"
                      className="text-sm"
                      {...register(`items.${idx}.notes`)}
                      onClick={e => e.stopPropagation()}
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
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Already Dispatched</TableHead>
              <TableHead className="text-right">Dispatching Now</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchedItems.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-sm">{item.supplierItemName}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{item.orderedQty}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{item.dispatchedQty}</TableCell>
                <TableCell className="text-right text-sm font-medium">{item.quantityDispatched}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.notes || '—'}</TableCell>
              </TableRow>
            ))}
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
