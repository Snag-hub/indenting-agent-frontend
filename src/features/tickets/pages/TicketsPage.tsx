import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ticketApi, type TicketSummaryDto } from '@/features/tickets/api/ticketApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ListFilters, type FilterOption } from '@/components/ListFilters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Plus } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Open: 'default',
  InProgress: 'default',
  Resolved: 'secondary',
  Closed: 'secondary',
}

const statusLabels: Record<string, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
}

const priorityColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Low: 'outline',
  Medium: 'default',
  High: 'destructive',
  Critical: 'destructive',
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'Open', label: 'Open' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
]

export function TicketsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const filterParams = {
    search: search || undefined,
    status: status || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tickets.list({ ...filterParams, page }),
    queryFn: () => ticketApi.list({ ...filterParams, pageSize: 20, page }),
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<TicketSummaryDto>[] = [
    {
      accessorKey: 'ticketNumber',
      header: '#',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    { accessorKey: 'title', header: 'Title' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={statusColors[getValue() as string]}>
          {statusLabels[getValue() as string] ?? (getValue() as string)}
        </Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => (
        <Badge variant={priorityColors[getValue() as string]}>{getValue() as string}</Badge>
      ),
    },
    {
      accessorKey: 'assignedToName',
      header: 'Assigned To',
      cell: ({ getValue }) => getValue()
        ? <span className="text-sm">{getValue() as string}</span>
        : <span className="text-muted-foreground text-sm">Unassigned</span>,
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
        <div className="flex items-center justify-end">
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: '/tickets/$id', params: { id: row.original.id } })}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        description="Manage and track support tickets"
        action={
          <Button onClick={() => navigate({ to: '/tickets/new' })}>
            <Plus className="mr-2 h-4 w-4" /> New Ticket
          </Button>
        }
      />

      <ListFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by title…"
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1) }}
        statusOptions={STATUS_OPTIONS}
        fromDate={fromDate}
        onFromDateChange={(v) => { setFromDate(v); setPage(1) }}
        toDate={toDate}
        onToDateChange={(v) => { setToDate(v); setPage(1) }}
        onClear={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); setPage(1) }}
      />

      {isLoading ? (
        <div className="space-y-2">
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
          emptyState={<p className="text-sm text-slate-500">No tickets found.</p>}
        />
      )}
    </div>
  )
}
