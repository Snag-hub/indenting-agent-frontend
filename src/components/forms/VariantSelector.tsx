import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface VariantSelectorResult {
  variantId: string
  sku: string | null
  dimensionSummary: string
  quantity: number
  price?: number
  enquiryQuantity?: number
  remainingQuantity?: number
}

interface VariantSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierItemId: string
  supplierItemName: string

  // Configuration: What mode/columns to display
  mode?: 'enquiry' | 'rfq' | 'quotation' | 'simple' | 'proforma' | 'delivery-order'

  // Context-based filtering (mutually exclusive)
  enquiryId?: string // Filter to enquiry's variants + show balance
  rfqId?: string     // Filter to RFQ's variants + show balance
  // If neither provided → fetch ALL variants

  maxTotal?: number
  initialQuantities?: Record<string, number>
  initialPrices?: Record<string, number>

  onConfirm: (variants: VariantSelectorResult[]) => void
}

export function VariantSelector({
  open,
  onOpenChange,
  supplierItemId,
  supplierItemName,
  mode = 'simple',
  enquiryId,
  rfqId,
  maxTotal,
  initialQuantities,
  initialPrices,
  onConfirm,
}: VariantSelectorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities ?? {})
  const [prices, setPrices] = useState<Record<string, number>>(initialPrices ?? {})

  // Determine which API to call based on context
  const { data: variantsData = [], isLoading } = useQuery({
    queryKey:
      enquiryId
        ? ['variant-selector', 'by-enquiry', supplierItemId, enquiryId]
        : rfqId
        ? ['variant-selector', 'by-rfq', supplierItemId, rfqId]
        : ['variant-selector', supplierItemId],
    queryFn: () =>
      enquiryId
        ? supplierItemApi.getEnquiryVariants(supplierItemId, enquiryId)
        : supplierItemApi.getVariants(supplierItemId),
    enabled: open && !!supplierItemId,
  })

  // Map variants to common structure
  const variants = variantsData.map((v: { id: string; sku: string | null; dimensionSummary?: string; values?: Array<{ dimensionName: string; value: string }>; enquiryQuantity?: number; remainingQuantity?: number; allocatedQuantity?: number }) => ({
    id: v.id,
    sku: v.sku,
    dimensionSummary: v.dimensionSummary || v.values?.map((val) => `${val.dimensionName}: ${val.value}`).join(' | ') || '—',
    enquiryQuantity: v.enquiryQuantity ?? 0,
    remainingQuantity: v.remainingQuantity ?? 0,
    allocatedQuantity: v.allocatedQuantity ?? 0,
  }))

  // Sync initial quantities when dialog opens
  useEffect(() => {
    if (!open) return

    setQuantities(initialQuantities ?? {})
    setPrices(initialPrices ?? {})
  }, [open, initialQuantities, initialPrices])

  const handleQuantityChange = (variantId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(0, qty),
    }))
  }

  const handlePriceChange = (variantId: string, price: number) => {
    setPrices((prev) => ({
      ...prev,
      [variantId]: Math.max(0, price),
    }))
  }

  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0)
  const remaining = maxTotal !== undefined ? maxTotal - totalQuantity : undefined

  const handleConfirm = () => {
    const selected = variants
      .filter((v) => {
        const qty = quantities[v.id]
        return typeof qty === 'number' && qty > 0
      })
      .map((v) => ({
        variantId: v.id,
        sku: v.sku,
        dimensionSummary: v.dimensionSummary,
        quantity: quantities[v.id],
        price: prices[v.id],
        enquiryQuantity: v.enquiryQuantity,
        remainingQuantity: v.remainingQuantity,
      }))

    if (selected.length === 0) {
      onOpenChange(false)
      return
    }

    onConfirm(selected)
    setQuantities({})
    setPrices({})
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuantities({})
      setPrices({})
    }
    onOpenChange(newOpen)
  }

  // Determine which columns to show based on mode
  const showEnquiryBalance = mode === 'enquiry' && enquiryId
  const showPricing = mode === 'quotation'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Select Variants — {supplierItemName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div>
            {variants.length === 0 ? (
              <p className="text-slate-600 py-4">No variants available for this item.</p>
            ) : (
              <div className="rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      {showEnquiryBalance && (
                        <>
                          <TableHead className="text-right">Enquiry Qty</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">
                        {showEnquiryBalance ? 'RFQ Qty' : showPricing ? 'Quantity' : 'Quantity'}
                      </TableHead>
                      {showPricing && (
                        <TableHead className="text-right">Unit Price</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => {
                      const enquiryQty = variant.enquiryQuantity ?? 0
                      const displayRemaining = variant.remainingQuantity ?? (enquiryQty - (quantities[variant.id] ?? 0))
                      const currentQty = quantities[variant.id] ?? 0

                      return (
                        <TableRow key={variant.id}>
                          <TableCell className="font-medium">
                            {variant.dimensionSummary || '—'}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {variant.sku || '—'}
                          </TableCell>
                          {showEnquiryBalance && (
                            <TableCell className="text-right font-medium">
                              {enquiryQty}
                            </TableCell>
                          )}
                          {showEnquiryBalance && (
                            <TableCell className="text-right">
                              <span className={(displayRemaining - currentQty) < 0 ? 'text-red-600 font-semibold' : ''}>
                                {displayRemaining - currentQty}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max={
                                showEnquiryBalance && variant.remainingQuantity !== undefined
                                  ? Math.max(0, variant.remainingQuantity)
                                  : maxTotal !== undefined
                                    ? (quantities[variant.id] ?? 0) + Math.max(0, maxTotal - totalQuantity)
                                    : undefined
                              }
                              value={quantities[variant.id] ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0
                                if (showEnquiryBalance && variant.remainingQuantity !== undefined) {
                                  const capped = Math.min(val, variant.remainingQuantity)
                                  handleQuantityChange(variant.id, capped)
                                } else {
                                  const otherTotal = totalQuantity - (quantities[variant.id] ?? 0)
                                  const capped = maxTotal !== undefined
                                    ? Math.min(val, Math.max(0, maxTotal - otherTotal))
                                    : val
                                  handleQuantityChange(variant.id, capped)
                                }
                              }}
                              className="w-20"
                            />
                          </TableCell>
                          {showPricing && (
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={prices[variant.id] ?? ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  handlePriceChange(variant.id, val)
                                }}
                                placeholder="0.00"
                                className="w-28 text-right"
                              />
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 flex justify-between">
                  <span>Total: <span className="text-slate-900">{totalQuantity}</span></span>
                  {maxTotal !== undefined && (
                    <span className={remaining! < 0 ? 'text-red-600' : 'text-slate-600'}>
                      Max: {maxTotal} — Remaining: {remaining}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={totalQuantity === 0 || isLoading}
            title={totalQuantity === 0 ? 'Enter quantities for at least one variant' : ''}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
