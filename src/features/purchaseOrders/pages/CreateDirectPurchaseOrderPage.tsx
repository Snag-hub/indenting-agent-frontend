import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineItemsEditor, type LineItem, type CatalogItem } from '@/components/LineItemsEditor'
import { useCurrencies } from '@/hooks/useSettings'

export function CreateDirectPurchaseOrderPage() {
  const navigate = useNavigate()
  const [supplierId, setSupplierId] = useState<string | undefined>()
  const [notes, setNotes] = useState('')
  const [currency, setCurrency] = useState('USD')
  const { currencies } = useCurrencies()
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')

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

  // Single-supplier flow: each catalog item has exactly one offer (from the selected supplier).
  const selectedSupplierName = (suppliers?.data ?? []).find((s) => s.id === supplierId)?.name ?? ''
  const catalog: CatalogItem[] = (catalogData?.data ?? []).map((i) => ({
    id: i.id,
    label: i.name,
    offers: [{
      supplierId: supplierId!,
      supplierName: selectedSupplierName,
      supplierItemId: i.id,
      hasVariants: false,
      quantityTiers: i.quantityTiers ?? [],
    }],
  }))

  const create = useMutation({
    mutationFn: () =>
      purchaseOrderApi.createDirect({
        supplierId: supplierId!,
        notes: notes || undefined,
        currency,
        items: lineItems.map(({ supplierItemId, quantity, unitPrice }) => ({
          supplierItemId,
          quantity,
          unitPrice: unitPrice ?? 0,
        })),
      }),
    onSuccess: (id) => {
      toast.success('Purchase order created.')
      navigate({ to: '/purchase-orders/$id', params: { id } })
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Could not create the purchase order.')
    },
  })

  const canSubmit =
    !!supplierId &&
    lineItems.length > 0 &&
    lineItems.every((i) => i.quantity > 0 && (i.unitPrice ?? 0) >= 0)

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="New Direct Purchase Order"
        description="Create a PO directly, without a Quotation. Unit prices are entered manually for now."
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Supplier *</Label>
          <Select
            value={supplierId ?? ''}
            onValueChange={(v) => {
              setSupplierId(v)
              setLineItems([]) // clear items when supplier changes — items are supplier-scoped
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier..." />
            </SelectTrigger>
            <SelectContent>
              {(suppliers?.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          maxLength={1000}
        />
      </div>

      {supplierId && (
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
          emptyMessage='No items yet — click "Add Item".'
        />
      )}

      {!supplierId && (
        <div className="border rounded-lg text-sm text-slate-500 text-center py-8">
          Select a supplier to start adding items.
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate({ to: '/purchase-orders' })}>
          Cancel
        </Button>
        <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Creating…' : 'Create Purchase Order'}
        </Button>
      </div>
    </div>
  )
}
