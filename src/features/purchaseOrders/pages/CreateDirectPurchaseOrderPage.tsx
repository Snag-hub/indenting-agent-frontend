import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { MultiStepForm } from '@/components/MultiStepForm'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineItemsEditor, type LineItem, type CatalogItem } from '@/components/LineItemsEditor'
import { useCurrencies } from '@/hooks/useSettings'
import { ArrowLeft } from 'lucide-react'

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { title: 'Supplier',     description: 'Choose the supplier and order settings.' },
  { title: 'Items',        description: 'Add the items you want to order, including variants.' },
  { title: 'Review',       description: 'Review your order before submitting.' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CreateDirectPurchaseOrderPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1 state
  const [supplierId, setSupplierId] = useState<string | undefined>()
  const [notes, setNotes] = useState('')
  const [currency, setCurrency] = useState('USD')

  // Step 2 state
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')

  const { currencies } = useCurrencies()

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'list', { pageSize: 200 }],
    queryFn: () => supplierApi.list({ page: 1, pageSize: 200 }),
  })

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['supplierItems', 'browse', { supplierId, search: catalogSearch }],
    queryFn: () =>
      supplierItemApi.browse({ supplierId, search: catalogSearch, page: 1, pageSize: 50 }),
    enabled: !!supplierId,
  })

  // Single-supplier catalog: each entry has exactly one offer (the selected supplier).
  const selectedSupplierName = (suppliers?.data ?? []).find((s) => s.id === supplierId)?.name ?? ''
  const catalog: CatalogItem[] = (catalogData?.data ?? []).map((i) => ({
    id: i.id,
    label: i.name,
    offers: [{
      supplierId: supplierId!,
      supplierName: selectedSupplierName,
      supplierItemId: i.id,
      hasVariants: i.hasVariants,
      quantityTiers: i.quantityTiers ?? [],
    }],
  }))

  // ── Derived totals for review step ─────────────────────────────────────────

  const orderTotal = lineItems.reduce((sum, item) => {
    if (item.hasVariants && item.variants.length > 0) {
      return sum + item.variants.reduce((vs, v) => vs + v.quantity * (item.unitPrice ?? 0), 0)
    }
    return sum + item.quantity * (item.unitPrice ?? 0)
  }, 0)

  // ── Step validation ─────────────────────────────────────────────────────────

  const step1Valid = !!supplierId

  const step2Valid =
    lineItems.length > 0 &&
    lineItems.every((i) => {
      const hasQty = i.hasVariants
        ? (i.variants ?? []).some((v) => v.quantity > 0)
        : i.quantity > 0
      return hasQty && (i.unitPrice ?? 0) >= 0
    })

  const canProceed = currentStep === 0 ? step1Valid : currentStep === 1 ? step2Valid : true

  // ── Submit ──────────────────────────────────────────────────────────────────

  const create = useMutation({
    mutationFn: () =>
      purchaseOrderApi.createDirect({
        supplierId: supplierId!,
        notes: notes || undefined,
        currency,
        items: lineItems.map(({ supplierItemId, quantity, unitPrice, variants }) => {
          const validVariants = (variants ?? []).filter((v) => v.quantity > 0)
          return {
            supplierItemId,
            quantity,
            unitPrice: unitPrice ?? 0,
            variants: validVariants.length > 0
              ? validVariants.map((v) => ({
                  supplierItemVariantId: v.supplierItemVariantId,
                  quantity: v.quantity,
                  unitPrice: unitPrice ?? undefined,
                }))
              : undefined,
          }
        }),
      }),
    onSuccess: (id) => {
      toast.success('Purchase order created.')
      navigate({ to: '/purchase-orders/$id', params: { id } })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Could not create the purchase order.')
    },
  })

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const handleNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0))

  // ── Step content ────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {

      // ── Step 1: Supplier ────────────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Supplier <span className="text-destructive">*</span></Label>
                <Select
                  value={supplierId ?? ''}
                  onValueChange={(v) => {
                    setSupplierId(v)
                    setLineItems([]) // reset items when supplier changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers?.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for the supplier…"
                rows={4}
                maxLength={1000}
              />
            </div>
          </div>
        )

      // ── Step 2: Items ───────────────────────────────────────────────────────
      case 1:
        return (
          <LineItemsEditor
            items={lineItems}
            catalog={catalog}
            onAdd={(item) => setLineItems((prev) => [...prev, item])}
            onRemove={(id) => setLineItems((prev) => prev.filter((i) => i.id !== id))}
            onUpdate={(id, patch) =>
              setLineItems((prev) =>
                prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
              )
            }
            onSearchChange={setCatalogSearch}
            isLoadingCatalog={catalogLoading}
            showPrice
            emptyMessage='No items yet — search and click an item to add it.'
          />
        )

      // ── Step 3: Review ──────────────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-6">
            {/* Order summary */}
            <Card>
              <CardContent className="pt-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Supplier</dt>
                    <dd className="font-medium">{selectedSupplierName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Currency</dt>
                    <dd className="font-medium">{currency}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Total Items</dt>
                    <dd className="font-medium">{lineItems.length}</dd>
                  </div>
                  {notes && (
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-xs text-muted-foreground mb-0.5">Notes</dt>
                      <dd className="whitespace-pre-wrap">{notes}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Line items */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Item</th>
                    <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                    <th className="px-4 py-2.5 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineItems.map((item) => {
                    const lineTotal = item.hasVariants && item.variants.length > 0
                      ? item.variants.reduce((s, v) => s + v.quantity * (item.unitPrice ?? 0), 0)
                      : item.quantity * (item.unitPrice ?? 0)
                    return (
                      <>
                        <tr key={item.id} className="bg-white">
                          <td className="px-4 py-2.5">
                            <span className="font-medium">{item.itemName}</span>
                            {item.hasVariants && item.variants.length > 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {item.variants.filter(v => v.quantity > 0).length} variant{item.variants.filter(v => v.quantity > 0).length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">
                            {item.hasVariants ? '—' : item.quantity}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">
                            {item.unitPrice != null ? formatCurrency(item.unitPrice, currency) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {formatCurrency(lineTotal, currency)}
                          </td>
                        </tr>
                        {/* Variant sub-rows */}
                        {item.hasVariants && item.variants.filter(v => v.quantity > 0).map((v) => (
                          <tr key={`${item.id}-${v.supplierItemVariantId}`} className="bg-muted/20">
                            <td className="px-4 py-1.5 pl-10 text-xs text-muted-foreground">
                              {v.dimensionSummary}
                              {v.sku && <span className="ml-2 font-mono">· {v.sku}</span>}
                            </td>
                            <td className="px-4 py-1.5 text-right text-xs text-muted-foreground">{v.quantity}</td>
                            <td className="px-4 py-1.5 text-right text-xs text-muted-foreground">
                              {item.unitPrice != null ? formatCurrency(item.unitPrice, currency) : '—'}
                            </td>
                            <td className="px-4 py-1.5 text-right text-xs text-muted-foreground">
                              {item.unitPrice != null ? formatCurrency(v.quantity * item.unitPrice, currency) : '—'}
                            </td>
                          </tr>
                        ))}
                      </>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="px-4 py-2.5" colSpan={3}>Order Total</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(orderTotal, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="New Direct Purchase Order"
        description="Create a purchase order directly without a Quotation."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/purchase-orders' })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Button>
        }
      />

      <MultiStepForm
        steps={STEPS}
        currentStep={currentStep}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={() => create.mutate()}
        isSubmitting={create.isPending}
        canProceed={canProceed}
        submitLabel="Create Purchase Order"
      >
        {renderStep()}
      </MultiStepForm>
    </div>
  )
}
