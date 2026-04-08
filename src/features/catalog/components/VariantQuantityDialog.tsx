import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
  onConfirm: (variants: Array<{ variantId: string; quantity: number }>) => void
}

export function VariantQuantityDialog({
  open,
  onOpenChange,
  supplierItemId,
  supplierItemName,
  onConfirm,
}: VariantQuantityDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const { data: itemDetail, isLoading } = useQuery({
    queryKey: ['supplier-items', supplierItemId],
    queryFn: () => supplierItemApi.get(supplierItemId),
    enabled: open,
  })

  const handleQuantityChange = (variantId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(0, qty),
    }))
  }

  const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0)

  const handleConfirm = () => {
    const selected = (itemDetail?.variants ?? [])
      .filter((v) => (quantities[v.id] ?? 0) > 0)
      .map((v) => ({
        variantId: v.id,
        quantity: quantities[v.id] ?? 0,
      }))

    if (selected.length > 0) {
      onConfirm(selected)
      setQuantities({})
      onOpenChange(false)
    }
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
            {!itemDetail?.variants || itemDetail.variants.length === 0 ? (
              <p className="text-slate-600 py-4">No variants available for this item.</p>
            ) : (
              <div className="rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemDetail.variants.map((variant) => {
                      const dimensionSummary = variant.values
                        .map((v) => `${v.value}`)
                        .join(', ')

                      return (
                        <TableRow key={variant.id}>
                          <TableCell className="font-medium">
                            {dimensionSummary || '—'}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {variant.sku || '—'}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={quantities[variant.id] ?? 0}
                              onChange={(e) =>
                                handleQuantityChange(
                                  variant.id,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-20"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
                  Total Quantity: <span className="text-slate-900">{totalQuantity}</span>
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
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
