import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import {
  purchaseOrderApi,
  type CreateDirectPurchaseOrderItemInput,
} from '@/features/purchaseOrders/api/purchaseOrderApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ItemRow extends CreateDirectPurchaseOrderItemInput {
  supplierItemName: string // local display only; not sent to API
  rowKey: string
}

function newRowKey() {
  return Math.random().toString(36).slice(2)
}

export function CreateDirectPurchaseOrderPage() {
  const navigate = useNavigate()
  const [supplierId, setSupplierId] = useState<string | undefined>()
  const [notes, setNotes] = useState('')
  const [currency, setCurrency] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'list', { pageSize: 200 }],
    queryFn: () => supplierApi.list({ page: 1, pageSize: 200 }),
  })

  const { data: catalog } = useQuery({
    queryKey: ['supplierItems', 'browse', { supplierId, search: pickerSearch }],
    queryFn: () => supplierItemApi.browse({ supplierId, search: pickerSearch, page: 1, pageSize: 50 }),
    enabled: !!supplierId && pickerOpen,
  })

  const create = useMutation({
    mutationFn: () =>
      purchaseOrderApi.createDirect({
        supplierId: supplierId!,
        notes: notes || undefined,
        currency: currency || undefined,
        items: rows.map(({ rowKey: _rowKey, supplierItemName: _name, ...rest }) => rest),
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
    rows.length > 0 &&
    rows.every((r) => r.quantity > 0 && r.unitPrice >= 0)

  function addItem(supplierItemId: string, name: string) {
    if (rows.some((r) => r.supplierItemId === supplierItemId)) {
      toast.info('Item already added.')
      return
    }
    setRows((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        supplierItemId,
        supplierItemName: name,
        quantity: 1,
        unitPrice: 0,
      },
    ])
    setPickerOpen(false)
    setPickerSearch('')
  }

  function updateRow(rowKey: string, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r)))
  }

  function removeRow(rowKey: string) {
    setRows((prev) => prev.filter((r) => r.rowKey !== rowKey))
  }

  const subtotal = rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0)

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
              setRows([]) // clear rows when supplier changes — items are supplier-scoped
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
          <Label>Currency (optional)</Label>
          <Input
            placeholder="USD, EUR, INR…"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            maxLength={10}
          />
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

      <div className="border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Line Items</h3>
          <Button size="sm" variant="outline" disabled={!supplierId} onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            {supplierId ? 'No items yet — click "Add Item".' : 'Select a supplier to start adding items.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 w-24">Qty</th>
                <th className="px-3 py-2 w-32">Unit Price</th>
                <th className="px-3 py-2 w-32 text-right">Total</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rowKey} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{r.supplierItemName}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={r.quantity}
                      onChange={(e) => updateRow(r.rowKey, { quantity: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={r.unitPrice}
                      onChange={(e) => updateRow(r.rowKey, { unitPrice: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {(r.quantity * r.unitPrice).toFixed(2)}
                  </td>
                  <td>
                    <Button size="icon" variant="ghost" onClick={() => removeRow(r.rowKey)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td colSpan={3} className="px-3 py-2 font-semibold text-right">Subtotal</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{subtotal.toFixed(2)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate({ to: '/purchase-orders' })}>
          Cancel
        </Button>
        <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Creating…' : 'Create Purchase Order'}
        </Button>
      </div>

      {/* Item picker dialog — light overlay */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add item</h3>
              <Button variant="ghost" size="sm" onClick={() => setPickerOpen(false)}>×</Button>
            </div>
            <Input
              autoFocus
              placeholder="Search supplier items…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto border rounded">
              {(catalog?.data ?? []).map((item) => {
                const already = rows.some((r) => r.supplierItemId === item.id)
                return (
                  <button
                    key={item.id}
                    disabled={already}
                    onClick={() => addItem(item.id, item.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-b last:border-b-0"
                  >
                    {item.name}
                    {already && <span className="ml-2 text-xs text-slate-400">(already added)</span>}
                  </button>
                )
              })}
              {(catalog?.data ?? []).length === 0 && (
                <div className="text-center py-4 text-sm text-slate-500">No items.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
