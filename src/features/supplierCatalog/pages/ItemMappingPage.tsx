import { supplierItemApi, type SupplierItemSummaryDto } from '@/features/supplierCatalog/api/supplierItemApi'
import { itemApi, type ItemSummary } from '@/features/catalog/api/itemApi'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { queryKeys } from '@/lib/queryKeys'
import type { ColumnDef } from '@tanstack/react-table'
import { Link2, Link2Off } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function ItemMappingPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [unlinking, setUnlinking] = useState<SupplierItemSummaryDto | undefined>()
  const [linking, setLinking] = useState<SupplierItemSummaryDto | undefined>()
  const [selectedMasterItemId, setSelectedMasterItemId] = useState<string>('')
  const [masterSearch, setMasterSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.supplierItems.browse({ search, page }),
    queryFn: () => supplierItemApi.browse({ search, page, pageSize: 20 }),
  })

  const { data: masterItems } = useQuery({
    queryKey: queryKeys.catalog.items({ search: masterSearch }),
    queryFn: () => itemApi.list({ page: 1, pageSize: 50 }),
    enabled: !!linking,
  })

  const link = useMutation({
    mutationFn: ({ supplierItemId, masterItemId }: { supplierItemId: string; masterItemId: string }) =>
      supplierItemApi.linkToMaster(supplierItemId, masterItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supplierItems.browse() })
      setLinking(undefined)
      setSelectedMasterItemId('')
    },
  })

  const unlink = useMutation({
    mutationFn: (id: string) => supplierItemApi.unlinkFromMaster(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supplierItems.browse() })
      setUnlinking(undefined)
    },
  })

  const columns: ColumnDef<SupplierItemSummaryDto>[] = [
    { accessorKey: 'name', header: 'Supplier Item' },
    { accessorKey: 'supplierName', header: 'Supplier' },
    {
      id: 'masterItem',
      header: 'Master Item',
      cell: ({ row }) => {
        const item = row.original as SupplierItemSummaryDto & { masterItemName?: string }
        return item.masterItemName ? (
          <Badge variant="secondary" className="bg-green-50 text-green-700">{item.masterItemName}</Badge>
        ) : (
          <Badge variant="secondary">Unmapped</Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original as SupplierItemSummaryDto & { masterItemId?: string }
        return (
          <div className="flex items-center gap-2 justify-end">
            {item.masterItemId ? (
              <Button size="sm" variant="outline" onClick={() => setUnlinking(row.original)}>
                <Link2Off className="mr-1 h-4 w-4" /> Unlink
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setLinking(row.original); setSelectedMasterItemId('') }}>
                <Link2 className="mr-1 h-4 w-4" /> Link to Master
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item Mapping"
        description="Link supplier items to master catalog items to deduplicate across suppliers."
      />

      <Input
        placeholder="Search supplier items..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Link to Master Dialog */}
      <Dialog open={!!linking} onOpenChange={(o) => { if (!o) { setLinking(undefined); setSelectedMasterItemId('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link "{linking?.name}" to Master Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search master items..."
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
            />
            <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
              {masterItems?.data.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-400 text-center">No master items found.</p>
              )}
              {masterItems?.data
                .filter((m) => m.name.toLowerCase().includes(masterSearch.toLowerCase()))
                .map((m: ItemSummary) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${selectedMasterItemId === m.id ? 'bg-blue-50 text-blue-700' : ''}`}
                    onClick={() => setSelectedMasterItemId(m.id)}
                  >
                    <span>{m.name}</span>
                    {m.categoryName && <span className="text-xs text-slate-400">{m.categoryName}</span>}
                  </button>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLinking(undefined); setSelectedMasterItemId('') }}>
              Cancel
            </Button>
            <Button
              disabled={!selectedMasterItemId || link.isPending}
              onClick={() => linking && link.mutate({ supplierItemId: linking.id, masterItemId: selectedMasterItemId })}
            >
              {link.isPending ? 'Linking…' : 'Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!unlinking}
        onOpenChange={(o) => { if (!o) setUnlinking(undefined) }}
        title="Unlink from Master"
        description={`Unlink "${unlinking?.name}" from its master item?`}
        confirmLabel="Unlink"
        variant="destructive"
        onConfirm={() => unlinking && unlink.mutate(unlinking.id)}
        isLoading={unlink.isPending}
      />
    </div>
  )
}
