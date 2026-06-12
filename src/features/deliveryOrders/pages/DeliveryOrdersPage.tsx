import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { deliveryOrderApi, type DeliveryOrderSummaryDto } from '@/features/deliveryOrders/api/deliveryOrderApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { customerApi } from '@/features/accounts/api/customerApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ListFilters, type FilterOption } from '@/components/ListFilters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Trash2 } from 'lucide-react'
import { ThreadDrawerButton } from '@/features/threads/components/ThreadDrawerButton'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'outline',
  Dispatched: 'default',
  Delivered: 'secondary',
  Cancelled: 'destructive',
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Dispatched', label: 'Dispatched' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export function DeliveryOrdersPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'
  const canDelete = role === 'Supplier' || isAdmin

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
    queryKey: queryKeys.deliveryOrders.list({ ...filterParams, page }),
    queryFn: () => deliveryOrderApi.list({ ...filterParams, pageSize: 20, page }),
  })

  const deleteDO = useMutation({
    mutationFn: (id: string) => deliveryOrderApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveryOrders.list() })
      setDeleting(undefined)
    },
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<DeliveryOrderSummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Doc #',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    { accessorKey: 'supplierName', header: 'Supplier' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={statusColors[getValue() as string]}>{getValue() as string}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => format(new Date(getValue() as string), 'dd MMM yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <ThreadDrawerButton entityType="DeliveryOrder" entityId={row.original.id} size="sm" />
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: '/delivery-orders/$id', params: { id: row.original.id } })}>
            <Eye className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button size="icon" variant="ghost" onClick={() => setDeleting(row.original.id)} title="Delete DO">
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Orders" description="Manage delivery orders" />

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
          emptyState={<p className="text-sm text-slate-500">No delivery orders found.</p>}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => { if (!open) setDeleting(undefined) }}
        title="Delete Delivery Order"
        description="This will permanently remove the DO."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteDO.mutate(deleting)}
        isLoading={deleteDO.isPending}
      />
    </div>
  )
}
