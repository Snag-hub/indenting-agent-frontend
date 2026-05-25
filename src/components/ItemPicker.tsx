import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Check } from 'lucide-react'
import { enquiryApi, type AvailableEnquiryItemDto } from '@/features/enquiries/api/enquiryApi'
import { categoryApi } from '@/features/catalog/api/categoryApi'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface ItemPickerProps {
  /** Legacy single-supplier filter. Prefer `supplierIds`. */
  supplierId?: string
  /** Multi-supplier filter. If provided, takes precedence over `supplierId`. */
  supplierIds?: string[]
  /**
   * Supplier-item-ids that are already in the parent's basket. The picker uses this
   * to mark offers as "added" via the (supplierId, supplierItemId) tuple.
   */
  selectedSupplierItemIds?: string[]
  /**
   * Fires when the user clicks an item. The full DTO (with all offers) is passed —
   * the parent decides how to fan out across suppliers.
   */
  onSelect: (item: AvailableEnquiryItemDto) => void
}

function flattenCategories(
  nodes: { id: string; name: string; children: { id: string; name: string; children: never[] }[] }[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${'  '.repeat(depth)}${n.name}` },
    ...flattenCategories(n.children as never, depth + 1),
  ])
}

function formatTierList(tiers: number[]): string {
  if (tiers.length === 0) return 'any qty'
  return `lots: ${tiers.map((t) => t.toLocaleString()).join(', ')}`
}

export function ItemPicker({
  supplierId,
  supplierIds,
  selectedSupplierItemIds = [],
  onSelect,
}: ItemPickerProps) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  // Resolve the supplier filter — prefer `supplierIds`, fall back to legacy `supplierId`
  const effectiveSupplierIds =
    supplierIds && supplierIds.length > 0
      ? supplierIds
      : supplierId
        ? [supplierId]
        : undefined

  const { data: categoryTree = [] } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoryApi.getTree(),
  })

  const flatCategories = flattenCategories(categoryTree as never)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['available-items', debouncedSearch, effectiveSupplierIds?.slice().sort().join(',') ?? '', categoryId],
    queryFn: () =>
      enquiryApi.availableItems({
        search: debouncedSearch || undefined,
        supplierIds: effectiveSupplierIds,
        categoryId,
      }),
    enabled: (effectiveSupplierIds && effectiveSupplierIds.length > 0) || !!debouncedSearch || !!categoryId,
  })

  const selectedSet = new Set(selectedSupplierItemIds)
  const allOffersAdded = (item: AvailableEnquiryItemDto) =>
    item.offers.length > 0 && item.offers.every((o) => selectedSet.has(o.supplierItemId))

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={categoryId ?? '__all__'}
          onValueChange={(v) => setCategoryId(v === '__all__' ? undefined : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {flatCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Item list */}
      <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200">
        {(!effectiveSupplierIds || effectiveSupplierIds.length === 0) && !debouncedSearch && !categoryId ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Select a supplier, search, or pick a category to browse items
          </div>
        ) : isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No items found</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const allAdded = allOffersAdded(item)
              const anyVariants = item.offers.some((o) => o.hasVariants)
              return (
                <li
                  key={item.id}
                  className={`flex items-start justify-between gap-3 px-3 py-2.5 ${allAdded ? '' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.resolvedName}</p>
                      {anyVariants && <Badge variant="secondary" className="text-xs">Variants</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {item.offers.map((o) => {
                        const added = selectedSet.has(o.supplierItemId)
                        return (
                          <span
                            key={`${o.supplierId}::${o.supplierItemId}`}
                            className={added ? 'line-through text-slate-400' : ''}
                          >
                            <span className="font-medium text-slate-700">{o.supplierName}</span>
                            <span className="ml-1">({formatTierList(o.quantityTiers)})</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => !allAdded && onSelect(item)}
                    disabled={allAdded}
                    title={allAdded ? 'All suppliers already added' : 'Add item'}
                  >
                    {allAdded ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {effectiveSupplierIds && effectiveSupplierIds.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Clicking an item adds one line per supplier offering it. Lines already in your list are crossed out.
        </p>
      )}
    </div>
  )
}
