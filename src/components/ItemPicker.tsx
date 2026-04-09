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
  supplierId?: string
  selectedItemIds?: string[]
  onSelect: (item: AvailableEnquiryItemDto) => void
}

// Flatten nested category tree into a flat list for the dropdown
function flattenCategories(
  nodes: { id: string; name: string; children: { id: string; name: string; children: never[] }[] }[],
  depth = 0
): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${'  '.repeat(depth)}${n.name}` },
    ...flattenCategories(n.children as never, depth + 1),
  ])
}

export function ItemPicker({ supplierId, selectedItemIds = [], onSelect }: ItemPickerProps) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Simple debounce via timeout ref
  const handleSearchChange = (value: string) => {
    setSearch(value)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  const { data: categoryTree = [] } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoryApi.getTree(),
  })

  const flatCategories = flattenCategories(categoryTree as never)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['available-items', debouncedSearch, supplierId, categoryId],
    queryFn: () =>
      enquiryApi.availableItems({
        search: debouncedSearch || undefined,
        supplierId,
        categoryId,
      }),
    enabled: !!supplierId || !!debouncedSearch || !!categoryId,
  })

  const isSelected = (item: AvailableEnquiryItemDto) =>
    selectedItemIds.includes(item.supplierItemId ?? item.id)

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
        {!supplierId && !debouncedSearch && !categoryId ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Search for items or select a category to browse
          </div>
        ) : isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No items found
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const selected = isSelected(item)
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.resolvedName}</p>
                    {item.supplierName && (
                      <p className="text-xs text-muted-foreground">{item.supplierName}</p>
                    )}
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {item.hasVariants && (
                      <Badge variant="secondary" className="text-xs">Variants</Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={selected ? 'secondary' : 'outline'}
                      className="h-7 w-7 p-0"
                      onClick={() => !selected && onSelect(item)}
                      disabled={selected}
                      title={selected ? 'Already added' : 'Add item'}
                    >
                      {selected ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
