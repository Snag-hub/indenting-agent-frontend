import { useCallback, useMemo } from 'react'

export type ItemVariantMode = 'rfq' | 'quotation' | 'proforma' | 'delivery-order' | 'purchase-order'

export interface Variant {
  variantId: string
  sku: string | null
  dimensionSummary: string

  // RFQ mode
  quantity?: number

  // Quotation mode
  quantityOffered?: number
  unitPrice?: number

  // Proforma/DO mode
  orderedQty?: number
  invoicedQty?: number
  remainingQty?: number
  dispatchedQty?: number
  thisDocQty?: number
}

export interface ItemWithVariants {
  id?: string
  supplierItemId: string
  itemName: string
  variants: Variant[]

  // Total calculations per mode
  totalQuantity?: number
  totalPrice?: number
  totalRemaining?: number
}

interface UseItemVariantManagerProps {
  mode: ItemVariantMode
  items?: ItemWithVariants[]
}

interface ColumnConfig {
  key: string
  label: string
  sortable: boolean
  numeric: boolean
}

/**
 * Custom hook for managing items and variants across different entity types
 * Handles: validation, balance calculations, column configuration, totals
 */
export function useItemVariantManager({
  mode,
  items = [],
}: UseItemVariantManagerProps) {
  // Get column configuration based on mode
  const columnConfig = useMemo<ColumnConfig[]>(() => {
    switch (mode) {
      case 'rfq':
        return [
          { key: 'dimensionSummary', label: 'Variant', sortable: true, numeric: false },
          { key: 'sku', label: 'SKU', sortable: true, numeric: false },
          { key: 'quantity', label: 'Quantity', sortable: false, numeric: true },
        ]

      case 'quotation':
        return [
          { key: 'dimensionSummary', label: 'Variant', sortable: true, numeric: false },
          { key: 'sku', label: 'SKU', sortable: true, numeric: false },
          { key: 'quantity', label: 'RFQ Qty', sortable: false, numeric: true },
          { key: 'quantityOffered', label: 'Offered Qty', sortable: false, numeric: true },
          { key: 'unitPrice', label: 'Unit Price', sortable: false, numeric: true },
        ]

      case 'proforma':
        return [
          { key: 'dimensionSummary', label: 'Variant', sortable: true, numeric: false },
          { key: 'sku', label: 'SKU', sortable: true, numeric: false },
          { key: 'orderedQty', label: 'Ordered', sortable: false, numeric: true },
          { key: 'invoicedQty', label: 'Invoiced', sortable: false, numeric: true },
          { key: 'remainingQty', label: 'Remaining', sortable: false, numeric: true },
          { key: 'thisDocQty', label: 'This Document', sortable: false, numeric: true },
        ]

      case 'delivery-order':
        return [
          { key: 'dimensionSummary', label: 'Variant', sortable: true, numeric: false },
          { key: 'sku', label: 'SKU', sortable: true, numeric: false },
          { key: 'orderedQty', label: 'Ordered', sortable: false, numeric: true },
          { key: 'dispatchedQty', label: 'Dispatched', sortable: false, numeric: true },
          { key: 'remainingQty', label: 'Remaining', sortable: false, numeric: true },
          { key: 'thisDocQty', label: 'This Document', sortable: false, numeric: true },
        ]

      case 'purchase-order':
        return [
          { key: 'dimensionSummary', label: 'Variant', sortable: true, numeric: false },
          { key: 'sku', label: 'SKU', sortable: true, numeric: false },
          { key: 'quantity', label: 'Quantity', sortable: false, numeric: true },
        ]

      default:
        return []
    }
  }, [mode])

  // Calculate totals based on mode
  const totals = useMemo(() => {
    let totalQuantity = 0
    let totalPrice = 0
    let totalRemaining = 0

    items.forEach((item) => {
      if (!item.variants) return

      item.variants.forEach((variant) => {
        switch (mode) {
          case 'rfq':
            totalQuantity += variant.quantity ?? 0
            break

          case 'quotation':
            totalQuantity += variant.quantityOffered ?? 0
            totalPrice += ((variant.quantityOffered ?? 0) * (variant.unitPrice ?? 0))
            break

          case 'proforma':
            totalQuantity += variant.thisDocQty ?? 0
            totalRemaining += variant.remainingQty ?? 0
            break

          case 'delivery-order':
            totalQuantity += variant.thisDocQty ?? 0
            totalRemaining += variant.remainingQty ?? 0
            break

          case 'purchase-order':
            totalQuantity += variant.quantity ?? 0
            break
        }
      })
    })

    return {
      totalQuantity,
      totalPrice,
      totalRemaining,
    }
  }, [items, mode])

  // Validate quantity constraints
  const validateQuantity = useCallback(
    (variant: Variant, newQuantity: number): { valid: boolean; error?: string } => {
      if (newQuantity < 0) {
        return { valid: false, error: 'Quantity must be >= 0' }
      }

      // Mode-specific validation
      switch (mode) {
        case 'proforma':
        case 'delivery-order':
          if (variant.remainingQty !== undefined && newQuantity > variant.remainingQty) {
            return {
              valid: false,
              error: `Cannot exceed remaining quantity (${variant.remainingQty})`,
            }
          }
          break

        case 'quotation':
          if (variant.quantity !== undefined && newQuantity > variant.quantity) {
            return {
              valid: false,
              error: `Cannot exceed RFQ quantity (${variant.quantity})`,
            }
          }
          break
      }

      return { valid: true }
    },
    [mode]
  )

  // Get display value for a variant field based on mode
  const getVariantField = useCallback(
    (variant: Variant, field: string): number | string | null => {
      switch (field) {
        case 'dimensionSummary':
          return variant.dimensionSummary
        case 'sku':
          return variant.sku
        case 'quantity':
          return variant.quantity ?? 0
        case 'quantityOffered':
          return variant.quantityOffered ?? 0
        case 'unitPrice':
          return variant.unitPrice ?? 0
        case 'orderedQty':
          return variant.orderedQty ?? 0
        case 'invoicedQty':
          return variant.invoicedQty ?? 0
        case 'dispatchedQty':
          return variant.dispatchedQty ?? 0
        case 'remainingQty':
          return variant.remainingQty ?? 0
        case 'thisDocQty':
          return variant.thisDocQty ?? 0
        default:
          return null
      }
    },
    []
  )

  // Determine if a variant table row is editable
  const isEditable = useCallback(
    (mode: ItemVariantMode): boolean => {
      return mode !== 'purchase-order'
    },
    []
  )

  // Format currency for display
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }, [])

  return {
    columnConfig,
    totals,
    validateQuantity,
    getVariantField,
    isEditable,
    formatCurrency,
  }
}
