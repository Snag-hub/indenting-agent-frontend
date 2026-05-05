import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  quotationApi,
  type QuotationItemDto,
} from '@/features/quotations/api/quotationApi'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ── Types ──────────────────────────────────────────────────────────────────────

interface VariantRow {
  supplierItemVariantId: string
  dimensionSummary: string
  sku: string | null
  quantity: number
  unitPrice: number
  rfqQuantity?: number
}

export interface QuotationItemEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  quotationId: string
  versionId: string
  /** Edit mode only — the existing item to modify */
  item?: QuotationItemDto
  /** Called after a successful add or update so the parent can invalidate its query */
  onSuccess: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuotationItemEditor({
  open,
  onOpenChange,
  mode,
  quotationId,
  versionId,
  item,
  onSuccess,
}: QuotationItemEditorProps) {
  // ── Add-mode item selection state ──
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [itemSearch, setItemSearch] = useState('')

  // ── Shared form state ──
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)

  // ── Derived flags ──
  const hasVariants = mode === 'edit'
    ? (item?.variants?.length ?? 0) > 0
    : variantRows.length > 0

  const rfqMax = item?.rfqQuantity && item.rfqQuantity > 0 ? item.rfqQuantity : undefined
  const variantTotal = variantRows.reduce((s, r) => s + (r.quantity || 0), 0)
  const variantExceedsMax = rfqMax !== undefined && variantTotal > rfqMax
  const simpleExceedsMax = rfqMax !== undefined && qty > rfqMax

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: browseResult } = useQuery({
    queryKey: ['supplier-items', 'browse', itemSearch],
    queryFn: () => supplierItemApi.browse({ page: 1, pageSize: 100, search: itemSearch }),
    enabled: mode === 'add' && open,
  })

  const { data: loadedVariants } = useQuery({
    queryKey: ['supplier-item-variants', selectedItemId],
    queryFn: () => supplierItemApi.getVariants(selectedItemId!),
    enabled: selectedItemId !== null,
  })

  // When variants load for a newly selected item → populate variant rows
  useEffect(() => {
    if (!loadedVariants) return
    if (loadedVariants.length > 0) {
      setVariantRows(
        loadedVariants.map((v) => ({
          supplierItemVariantId: v.id,
          dimensionSummary: v.dimensionSummary,
          sku: v.sku,
          quantity: 0,
          unitPrice: 0,
        }))
      )
    } else {
      setVariantRows([])
    }
  }, [loadedVariants])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (payload: Parameters<typeof quotationApi.addItem>[2]) =>
      quotationApi.addItem(quotationId, versionId, payload),
    onSuccess: () => {
      toast.success('Item added')
      onSuccess()
      onOpenChange(false)
    },
    onError: () => toast.error('Failed to add item'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof quotationApi.updateItem>[3]) =>
      quotationApi.updateItem(quotationId, item!.id, versionId, payload),
    onSuccess: () => {
      toast.success('Item updated')
      onSuccess()
      onOpenChange(false)
    },
    onError: () => toast.error('Failed to update item'),
  })

  const isSaving = addMutation.isPending || updateMutation.isPending

  // ── Initialise state when dialog opens / item changes ─────────────────────

  useEffect(() => {
    if (!open) {
      setSelectedItemId(null)
      setItemSearch('')
      setVariantRows([])
      setQty(1)
      setUnitPrice(0)
      return
    }
    if (mode === 'edit' && item) {
      const hasV = (item.variants?.length ?? 0) > 0
      if (hasV) {
        setVariantRows(
          item.variants!.map((v) => ({
            supplierItemVariantId: v.supplierItemVariantId,
            dimensionSummary: v.dimensionSummary ?? '',
            sku: v.sku ?? null,
            quantity: v.quantity,
            unitPrice: v.unitPrice ?? 0,
            rfqQuantity: v.rfqQuantity,
          }))
        )
      } else {
        setQty(item.quantity)
        setUnitPrice(item.unitPrice)
      }
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handler ──────────────────────────────────────────────────────────

  function handleSave() {
    if (mode === 'edit') {
      if (hasVariants) {
        updateMutation.mutate({
          quantity: variantTotal,
          unitPrice: 0,
          variants: variantRows.map((r) => ({
            supplierItemVariantId: r.supplierItemVariantId,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
          })),
        })
      } else {
        updateMutation.mutate({ quantity: qty, unitPrice })
      }
    } else {
      // add mode
      if (!selectedItemId) return
      if (hasVariants) {
        const nonZero = variantRows.filter((r) => r.quantity > 0)
        addMutation.mutate({
          supplierItemId: selectedItemId,
          quantity: variantTotal || 1,
          unitPrice: 0,
          variants: nonZero.map((r) => ({
            supplierItemVariantId: r.supplierItemVariantId,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
          })),
        })
      } else {
        addMutation.mutate({
          supplierItemId: selectedItemId,
          quantity: qty,
          unitPrice,
        })
      }
    }
  }

  // ── Derived UI flags ──────────────────────────────────────────────────────

  const showItemPicker = mode === 'add'
  const showVariantTable = hasVariants
  const showSimpleForm = !hasVariants && (mode === 'edit' || selectedItemId !== null)

  const canSave =
    !variantExceedsMax &&
    !simpleExceedsMax &&
    !isSaving &&
    (mode === 'edit' || selectedItemId !== null) &&
    (showVariantTable ? variantTotal > 0 : qty > 0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add Item' : `Edit — ${item?.supplierItemName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Item picker (add mode) ─────────────────────────────────────── */}
          {showItemPicker && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Search Items</Label>
                <Input
                  placeholder="Search by name…"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Item</Label>
                <Select
                  value={selectedItemId ?? '__none__'}
                  onValueChange={(v) => {
                    const newId = v === '__none__' ? null : v
                    setSelectedItemId(newId)
                    setVariantRows([])
                    setQty(1)
                    setUnitPrice(0)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>
                      Select item
                    </SelectItem>
                    {(browseResult?.data ?? []).map((si) => (
                      <SelectItem key={si.id} value={si.id}>
                        {si.name} — {si.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── RFQ item-level hint ────────────────────────────────────────── */}
          {rfqMax !== undefined && (
            <p className="text-xs text-muted-foreground">
              RFQ requested quantity:{' '}
              <span className="font-medium">{rfqMax} units</span>
            </p>
          )}

          {/* ── Variant table ──────────────────────────────────────────────── */}
          {showVariantTable && (
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    {mode === 'edit' && (
                      <TableHead className="w-20 text-right">RFQ Qty</TableHead>
                    )}
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-32 text-right">Unit Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantRows.map((row, i) => (
                    <TableRow key={row.supplierItemVariantId}>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.dimensionSummary || row.sku || row.supplierItemVariantId.slice(0, 8) + '…'}
                      </TableCell>

                      {mode === 'edit' && (
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {row.rfqQuantity != null && row.rfqQuantity > 0
                            ? row.rfqQuantity
                            : '—'}
                        </TableCell>
                      )}

                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          className="w-20 text-right ml-auto"
                          value={row.quantity}
                          onChange={(e) => {
                            const updated = [...variantRows]
                            updated[i] = {
                              ...updated[i],
                              quantity: parseInt(e.target.value) || 0,
                            }
                            setVariantRows(updated)
                          }}
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28 text-right ml-auto"
                          value={row.unitPrice}
                          onChange={(e) => {
                            const updated = [...variantRows]
                            updated[i] = {
                              ...updated[i],
                              unitPrice: parseFloat(e.target.value) || 0,
                            }
                            setVariantRows(updated)
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Footer: validation + totals */}
              <div className="flex items-center justify-between text-xs">
                {variantExceedsMax ? (
                  <span className="text-destructive">
                    Total qty ({variantTotal}) exceeds RFQ quantity ({rfqMax})
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-muted-foreground">
                  Total:{' '}
                  <span className={variantExceedsMax ? 'text-destructive font-medium' : ''}>
                    {variantTotal}
                    {rfqMax !== undefined ? ` / ${rfqMax}` : ''}
                  </span>{' '}
                  units ·{' '}
                  {formatCurrency(
                    variantRows.reduce((s, r) => s + r.quantity * r.unitPrice, 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* ── Simple item form ───────────────────────────────────────────── */}
          {showSimpleForm && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Quantity{rfqMax !== undefined ? ` (max ${rfqMax})` : ''}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={rfqMax}
                  value={qty}
                  className={simpleExceedsMax ? 'border-destructive' : ''}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                />
                {simpleExceedsMax && (
                  <p className="text-xs text-destructive">
                    Exceeds RFQ quantity of {rfqMax}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <p className="col-span-2 text-xs text-muted-foreground text-right">
                Total: {formatCurrency(qty * unitPrice)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving
              ? 'Saving…'
              : mode === 'add'
                ? 'Add Item'
                : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
