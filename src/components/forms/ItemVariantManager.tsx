import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { VariantTable } from './VariantTable'
import { useItemVariantManager } from './useItemVariantManager'
import type { ItemVariantMode, ItemWithVariants } from './useItemVariantManager'
import { ItemSearchDialog } from './ItemSearchDialog'
import { VariantSelector } from './VariantSelector'

export interface ItemVariantManagerProps {
  mode: ItemVariantMode
  enquiryId?: string
  rfqId?: string
  supplierIdFilter?: string  // optional supplier filter for item search

  form: UseFormReturn<any>
  fieldArrayName: string

  onItemsChange?: (items: ItemWithVariants[]) => void
}

/**
 * Unified component for managing items and variants across all entity types
 * Replaces: QuotationItemEditor, scattered variant tables, item search dialogs
 *
 * Modes:
 * - 'rfq': Select items + quantities (with optional enquiry balance)
 * - 'quotation': Select items + pricing per variant
 * - 'proforma': Select items + dispatch quantities with balance tracking
 * - 'delivery-order': Select items + delivery quantities with balance tracking
 * - 'purchase-order': Display only (read-only)
 */
export function ItemVariantManager({
  mode,
  enquiryId,
  rfqId,
  supplierIdFilter,
  form,
  fieldArrayName,
  onItemsChange,
}: ItemVariantManagerProps) {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: fieldArrayName,
  })

  const { totals } = useItemVariantManager({
    mode,
    items: (fields as unknown) as ItemWithVariants[],
  })

  const [itemSearchOpen, setItemSearchOpen] = useState(false)
  const [variantSelectorOpen, setVariantSelectorOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const isReadOnly = mode === 'purchase-order'

  // Handle adding new item
  const handleAddItem = async (selectedItem: { id: string; name: string }) => {
    setSelectedItemIndex(fields.length)
    setItemSearchOpen(false)

    // For quotation mode, immediately open variant selector to get RFQ variants
    if (mode === 'quotation' && rfqId) {
      setVariantSelectorOpen(true)
    } else {
      // For other modes, just add empty item and let user add variants
      // @ts-ignore - fields type inference with useFieldArray
      append({
        supplierItemId: selectedItem.id,
        itemName: selectedItem.name,
        variants: [],
      })
    }
  }

  // Handle variant selection from VariantSelector
  const handleVariantsSelected = (variants: Array<{ variantId: string; sku: string | null; dimensionSummary: string; quantity: number; price?: number; enquiryQuantity?: number; remainingQuantity?: number }>) => {
    if (selectedItemIndex === null) return

    const itemIndex = selectedItemIndex
    // @ts-ignore - fields type inference with useFieldArray
    const existingItem = fields[itemIndex]

    // Map variant selection results to item variants based on mode
    const mappedVariants = variants.map((v) => {
      switch (mode) {
        case 'rfq':
          return {
            variantId: v.variantId,
            sku: v.sku,
            dimensionSummary: v.dimensionSummary,
            quantity: v.quantity,
            enquiryQuantity: v.enquiryQuantity,
            remainingQuantity: v.remainingQuantity,
          }

        case 'quotation':
          return {
            variantId: v.variantId,
            sku: v.sku,
            dimensionSummary: v.dimensionSummary,
            quantity: v.quantity,
            quantityOffered: v.quantity, // Default to RFQ qty
            unitPrice: v.price ?? 0,
          }

        case 'proforma':
          return {
            variantId: v.variantId,
            sku: v.sku,
            dimensionSummary: v.dimensionSummary,
            orderedQty: v.quantity,
            invoicedQty: 0,
            remainingQty: v.remainingQuantity,
            thisDocQty: 0,
          }

        case 'delivery-order':
          return {
            variantId: v.variantId,
            sku: v.sku,
            dimensionSummary: v.dimensionSummary,
            orderedQty: v.quantity,
            dispatchedQty: 0,
            remainingQty: v.remainingQuantity,
            thisDocQty: 0,
          }

        default:
          return v
      }
    })

    if (existingItem) {
      // Update existing item
      // @ts-ignore - fields type inference with useFieldArray
      update(itemIndex, {
        ...existingItem,
        variants: mappedVariants,
      })
    } else {
      // Add new item (if not already added)
      append({
        // @ts-ignore - fields type inference with useFieldArray
        supplierItemId: fields[itemIndex]?.supplierItemId || '',
        // @ts-ignore - fields type inference with useFieldArray
        itemName: fields[itemIndex]?.itemName || '',
        variants: mappedVariants,
      })
    }

    setVariantSelectorOpen(false)
    setSelectedItemIndex(null)
    // @ts-ignore - fields type inference with useFieldArray
    onItemsChange?.(fields)
  }

  // Handle variant change (quantity, price, etc.)
  const handleVariantChange = (
    itemIndex: number,
    variantIndex: number,
    field: string,
    value: unknown
  ) => {
    // @ts-ignore - fields type inference with useFieldArray
    const item = fields[itemIndex]
    // @ts-ignore - fields type inference with useFieldArray
    if (!item || !item.variants) return

    // @ts-ignore - fields type inference with useFieldArray
    const updatedVariants = [...item.variants]
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      [field]: value,
    }

    // @ts-ignore - fields type inference with useFieldArray
    update(itemIndex, {
      ...item,
      variants: updatedVariants,
    })

    // @ts-ignore - fields type inference with useFieldArray
    onItemsChange?.([...fields])
  }

  // Handle removing a variant
  const handleRemoveVariant = (itemIndex: number, variantIndex: number) => {
    // @ts-ignore - fields type inference with useFieldArray
    const item = fields[itemIndex]
    // @ts-ignore - fields type inference with useFieldArray
    if (!item || !item.variants) return

    // @ts-ignore - fields type inference with useFieldArray
    const updatedVariants = item.variants.filter((_: unknown, idx: number) => idx !== variantIndex)

    if (updatedVariants.length === 0) {
      // If no variants left, remove the item
      remove(itemIndex)
    } else {
      // @ts-ignore - fields type inference with useFieldArray
      update(itemIndex, {
        ...item,
        variants: updatedVariants,
      })
    }

    // @ts-ignore - fields type inference with useFieldArray
    onItemsChange?.([...fields])
  }

  // Toggle item expansion
  const handleToggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Item Button */}
      {!isReadOnly && (
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Items</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItemSearchOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      )}

      {/* Variant Table */}
      <VariantTable
        mode={mode}
        items={(fields as unknown) as ItemWithVariants[]}
        onVariantChange={handleVariantChange}
        onVariantRemove={!isReadOnly ? handleRemoveVariant : undefined}
        expandedItems={expandedItems}
        onToggleExpand={handleToggleExpand}
      />

      {/* Summary Footer */}
      <div className="bg-slate-50 rounded p-4 border border-slate-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Total Items:</span>
            <span className="ml-2 font-semibold">{fields.length}</span>
          </div>
          <div>
            <span className="text-slate-600">Total Quantity:</span>
            <span className="ml-2 font-semibold">{totals.totalQuantity}</span>
          </div>

          {/* Mode-specific totals */}
          {mode === 'quotation' && (
            <div>
              <span className="text-slate-600">Total Price:</span>
              <span className="ml-2 font-semibold">
                ${totals.totalPrice.toFixed(2)}
              </span>
            </div>
          )}

          {['proforma', 'delivery-order'].includes(mode) && (
            <div>
              <span className="text-slate-600">Total Remaining:</span>
              <span className="ml-2 font-semibold">{totals.totalRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* Item Search Dialog */}
      <ItemSearchDialog
        open={itemSearchOpen}
        onOpenChange={setItemSearchOpen}
        onSelectItem={handleAddItem}
        supplierIdFilter={supplierIdFilter}
      />

      {/* Variant Selector Dialog */}
      {selectedItemIndex !== null && (
        <VariantSelector
          open={variantSelectorOpen}
          onOpenChange={setVariantSelectorOpen}
          // @ts-ignore - fields type inference with useFieldArray
          supplierItemId={fields[selectedItemIndex]?.supplierItemId}
          // @ts-ignore - fields type inference with useFieldArray
          supplierItemName={fields[selectedItemIndex]?.itemName}
          mode={
            mode === 'rfq' ? 'rfq'
            : mode === 'quotation' ? 'quotation'
            : mode === 'proforma' ? 'proforma'
            : mode === 'delivery-order' ? 'delivery-order'
            : 'simple'
          }
          enquiryId={enquiryId}
          rfqId={rfqId}
          onConfirm={handleVariantsSelected}
        />
      )}
    </div>
  )
}
