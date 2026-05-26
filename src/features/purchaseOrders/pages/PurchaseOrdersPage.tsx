import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { purchaseOrderApi, type PurchaseOrderSummaryDto } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Confirmed: 'default',
  Closed: 'secondary',
}

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | undefined>()
  // Hooks must be declared before any early return — child-route mount
  // takes the Outlet branch below, and React requires identical hook
  // order on every render.
  const role = useAuthStore((s) => s.user?.role)
  // Customers own POs — only Customer / Admin see Create-Direct + Delete.
  const canCreateDirect = role === 'Customer' || role === 'Admin'
  const canDelete = role === 'Customer' || role === 'Admin'

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.pos.list({ page }),
    queryFn: () => purchaseOrderApi.list({ pageSize: 20, page }),
  })

  const deletePO = useMutation({
    mutationFn: (id: string) => purchaseOrderApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.list() })
      setDeleting(undefined)
    },
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<PurchaseOrderSummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Doc #',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    { accessorKey: 'supplierName', header: 'Supplier Name' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={statusColors[getValue() as string]}>
          {getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: 'itemCount',
      header: 'Item Count',
      cell: ({ getValue }) => `${getValue()} item(s)`,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ getValue }) => format(new Date(getValue() as string), 'dd MMM yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: row.original.id } })}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDeleting(row.original.id)}
              title="Delete PO"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage purchase orders"
        action={
          canCreateDirect ? (
            <Button onClick={() => navigate({ to: '/purchase-orders/new' })}>
              <Plus className="mr-2 h-4 w-4" /> New Direct PO
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          totalCount={data?.totalCount ?? 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined)
        }}
        title="Delete Purchase Order"
        description="This will permanently remove the PO. POs with downstream PIs / DOs may block deletion."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => deleting && deletePO.mutate(deleting)}
        isLoading={deletePO.isPending}
      />
    </div>
  )
}
