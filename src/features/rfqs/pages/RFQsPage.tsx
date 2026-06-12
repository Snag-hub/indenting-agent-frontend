import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { rfqApi, type RFQSummaryDto } from '@/features/rfqs/api/rfqApi'
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
import { Eye, Plus, Send, Lock, Trash2 } from 'lucide-react'
import { ThreadDrawerButton } from '@/features/threads/components/ThreadDrawerButton'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Submitted: 'default',
  Closed: 'secondary',
  Declined: 'destructive',
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Declined', label: 'Declined' },
]

const DATE_FIELDS: FilterOption[] = [
  { value: 'createdAt', label: 'Created' },
  { value: 'dueDate', label: 'Due Date' },
]

export function RFQsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role
  const isAdmin = role === 'Admin'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateField, setDateField] = useState('createdAt')
  const [supplierId, setSupplierId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [page, setPage] = useState(1)
  const [sending, setSending] = useState<string | undefined>()
  const [closing, setClosing] = useState<string | undefined>()
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
    dateField: dateField !== 'createdAt' ? dateField : undefined,
    supplierId: supplierId || undefined,
    customerId: customerId || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.rfqs.list({ ...filterParams, page }),
    queryFn: () => rfqApi.list({ ...filterParams, pageSize: 20, page }),
  })

  const sendRFQ = useMutation({
    mutationFn: (id: string) => rfqApi.send(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() }); setSending(undefined) },
  })
  const closeRFQ = useMutation({
    mutationFn: (id: string) => rfqApi.close(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() }); setClosing(undefined) },
  })
  const deleteRFQ = useMutation({
    mutationFn: (id: string) => rfqApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() }); setDeleting(undefined) },
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<RFQSummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Doc #',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => <span className="text-sm">{row.original.supplierName}</span> },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant={statusColors[getValue() as string]}>{getValue() as string}</Badge>,
    },
    { accessorKey: 'itemCount', header: 'Items', cell: ({ getValue }) => `${getValue()} item(s)` },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ getValue }) => {
        const date = getValue() as string | undefined
        return date ? format(new Date(date), 'dd MMM yyyy') : '—'
      },
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
          <ThreadDrawerButton entityType="RFQ" entityId={row.original.id} size="sm" />
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: '/rfqs/$id', params: { id: row.original.id } })}>
            <Eye className="h-4 w-4" />
          </Button>
          {role === 'Customer' && row.original.status === 'Draft' && (
            <Button size="icon" variant="ghost" onClick={() => setSending(row.original.id)} title="Send RFQ">
              <Send className="h-4 w-4" />
            </Button>
          )}
          {role === 'Customer' && row.original.status === 'Submitted' && (
            <Button size="icon" variant="ghost" onClick={() => setClosing(row.original.id)} title="Close RFQ">
              <Lock className="h-4 w-4" />
            </Button>
          )}
          {(role === 'Customer' || isAdmin) && (
            <Button size="icon" variant="ghost" onClick={() => setDeleting(row.original.id)} title="Delete RFQ">
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
        title="RFQs"
        description="Create and manage request for quotations"
        action={
          role === 'Customer' ? (
            <Button onClick={() => navigate({ to: '/rfqs/new' })}>
              <Plus className="mr-2 h-4 w-4" /> New RFQ
            </Button>
          ) : undefined
        }
      />

      <ListFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by doc #…"
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1) }}
        statusOptions={STATUS_OPTIONS}
        fromDate={fromDate}
        onFromDateChange={(v) => { setFromDate(v); setPage(1) }}
        toDate={toDate}
        onToDateChange={(v) => { setToDate(v); setPage(1) }}
        dateFields={DATE_FIELDS}
        dateField={dateField}
        onDateFieldChange={(v) => { setDateField(v); setPage(1) }}
        supplierId={isAdmin ? supplierId : undefined}
        onSupplierChange={isAdmin ? (v) => { setSupplierId(v); setPage(1) } : undefined}
        supplierOptions={isAdmin ? supplierOptions : undefined}
        customerId={isAdmin ? customerId : undefined}
        onCustomerChange={isAdmin ? (v) => { setCustomerId(v); setPage(1) } : undefined}
        customerOptions={isAdmin ? customerOptions : undefined}
        onClear={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); setDateField('createdAt'); setSupplierId(''); setCustomerId(''); setPage(1) }}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
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
              <p className="text-sm text-slate-500">No RFQs found.</p>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: '/enquiries' })}>
                View Enquiries
              </Button>
            </div>
          }
        />
      )}

      <ConfirmDialog open={!!sending} onOpenChange={(o) => { if (!o) setSending(undefined) }} title="Send RFQ" description="This will send the RFQ to all invited suppliers." confirmLabel="Send" onConfirm={() => sending && sendRFQ.mutate(sending)} isLoading={sendRFQ.isPending} />
      <ConfirmDialog open={!!closing} onOpenChange={(o) => { if (!o) setClosing(undefined) }} title="Close RFQ" description="This will mark the RFQ as Closed." confirmLabel="Close" onConfirm={() => closing && closeRFQ.mutate(closing)} isLoading={closeRFQ.isPending} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(undefined) }} title="Delete RFQ" description="This will permanently remove the RFQ." variant="destructive" confirmLabel="Delete" onConfirm={() => deleting && deleteRFQ.mutate(deleting)} isLoading={deleteRFQ.isPending} />
    </div>
  )
}
