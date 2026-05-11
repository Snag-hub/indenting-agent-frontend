import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type DocumentItemsMode =
  | 'enquiry'
  | 'rfq'
  | 'quotation'
  | 'purchase-order'
  | 'proforma-invoice'
  | 'delivery-order'

export interface DocumentItemVariant {
  id: string
  dimensionSummary?: string | null
  sku?: string | null
  quantity: number
  unitPrice?: number
}

export interface DocumentLineItem {
  id: string
  name: string
  supplierName?: string | null
  quantity: number
  unitPrice?: number
  totalPrice?: number
  notes?: string | null
  variants?: DocumentItemVariant[] | null
}

interface ModeConfig {
  showSupplierName: boolean
  showPricing: boolean
  showTotalRow: boolean
  alwaysExpanded: boolean
  qtyLabel: string
}

const MODE_CONFIG: Record<DocumentItemsMode, ModeConfig> = {
  enquiry:            { showSupplierName: true,  showPricing: false, showTotalRow: false, alwaysExpanded: false, qtyLabel: 'Qty' },
  rfq:                { showSupplierName: true,  showPricing: false, showTotalRow: false, alwaysExpanded: false, qtyLabel: 'Qty' },
  quotation:          { showSupplierName: false, showPricing: true,  showTotalRow: true,  alwaysExpanded: false, qtyLabel: 'Qty' },
  'purchase-order':   { showSupplierName: false, showPricing: true,  showTotalRow: false, alwaysExpanded: false, qtyLabel: 'Qty' },
  'proforma-invoice': { showSupplierName: false, showPricing: true,  showTotalRow: true,  alwaysExpanded: false, qtyLabel: 'Qty' },
  'delivery-order':   { showSupplierName: false, showPricing: false, showTotalRow: false, alwaysExpanded: false, qtyLabel: 'Qty Dispatched' },
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

interface DocumentItemsTableProps {
  mode: DocumentItemsMode
  items: DocumentLineItem[]
  actions?: {
    onEdit?: (item: DocumentLineItem) => void
    onDelete?: (item: DocumentLineItem) => void
  }
  emptyMessage?: string
}

export function DocumentItemsTable({
  mode,
  items,
  actions,
  emptyMessage = 'No items.',
}: DocumentItemsTableProps) {
  const config = MODE_CONFIG[mode]
  const hasActions = !!(actions?.onEdit || actions?.onDelete)

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (config.alwaysExpanded) return new Set(items.map((i) => i.id))
    return new Set()
  })

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Column count for colSpan on empty row
  let colCount = 3 // Item + Qty + Notes
  if (config.showPricing) colCount += 2 // Unit Price + Total
  if (hasActions) colCount += 1

  const grandTotal = config.showTotalRow
    ? items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0)
    : 0

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>{config.qtyLabel}</TableHead>
            {config.showPricing && <TableHead className="text-right">Unit Price</TableHead>}
            {config.showPricing && <TableHead className="text-right">Total</TableHead>}
            <TableHead>Notes</TableHead>
            {hasActions && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center text-muted-foreground text-sm py-6">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            items.flatMap((item) => {
              const hasVariants = !!item.variants?.length
              const isExpanded = expanded.has(item.id)
              const showToggle = hasVariants && !config.alwaysExpanded

              const rows: React.ReactNode[] = [
                <TableRow key={item.id}>
                  {/* Item cell */}
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      {showToggle && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 shrink-0"
                          onClick={() => toggle(item.id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {config.showSupplierName && item.supplierName && (
                          <div className="text-xs text-muted-foreground">{item.supplierName}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Qty cell */}
                  <TableCell className="text-sm font-medium">
                    {item.quantity}
                    {hasVariants && !config.alwaysExpanded && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {item.variants!.length} variant{item.variants!.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Pricing cells */}
                  {config.showPricing && (
                    <TableCell className="text-sm text-right">
                      {hasVariants
                        ? <span className="text-muted-foreground">—</span>
                        : item.unitPrice != null ? formatCurrency(item.unitPrice) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  )}
                  {config.showPricing && (
                    <TableCell className="text-sm text-right font-medium">
                      {item.totalPrice != null
                        ? formatCurrency(item.totalPrice)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  )}

                  {/* Notes cell */}
                  <TableCell className="text-sm">
                    {item.notes ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  {/* Actions cell */}
                  {hasActions && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {actions?.onEdit && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => actions.onEdit!(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {actions?.onDelete && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => actions.onDelete!(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>,
              ]

              // Variant sub-rows
              if (hasVariants && (isExpanded || config.alwaysExpanded)) {
                item.variants!.forEach((v) => {
                  const variantTotal =
                    config.showPricing && v.unitPrice != null
                      ? v.unitPrice * v.quantity
                      : null

                  rows.push(
                    <TableRow key={`${item.id}-v-${v.id}`} className="bg-muted/30">
                      <TableCell className="text-xs pl-10 py-2 text-muted-foreground">
                        {v.dimensionSummary || <span className="italic">No dimensions</span>}
                        {v.sku && (
                          <span className="ml-2 font-mono text-[11px]">· {v.sku}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">
                        {v.quantity}
                      </TableCell>
                      {config.showPricing && (
                        <TableCell className="text-xs py-2 text-right text-muted-foreground">
                          {v.unitPrice != null ? formatCurrency(v.unitPrice) : <span>—</span>}
                        </TableCell>
                      )}
                      {config.showPricing && (
                        <TableCell className="text-xs py-2 text-right text-muted-foreground">
                          {variantTotal != null ? formatCurrency(variantTotal) : <span>—</span>}
                        </TableCell>
                      )}
                      <TableCell className="py-2" />
                      {hasActions && <TableCell className="py-2" />}
                    </TableRow>
                  )
                })
              }

              return rows
            })
          )}
        </TableBody>

        {config.showTotalRow && items.length > 0 && (
          <tfoot>
            <tr className="border-t bg-slate-50 font-semibold text-sm">
              <td className="p-4" colSpan={config.showPricing ? 3 : 2}>Grand Total</td>
              <td className="p-4 text-right">{formatCurrency(grandTotal)}</td>
              <td className="p-4" />
              {hasActions && <td className="p-4" />}
            </tr>
          </tfoot>
        )}
      </Table>
    </div>
  )
}
