import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { proformaInvoiceApi } from '@/features/proformaInvoices/api/proformaInvoiceApi'
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
import { Route } from '@/routes/_app.payments.new'
import { useCurrencies } from '@/hooks/useSettings'

function formatCurrency(value: number, currency?: string | null): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(value)
}

const PAYMENT_METHODS = ['Bank Transfer', 'Wire Transfer', 'Cheque', 'Letter of Credit', 'Cash']

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
  const { piId } = Route.useSearch()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currencies } = useCurrencies()

  const { data: pi, isLoading } = useQuery({
    queryKey: queryKeys.proformaInvoices.detail(piId!),
    queryFn: () => proformaInvoiceApi.get(piId!),
    enabled: !!piId,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreatePaymentForm>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      amount: pi?.totalAmount ?? 0,
      currency: pi?.currency ?? 'USD',
      paymentMethod: '',
      referenceNumber: '',
      notes: '',
    },
  })

  const amount = watch('amount')
  const currency = watch('currency')
  const paymentMethod = watch('paymentMethod')
  const referenceNumber = watch('referenceNumber')
  const notes = watch('notes')

  const isStep1Valid = amount > 0 && currency.length > 0 && paymentMethod.length > 0 && referenceNumber.trim().length > 0

  const onSubmit = handleSubmit(async (data) => {
    if (!piId) return
    setIsSubmitting(true)
    try {
      const id = await paymentApi.create({
        proformaInvoiceId: piId,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes || undefined,
      })
      toast.success('Payment recorded successfully')
      navigate({ to: '/payments/$id', params: { id } })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      toast.error(
        e?.response?.data?.detail ?? e?.message ?? 'Failed to record payment'
      )
    } finally {
      setIsSubmitting(false)
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!pi) {
    return <div className="text-muted-foreground">Proforma Invoice not found.</div>
  }

  const piCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground font-normal">Proforma Invoice Reference</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">PI Number</p>
            <p className="text-sm font-medium">{pi.documentNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Supplier</p>
            <p className="text-sm font-medium">{pi.supplierName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">PI Total</p>
            <p className="text-sm font-semibold">{formatCurrency(pi.totalAmount, pi.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge variant="default">{pi.status}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ── Step 1: Payment Details ───────────────────────────────────────────────

  const step1 = (
    <div className="space-y-6">
      {piCard}

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
              {currencies.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
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
            <p className="text-xs text-muted-foreground mb-1">Proforma Invoice</p>
            <p className="text-sm font-medium">{pi.documentNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Supplier</p>
            <p className="text-sm font-medium">{pi.supplierName}</p>
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
        description={`For PI: ${pi.documentNumber}`}
        action={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Button variant="outline" size="sm" onClick={() => navigate({ to: `/proforma-invoices/${piId}` as any })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <MultiStepForm
        steps={STEPS}
        currentStep={currentStep}
        onNext={() => setCurrentStep(s => s + 1)}
        onBack={() => {
          if (currentStep === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigate({ to: `/proforma-invoices/${piId}` as any })
          } else {
            setCurrentStep(s => s - 1)
          }
        }}
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
