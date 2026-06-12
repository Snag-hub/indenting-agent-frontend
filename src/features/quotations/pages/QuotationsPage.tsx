import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { quotationApi, type QuotationSummaryDto } from '@/features/quotations/api/quotationApi'
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
import { Eye, Trash2 } from 'lucide-react'
import { ThreadDrawerButton } from '@/features/threads/components/ThreadDrawerButton'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Submitted: 'default',
  Accepted: 'secondary',
  Rejected: 'destructive',
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'RevisionRequested', label: 'Revision Requested' },
]

export function QuotationsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'Admin'

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
    queryKey: queryKeys.quotations.list({ ...filterParams, page }),
    queryFn: () => quotationApi.list({ ...filterParams, pageSize: 20, page }),
  })

  const deleteQuotation = useMutation({
    mutationFn: (id: string) => quotationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotations.list() })
      setDeleting(undefined)
    },
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<QuotationSummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Doc #',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) || '—'}</span>,
    },
    { accessorKey: 'rfqTitle', header: 'RFQ #' },
    { accessorKey: 'supplierName', header: 'Supplier' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={statusColors[getValue() as string]}>{getValue() as string}</Badge>,
    },
    {
      accessorKey: 'versionCount',
      header: 'Versions',
      cell: ({ getValue }) => `${getValue()} version(s)`,
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
          <ThreadDrawerButton entityType="Quotation" entityId={row.original.id} size="sm" />
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: '/quotations/$id', params: { id: row.original.id } })}>
            <Eye className="h-4 w-4" />
          </Button>
          {(role === 'Supplier' || isAdmin) && (
            <Button size="icon" variant="ghost" onClick={() => setDeleting(row.original.id)} title="Delete Quotation">
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations" description="Manage and track quotations" />

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
          emptyState={<p className="text-sm text-slate-500">No quotations found.</p>}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => { if (!open) setDeleting(undefined) }}
        title="Delete Quotation"
        description="This will permanently remove the quotation."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteQuotation.mutate(deleting)}
        isLoading={deleteQuotation.isPending}
      />
    </div>
  )
}
