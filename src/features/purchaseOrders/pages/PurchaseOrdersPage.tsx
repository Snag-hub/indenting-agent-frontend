import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { purchaseOrderApi, type PurchaseOrderSummaryDto } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { customerApi } from '@/features/accounts/api/customerApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ListFilters, type FilterOption } from '@/components/ListFilters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { ThreadDrawerButton } from '@/features/threads/components/ThreadDrawerButton'
import { useAuthStore } from '@/stores/authStore'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Confirmed: 'default',
  Closed: 'secondary',
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Closed', label: 'Closed' },
]

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'
  const canCreateDirect = role === 'Customer' || isAdmin
  const canDelete = role === 'Customer' || isAdmin

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | undefined>()

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: () => supplierApi.list({ pageSize: 200 }),
    enabled: isAdmin,
  })
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => customerApi.list({ pageSize: 200 }),
    enabled: isAdmin,
  })
  const supplierOptions: FilterOption[] = suppliersData?.data.map(s => ({ value: s.id, label: s.name })) ?? []
  const customerOptions: FilterOption[] = customersData?.data.map(c => ({ value: c.id, label: c.name })) ?? []

  const filterParams = {
    search: search || undefined,
    status: status || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    supplierId: supplierId || undefined,
    customerId: customerId || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.pos.list({ ...filterParams, page }),
    queryFn: () => purchaseOrderApi.list({ ...filterParams, pageSize: 20, page }),
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
      cell: ({ getValue }) => <Badge variant={statusColors[getValue() as string]}>{getValue() as string}</Badge>,
    },
    { accessorKey: 'itemCount', header: 'Item Count', cell: ({ getValue }) => `${getValue()} item(s)` },
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
          <ThreadDrawerButton entityType="PurchaseOrder" entityId={row.original.id} size="sm" />
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: row.original.id } })}>
            <Eye className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button size="icon" variant="ghost" onClick={() => setDeleting(row.original.id)} title="Delete PO">
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

      <ListFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by doc # or supplier…"
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1) }}
        statusOptions={STATUS_OPTIONS}
        fromDate={fromDate}
        onFromDateChange={(v) => { setFromDate(v); setPage(1) }}
        toDate={toDate}
        onToDateChange={(v) => { setToDate(v); setPage(1) }}
        supplierId={isAdmin ? supplierId : undefined}
        onSupplierChange={isAdmin ? (v) => { setSupplierId(v); setPage(1) } : undefined}
        supplierOptions={isAdmin ? supplierOptions : undefined}
        customerId={isAdmin ? customerId : undefined}
        onCustomerChange={isAdmin ? (v) => { setCustomerId(v); setPage(1) } : undefined}
        customerOptions={isAdmin ? customerOptions : undefined}
        onClear={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); setSupplierId(''); setCustomerId(''); setPage(1) }}
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
          emptyState={<p className="text-sm text-slate-500">No purchase orders found.</p>}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => { if (!open) setDeleting(undefined) }}
        title="Delete Purchase Order"
        description="This will permanently remove the PO."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => deleting && deletePO.mutate(deleting)}
        isLoading={deletePO.isPending}
      />
    </div>
  )
}
