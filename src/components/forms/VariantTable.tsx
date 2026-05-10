import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useItemVariantManager } from './useItemVariantManager'
import type { ItemVariantMode, Variant, ItemWithVariants } from './useItemVariantManager'

interface VariantTableProps {
  mode: ItemVariantMode
  items: ItemWithVariants[]
  onVariantChange: (itemIndex: number, variantIndex: number, field: string, value: unknown) => void
  onVariantRemove?: (itemIndex: number, variantIndex: number) => void
  expandedItems?: Set<string>
  onToggleExpand?: (itemId: string) => void
}

/**
 * Reusable variant table component for displaying and editing variants
 * Handles column rendering, quantity inputs, validation, and balance tracking
 */
export function VariantTable({
  mode,
  items,
  onVariantChange,
  onVariantRemove,
  expandedItems = new Set(),
  onToggleExpand = () => {},
}: VariantTableProps) {
  const { columnConfig, isEditable, formatCurrency } = useItemVariantManager({
    mode,
    items,
  })

  const isEditMode = isEditable(mode)

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No items added yet. Click "Add Item" to get started.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            {columnConfig.map((col) => (
              <TableHead
                key={col.key}
                className={col.numeric ? 'text-right' : ''}
              >
                {col.label}
              </TableHead>
            ))}
            {isEditMode && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, itemIndex) => {
            const isExpanded = expandedItems.has(item.id || itemIndex.toString())

            return (
              <div key={item.id || itemIndex}>
                {/* Item Header Row */}
                <TableRow className="bg-slate-50 hover:bg-slate-100">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => onToggleExpand(item.id || itemIndex.toString())}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell colSpan={columnConfig.length} className="font-semibold">
                    {item.itemName}
                    <span className="text-slate-500 ml-2">
                      ({item.variants.length} variant{item.variants.length !== 1 ? 's' : ''})
                    </span>
                  </TableCell>
                  {isEditMode && <TableCell></TableCell>}
                </TableRow>

                {/* Variant Rows (shown when item is expanded) */}
                {isExpanded &&
                  item.variants.map((variant, variantIndex) => (
                    <TableRow key={`${item.id}-${variantIndex}`} className="border-t-0">
                      <TableCell></TableCell>
                      {/* Variant Name */}
                      <TableCell className="pl-8">
                        <span className="text-slate-600 text-sm">
                          {variant.dimensionSummary || '—'}
                        </span>
                      </TableCell>

                      {/* SKU */}
                      {columnConfig.some((col) => col.key === 'sku') && (
                        <TableCell className="text-slate-600 text-sm">
                          {variant.sku || '—'}
                        </TableCell>
                      )}

                      {/* Mode-specific columns */}
                      {columnConfig.map((col) => {
                        if (['dimensionSummary', 'sku'].includes(col.key)) return null

                        const value = getVariantValue(variant, col.key)

                        return (
                          <TableCell key={col.key} className={col.numeric ? 'text-right' : ''}>
                            {isEditMode && canEditField(mode, col.key) ? (
                              <Input
                                type={col.key.includes('Price') ? 'number' : 'number'}
                                step={col.key.includes('Price') ? '0.01' : '1'}
                                min="0"
                                value={typeof value === 'number' ? value : ''}
                                onChange={(e) => {
                                  const newValue = col.key.includes('Price')
                                    ? parseFloat(e.target.value) || 0
                                    : parseInt(e.target.value, 10) || 0
                                  onVariantChange(itemIndex, variantIndex, col.key, newValue)
                                }}
                                className={`w-24 ${col.numeric ? 'text-right' : ''}`}
                              />
                            ) : (
                              <span className="text-slate-700">
                                {col.key.includes('Price')
                                  ? formatCurrency(typeof value === 'number' ? value : 0)
                                  : value ?? 0}
                              </span>
                            )}
                          </TableCell>
                        )
                      })}

                      {/* Delete button */}
                      {isEditMode && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVariantRemove?.(itemIndex, variantIndex)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </div>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// Helper functions
function getVariantValue(variant: Variant, fieldKey: string): number | null {
  switch (fieldKey) {
    case 'quantity':
      return variant.quantity ?? null
    case 'quantityOffered':
      return variant.quantityOffered ?? null
    case 'unitPrice':
      return variant.unitPrice ?? null
    case 'orderedQty':
      return variant.orderedQty ?? null
    case 'invoicedQty':
      return variant.invoicedQty ?? null
    case 'remainingQty':
      return variant.remainingQty ?? null
    case 'dispatchedQty':
      return variant.dispatchedQty ?? null
    case 'thisDocQty':
      return variant.thisDocQty ?? null
    default:
      return null
  }
}

function canEditField(mode: ItemVariantMode, fieldKey: string): boolean {
  // Purchase order is read-only
  if (mode === 'purchase-order') return false

  // RFQ: can edit quantity
  if (mode === 'rfq' && fieldKey === 'quantity') return true

  // Quotation: can edit quantityOffered and unitPrice
  if (mode === 'quotation' && ['quantityOffered', 'unitPrice'].includes(fieldKey)) return true

  // Proforma/DO: can edit thisDocQty (dispatch/invoice qty)
  if (['proforma', 'delivery-order'].includes(mode) && fieldKey === 'thisDocQty') return true

  return false
}
