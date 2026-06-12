import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { paymentApi, type PaymentSummaryDto } from '@/features/payments/api/paymentApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { customerApi } from '@/features/accounts/api/customerApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ListFilters, type FilterOption } from '@/components/ListFilters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { format } from 'date-fns'

function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'outline',
  Confirmed: 'default',
  Rejected: 'destructive',
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Rejected', label: 'Rejected' },
]

export function PaymentsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [page, setPage] = useState(1)

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
    queryKey: queryKeys.payments.list({ ...filterParams, page }),
    queryFn: () => paymentApi.list({ ...filterParams, pageSize: 20, page }),
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<PaymentSummaryDto>[] = [
    { accessorKey: 'referenceNumber', header: 'Reference #' },
    { accessorKey: 'supplierName', header: 'Supplier' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={statusColors[getValue() as string]}>{getValue() as string}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ getValue }) => format(new Date(getValue() as string), 'dd MMM yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: '/payments/$id', params: { id: row.original.id } })}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Manage and track payments" />

      <ListFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by reference # or supplier…"
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
          emptyState={
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: '/payments/new' })}>
                <Plus className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            </div>
          }
        />
      )}
    </div>
  )
}
