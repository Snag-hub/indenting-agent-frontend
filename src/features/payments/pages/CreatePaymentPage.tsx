import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { paymentApi } from '@/features/payments/api/paymentApi'
import { queryKeys } from '@/lib/queryKeys'
import { MultiStepForm } from '@/components/MultiStepForm'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Route } from '@/routes/_app.payments.new'

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

const PAYMENT_METHODS = ['Bank Transfer', 'Wire Transfer', 'Cheque', 'Letter of Credit', 'Cash']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'PKR', 'CNY']

const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  referenceNumber: z.string().min(1, 'Reference number is required'),
  notes: z.string().optional(),
})

type CreatePaymentForm = z.infer<typeof createPaymentSchema>

const STEPS = [
  { title: 'Payment Details', description: 'Enter payment amount, method, and reference.' },
  { title: 'Review & Submit', description: 'Review the payment details before submitting.' },
]

export function CreatePaymentPage() {
  const { poId } = Route.useSearch()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: po, isLoading } = useQuery({
    queryKey: queryKeys.pos.detail(poId),
    queryFn: () => purchaseOrderApi.get(poId),
    enabled: !!poId,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreatePaymentForm>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: { amount: 0, currency: 'USD', paymentMethod: '', referenceNumber: '', notes: '' },
  })

  const amount = watch('amount')
  const currency = watch('currency')
  const paymentMethod = watch('paymentMethod')
  const referenceNumber = watch('referenceNumber')
  const notes = watch('notes')

  const grandTotal = po?.items.reduce((sum, item) => sum + item.totalPrice, 0) ?? 0

  const isStep1Valid = amount > 0 && currency.length > 0 && paymentMethod.length > 0 && referenceNumber.trim().length > 0

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const id = await paymentApi.create({
        purchaseOrderId: poId,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes || undefined,
      })
      navigate({ to: '/payments/$id', params: { id } })
    } finally {
      setIsSubmitting(false)
    }
  })

  if (isLoading || !po) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  // ── Step 1: Payment Details ───────────────────────────────────────────────

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
              <p className="text-xs text-muted-foreground mb-1">PO Total Value</p>
              <p className="text-sm font-medium">{formatCurrency(grandTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{format(new Date(po.createdAt), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Currency <span className="text-destructive">*</span></Label>
          <Select value={currency} onValueChange={(v) => setValue('currency', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Payment Method <span className="text-destructive">*</span></Label>
          <Select value={paymentMethod} onValueChange={(v) => setValue('paymentMethod', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.paymentMethod && <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="referenceNumber">Reference Number <span className="text-destructive">*</span></Label>
          <Input
            id="referenceNumber"
            placeholder="e.g. TT-20260412-001"
            {...register('referenceNumber')}
          />
          {errors.referenceNumber && <p className="text-xs text-destructive">{errors.referenceNumber.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Bank name, transaction details, or other remarks…"
          className="min-h-20"
          {...register('notes')}
        />
      </div>
    </div>
  )

  // ── Step 2: Review & Submit ───────────────────────────────────────────────

  const step2 = (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Amount</p>
            <p className="text-sm font-semibold text-lg">{formatCurrency(amount || 0, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
            <p className="text-sm font-medium">{paymentMethod || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
            <p className="text-sm font-medium">{referenceNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Purchase Order</p>
            <p className="text-sm font-medium">{po.title}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Supplier</p>
            <p className="text-sm font-medium">{po.supplierName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">PO Total Value</p>
            <p className="text-sm">{formatCurrency(grandTotal)}</p>
          </div>
          {notes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        The payment will be submitted with status <strong>Pending</strong> and await confirmation from the supplier.
      </p>
    </div>
  )

  const steps = [step1, step2]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Record Payment"
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
        canProceed={currentStep === 0 ? isStep1Valid : true}
        submitLabel="Submit Payment"
      >
        {steps[currentStep]}
      </MultiStepForm>
    </div>
  )
}
