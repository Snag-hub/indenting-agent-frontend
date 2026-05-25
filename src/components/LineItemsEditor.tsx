import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VariantQuantityDialog } from '@/features/catalog/components/VariantQuantityDialog'

// ── Exported types ────────────────────────────────────────────────────────────

export interface LineItemVariant {
  supplierItemVariantId: string
  quantity: number
  dimensionSummary: string
  sku: string | null
}

export interface LineItem {
  id: string                  // stable row key (crypto.randomUUID())
  supplierId: string          // supplier this line is bound to
  supplierName: string        // for display
  supplierItemId: string
  itemName: string
  quantity: number
  quantityTiers: number[]     // lot sizes from THIS supplier's offer
  unitPrice?: number
  hasVariants: boolean
  variants: LineItemVariant[]
  notes?: string
}

/**
 * One catalog entry (a single master item OR a single supplier-only item),
 * with one or more per-supplier offers underneath.
 */
export interface CatalogItem {
  id: string                  // picker key — master item id or supplier item id
  label: string
  offers: CatalogOffer[]
}

export interface CatalogOffer {
  supplierId: string
  supplierName: string
  supplierItemId: string
  hasVariants: boolean
  quantityTiers: number[]
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LineItemsEditorProps {
  items: LineItem[]
  onAdd: (item: LineItem) => void
  onAddMany?: (items: LineItem[]) => void  // optional bulk-add (for offer fan-out)
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<LineItem>) => void

  catalog: CatalogItem[]
  onSearchChange?: (q: string) => void
  isLoadingCatalog?: boolean

  showPrice?: boolean
  /**
   * When true, clicking a catalog row auto-adds one line per offer.
   * When false (default), the user picks which supplier(s) to add via inline checkboxes.
   * For now we always auto-add — flag exists for future flexibility.
   */
  autoAddAllOffers?: boolean

  addLabel?: string
  emptyMessage?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLineItem(label: string, offer: CatalogOffer): LineItem {
  return {
    id: crypto.randomUUID(),
    supplierId: offer.supplierId,
    supplierName: offer.supplierName,
    supplierItemId: offer.supplierItemId,
    itemName: label,
    quantity: offer.hasVariants ? 0 : (offer.quantityTiers[0] ?? 1),
    quantityTiers: offer.quantityTiers,
    hasVariants: offer.hasVariants,
    variants: [],
  }
}

function formatTierList(tiers: number[]): string {
  if (tiers.length === 0) return 'any qty'
  return `lots: ${tiers.map((t) => t.toLocaleString()).join(', ')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LineItemsEditor({
  items,
  onAdd,
  onAddMany,
  onRemove,
  onUpdate,
  catalog,
  onSearchChange,
  isLoadingCatalog = false,
  showPrice = false,
  autoAddAllOffers = true,
  addLabel = 'Add Item',
  emptyMessage,
}: LineItemsEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [variantItem, setVariantItem] = useState<LineItem | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pickerOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [pickerOpen])

  // Already-added detection uses (supplierId, supplierItemId) tuple — same master item
  // from a different supplier can be added independently.
  const addedKeys = new Set(items.map((i) => `${i.supplierId}::${i.supplierItemId}`))

  function handleSearch(q: string) {
    setPickerSearch(q)
    onSearchChange?.(q)
  }

  function closePicker() {
    setPickerOpen(false)
    setPickerSearch('')
    onSearchChange?.('')
  }

  function handleCatalogItemClick(catalogItem: CatalogItem) {
    // Filter to offers not already in the basket
    const eligibleOffers = catalogItem.offers.filter(
      (o) => !addedKeys.has(`${o.supplierId}::${o.supplierItemId}`),
    )
    if (eligibleOffers.length === 0) return

    if (autoAddAllOffers) {
      const newLines = eligibleOffers.map((o) => buildLineItem(catalogItem.label, o))
      if (onAddMany) onAddMany(newLines)
      else newLines.forEach(onAdd)
      closePicker()
      return
    }

    // (Fallback: same as auto-add for now; placeholder for future "pick which supplier" UX)
    const newLines = eligibleOffers.map((o) => buildLineItem(catalogItem.label, o))
    if (onAddMany) onAddMany(newLines)
    else newLines.forEach(onAdd)
    closePicker()
  }

  function handleEditVariants(item: LineItem) {
    setVariantItem(item)
  }

  function handleVariantConfirm(
    confirmed: Array<{ variantId: string; quantity: number; dimensionSummary: string; sku: string | null }>,
  ) {
    if (!variantItem) return
    const variants: LineItemVariant[] = confirmed.map((v) => ({
      supplierItemVariantId: v.variantId,
      quantity: v.quantity,
      dimensionSummary: v.dimensionSummary,
      sku: v.sku,
    }))
    const totalQty = variants.reduce((s, v) => s + v.quantity, 0)
    onUpdate(variantItem.id, { variants, quantity: totalQty })
    setVariantItem(null)
  }

  const subtotal = showPrice
    ? items.reduce((s, i) => s + i.quantity * (i.unitPrice ?? 0), 0)
    : 0

  const variantInitialQuantities: Record<string, number> | undefined =
    variantItem && variantItem.variants.length > 0
      ? Object.fromEntries(variantItem.variants.map((v) => [v.supplierItemVariantId, v.quantity]))
      : undefined

  return (
    <div className="space-y-2">
      {/* Table */}
      <div className="border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Line Items</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            {emptyMessage ?? 'No items added.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 w-44">Supplier</th>
                <th className="px-3 py-2 w-36">Quantity</th>
                {showPrice && <th className="px-3 py-2 w-32">Unit Price</th>}
                {showPrice && <th className="px-3 py-2 w-28 text-right">Total</th>}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0 align-top">
                  {/* Item name + variant summary */}
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.itemName}</div>
                    {item.hasVariants && (
                      <div className="mt-1 space-y-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleEditVariants(item)}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {item.variants.length > 0
                            ? `${item.variants.length} variant${item.variants.length !== 1 ? 's' : ''}`
                            : 'Select variants'}
                        </Button>
                        {item.variants.length > 0 && (
                          <ul className="text-xs text-slate-500 space-y-0.5 pl-1">
                            {item.variants.map((v) => (
                              <li key={v.supplierItemVariantId}>
                                {v.dimensionSummary || v.sku || v.supplierItemVariantId} — {v.quantity}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Supplier badge */}
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="font-normal">
                      {item.supplierName}
                    </Badge>
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-2">
                    {item.hasVariants ? (
                      <span className="text-slate-600">{item.quantity}</span>
                    ) : item.quantityTiers.length > 0 ? (
                      <Select
                        value={String(item.quantity)}
                        onValueChange={(v) => onUpdate(item.id, { quantity: Number(v) })}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {item.quantityTiers.map((t) => (
                            <SelectItem key={t} value={String(t)}>
                              {t.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => onUpdate(item.id, { quantity: Number(e.target.value) || 0 })}
                        className="w-24"
                      />
                    )}
                  </td>

                  {/* Unit price */}
                  {showPrice && (
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice ?? 0}
                        onChange={(e) => onUpdate(item.id, { unitPrice: Number(e.target.value) || 0 })}
                        className="w-28"
                      />
                    </td>
                  )}

                  {/* Row total */}
                  {showPrice && (
                    <td className="px-3 py-2 text-right font-mono">
                      {(item.quantity * (item.unitPrice ?? 0)).toFixed(2)}
                    </td>
                  )}

                  {/* Remove */}
                  <td className="py-2 pr-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </td>
                </tr>
              ))}

              {showPrice && (
                <tr className="bg-slate-50">
                  <td colSpan={4} className="px-3 py-2 font-semibold text-right">Subtotal</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">
                    {subtotal.toFixed(2)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Inline picker overlay */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add item</h3>
              <Button type="button" variant="ghost" size="sm" onClick={closePicker}>×</Button>
            </div>
            <Input
              ref={searchRef}
              placeholder="Search items…"
              value={pickerSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto border rounded">
              {isLoadingCatalog ? (
                <div className="text-center py-4 text-sm text-slate-500">Loading…</div>
              ) : catalog.length === 0 ? (
                <div className="text-center py-4 text-sm text-slate-500">No items found.</div>
              ) : (
                catalog.map((ci) => {
                  const eligibleCount = ci.offers.filter(
                    (o) => !addedKeys.has(`${o.supplierId}::${o.supplierItemId}`),
                  ).length
                  const allAdded = eligibleCount === 0

                  return (
                    <button
                      key={ci.id}
                      type="button"
                      disabled={allAdded}
                      onClick={() => handleCatalogItemClick(ci)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-b last:border-b-0"
                    >
                      <div className="text-sm font-medium">{ci.label}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {ci.offers.map((o) => {
                          const added = addedKeys.has(`${o.supplierId}::${o.supplierItemId}`)
                          return (
                            <span
                              key={`${o.supplierId}::${o.supplierItemId}`}
                              className={added ? 'line-through text-slate-400' : ''}
                            >
                              <span className="font-medium text-slate-600">{o.supplierName}</span>
                              <span className="ml-1">({formatTierList(o.quantityTiers)})</span>
                              {o.hasVariants && <span className="ml-1 text-slate-400">·variants</span>}
                            </span>
                          )
                        })}
                      </div>
                      {allAdded && (
                        <div className="mt-0.5 text-xs text-slate-400">All suppliers already added</div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <p className="text-xs text-slate-500">
              Clicking an item adds one line per supplier offering it. Items already in your list are crossed out.
            </p>
          </div>
        </div>
      )}

      {/* Variant quantity dialog */}
      {variantItem && (
        <VariantQuantityDialog
          open={!!variantItem}
          onOpenChange={(open) => { if (!open) setVariantItem(null) }}
          supplierItemId={variantItem.supplierItemId}
          supplierItemName={`${variantItem.itemName} — ${variantItem.supplierName}`}
          itemQuantityTiers={variantItem.quantityTiers}
          initialQuantities={variantInitialQuantities}
          onConfirm={handleVariantConfirm}
        />
      )}
    </div>
  )
}
