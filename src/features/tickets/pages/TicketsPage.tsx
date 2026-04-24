import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ticketApi, type TicketSummaryDto } from '@/features/tickets/api/ticketApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Plus } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Open: 'default',
  'In Progress': 'default',
  Resolved: 'secondary',
  Closed: 'secondary',
}

const priorityColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Low: 'outline',
  Medium: 'default',
  High: 'destructive',
  Critical: 'destructive',
}

export function TicketsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tickets.list({ search, status, priority, page }),
    queryFn: () => ticketApi.list({ search, status: status || undefined, priority: priority || undefined, pageSize: 20, page }),
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<TicketSummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: '#',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    { accessorKey: 'title', header: 'Title' },
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
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => (
        <Badge variant={priorityColors[getValue() as string]}>
          {getValue() as string}
        </Badge>
      ),
    },
    {
      accessorKey: 'assignedToName',
      header: 'Assigned To',
      cell: ({ getValue }) => getValue() ? <span className="text-sm">{getValue() as string}</span> : <span className="text-muted-foreground text-sm">Unassigned</span>,
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate({ to: '/tickets/$id', params: { id: row.original.id } })}
          >
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Search</label>
          <Input
            placeholder="Search by title…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
          <select
            className="h-9 px-3 py-2 bg-background border border-input rounded-md text-sm"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Priority</label>
          <select
            className="h-9 px-3 py-2 bg-background border border-input rounded-md text-sm"
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1) }}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

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
          pageCount={data?.pageCount ?? 1}
          page={page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
