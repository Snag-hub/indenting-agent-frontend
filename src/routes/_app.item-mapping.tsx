import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { supplierItemApi, type SupplierItemSummaryDto } from '@/features/supplierCatalog/api/supplierItemApi'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { queryKeys } from '@/lib/queryKeys'
import type { ColumnDef } from '@tanstack/react-table'
import { Link2, Link2Off } from 'lucide-react'

export const Route = createFileRoute('/_app/item-mapping')({
  component: ItemMappingPage,
})

function ItemMappingPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [unlinking, setUnlinking] = useState<SupplierItemSummaryDto | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.supplierItems.browse({ search, page }),
    queryFn: () => supplierItemApi.browse({ search, page, pageSize: 20 }),
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
          <Badge variant="success">{item.masterItemName}</Badge>
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
              <Button size="sm" variant="outline" disabled>
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
