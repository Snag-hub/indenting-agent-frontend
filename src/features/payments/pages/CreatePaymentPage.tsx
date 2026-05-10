import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { proformaInvoiceApi } from '@/features/proformaInvoices/api/proformaInvoiceApi'
import { deliveryOrderApi } from '@/features/deliveryOrders/api/deliveryOrderApi'
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
  const { poId, piId, doId } = Route.useSearch()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Determine context: PI > DO > PO
  const context = piId ? 'pi' : doId ? 'do' : 'po'

  const { data: po, isLoading: poLoading } = useQuery({
    queryKey: queryKeys.pos.detail(poId!),
    queryFn: () => purchaseOrderApi.get(poId!),
    enabled: context === 'po' && !!poId,
  })

  const { data: pi, isLoading: piLoading } = useQuery({
    queryKey: queryKeys.proformaInvoices.detail(piId!),
    queryFn: () => proformaInvoiceApi.get(piId!),
    enabled: context === 'pi' && !!piId,
  })

  const { data: doEntity, isLoading: doLoading } = useQuery({
    queryKey: queryKeys.deliveryOrders.detail(doId!),
    queryFn: () => deliveryOrderApi.get(doId!),
    enabled: context === 'do' && !!doId,
  })

  const isLoading = poLoading || piLoading || doLoading

  // Derive display values from whichever entity was loaded
  const supplierName = po?.supplierName ?? pi?.supplierName ?? doEntity?.supplierName ?? '—'
  const entityTitle = po?.title ?? pi?.title ?? doEntity?.title ?? '—'
  const entityStatus = po?.status ?? pi?.status ?? doEntity?.status ?? '—'
  const backTo =
    context === 'pi' ? `/proforma-invoices/${piId}` :
    context === 'do' ? `/delivery-orders/${doId}` :
    `/purchase-orders/${poId}`

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreatePaymentForm>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: { amount: 0, currency: 'USD', paymentMethod: '', referenceNumber: '', notes: '' },
  })

  const amount = watch('amount')
  const currency = watch('currency')
  const paymentMethod = watch('paymentMethod')
  const referenceNumber = watch('referenceNumber')
  const notes = watch('notes')

  const isStep1Valid = amount > 0 && currency.length > 0 && paymentMethod.length > 0 && referenceNumber.trim().length > 0

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const id = await paymentApi.create({
        purchaseOrderId: context === 'po' ? poId : undefined,
        proformaInvoiceId: context === 'pi' ? piId : undefined,
        deliveryOrderId: context === 'do' ? doId : undefined,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        notes: data.notes || undefined,
      })
      toast.success('Payment recorded successfully')
      navigate({ to: '/payments/$id', params: { id } })
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ?? err?.message ?? 'Failed to record payment'
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

  // Context reference card shown at the top of step 1
  const contextLabel =
    context === 'pi' ? 'Proforma Invoice Reference' :
    context === 'do' ? 'Delivery Order Reference' :
    'Purchase Order Reference'

  const contextCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground font-normal">{contextLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {context === 'pi' ? 'PI Title' : context === 'do' ? 'DO Title' : 'PO Title'}
            </p>
            <p className="text-sm font-medium">{entityTitle}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Supplier</p>
            <p className="text-sm font-medium">{supplierName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge variant="default">{entityStatus}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ── Step 1: Payment Details ───────────────────────────────────────────────

  const step1 = (
    <div className="space-y-6">
      {contextCard}

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
            <p className="text-xs text-muted-foreground mb-1">
              {context === 'pi' ? 'Proforma Invoice' : context === 'do' ? 'Delivery Order' : 'Purchase Order'}
            </p>
            <p className="text-sm font-medium">{entityTitle}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Supplier</p>
            <p className="text-sm font-medium">{supplierName}</p>
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
        description={`For: ${entityTitle}`}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: backTo as any })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <MultiStepForm
        steps={STEPS}
        currentStep={currentStep}
        onNext={() => setCurrentStep(s => s + 1)}
        onBack={() => currentStep === 0
          ? navigate({ to: backTo as any })
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
