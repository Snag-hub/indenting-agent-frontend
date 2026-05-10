import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ItemSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectItem: (item: { id: string; name: string }) => void
  supplierIdFilter?: string  // optional supplier filter
}

/**
 * Dialog for searching and selecting supplier items
 */
export function ItemSearchDialog({
  open,
  onOpenChange,
  onSelectItem,
  supplierIdFilter,
}: ItemSearchDialogProps) {
  const [search, setSearch] = useState('')

  const { data: queryData, isLoading } = useQuery({
    queryKey: ['supplier-items-browse', search, supplierIdFilter],
    queryFn: () =>
      supplierItemApi.browse({
        search: search || undefined,
        supplierId: supplierIdFilter,
        page: 1,
        pageSize: 50,
      }),
    enabled: open,
  })

  // Normalize response: extract items array regardless of response structure
  // @ts-ignore - API response type may vary; we handle both array and PagedResult structures
  const items: Array<{ id: string; name: string; supplierName: string; masterItemName?: string }> =
    Array.isArray(queryData) ? queryData : (queryData?.data ?? [])

  const handleSelect = (item: { id: string; name: string; supplierName?: string; masterItemName?: string }) => {
    onSelectItem({
      id: item.id,
      name: item.name,
    })
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <Input
            placeholder="Search items by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
            autoFocus
          />

          {/* Items List */}
          <div className="h-[300px] border rounded-md p-4 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                No items found
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item: { id: string; name: string; supplierName: string; masterItemName?: string }) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 text-left"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">
                        Supplier: {item.supplierName}
                      </div>
                      {item.masterItemName && (
                        <div className="text-xs text-slate-500">
                          Master Item: {item.masterItemName}
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
