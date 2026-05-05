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

interface VariantQuantityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierItemId: string
  supplierItemName: string
  initialQuantities?: Record<string, number>
  maxTotal?: number   // optional cap: sum of all variant quantities must not exceed this
  enquiryVariants?: Array<{ id: string; quantity: number }>  // filter to only these variants when creating from enquiry
  enquiryItemVariants?: Array<{ id: string }>  // filter to only these variants when editing enquiry-linked items
  onConfirm: (variants: Array<{ variantId: string; quantity: number; dimensionSummary: string; sku: string | null }>) => void
}

export function VariantQuantityDialog({
  open,
  onOpenChange,
  supplierItemId,
  supplierItemName,
  initialQuantities,
  maxTotal,
  enquiryVariants,
  enquiryItemVariants,
  onConfirm,
}: VariantQuantityDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities ?? {})

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['supplier-item-variants', supplierItemId],
    queryFn: () => supplierItemApi.getVariants(supplierItemId),
    enabled: open && !!supplierItemId,
  })


  // Sync initial quantities & pre-fill from enquiry variants when dialog opens
  useEffect(() => {
    if (open) {
      if (initialQuantities) {
        setQuantities(initialQuantities)
      } else if (enquiryVariants) {
        setQuantities(Object.fromEntries(enquiryVariants.map((v) => [v.id, v.quantity])))
      } else {
        setQuantities({})
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleQuantityChange = (variantId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(0, qty),
    }))
  }

  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0)
  const remaining = maxTotal !== undefined ? maxTotal - totalQuantity : undefined

  const handleConfirm = () => {
    const selected = variants
      .filter((v) => {
        const qty = quantities[v.id]
        // Only include variants where quantity is explicitly set to > 0
        return typeof qty === 'number' && qty > 0
      })
      .map((v) => ({
        variantId: v.id,
        quantity: quantities[v.id],
        dimensionSummary: v.dimensionSummary,
        sku: v.sku,
      }))

    // CRITICAL: Only allow confirm if at least one variant has been selected with positive quantity
    if (selected.length === 0) {
      // Show error or just close - don't allow empty variants to be sent
      onOpenChange(false)
      return
    }

    onConfirm(selected)
    setQuantities({})
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuantities({})
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <TableHead className="w-24">{enquiryVariants ? 'Enquiry Qty' : 'Quantity'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants
                      .filter((v) => {
                        // Filter to enquiry variants if creating from enquiry
                        if (enquiryVariants) return enquiryVariants.some((ev) => ev.id === v.id)
                        // Filter to enquiry item variants if editing enquiry-linked item
                        if (enquiryItemVariants) return enquiryItemVariants.some((ev) => ev.id === v.id)
                        // Show all variants if no enquiry context
                        return true
                      })
                      .map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">
                          {variant.dimensionSummary || '—'}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {variant.sku || '—'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={
                              maxTotal !== undefined
                                ? (quantities[variant.id] ?? 0) + Math.max(0, maxTotal - totalQuantity)
                                : undefined
                            }
                            value={quantities[variant.id] ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0
                              const otherTotal = totalQuantity - (quantities[variant.id] ?? 0)
                              const capped = maxTotal !== undefined
                                ? Math.min(val, Math.max(0, maxTotal - otherTotal))
                                : val
                              handleQuantityChange(variant.id, capped)
                            }}
                            className="w-20"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
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
