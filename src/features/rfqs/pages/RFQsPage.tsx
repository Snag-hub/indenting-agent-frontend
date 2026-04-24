import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { rfqApi, type RFQSummaryDto } from '@/features/rfqs/api/rfqApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Plus, Send, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Sent: 'default',
  Closed: 'secondary',
}

export function RFQsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sending, setSending] = useState<string | undefined>()
  const [closing, setClosing] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.rfqs.list({ search, page }),
    queryFn: () => rfqApi.list({ search, pageSize: 20, page }),
  })

  const sendRFQ = useMutation({
    mutationFn: (id: string) => rfqApi.send(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      setSending(undefined)
    },
  })

  const closeRFQ = useMutation({
    mutationFn: (id: string) => rfqApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rfqs.list() })
      setClosing(undefined)
    },
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<RFQSummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Doc #',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    { accessorKey: 'title', header: 'Title' },
    {
      accessorKey: 'supplierName',
      header: 'Supplier',
      cell: ({ getValue }) => <span>{(getValue() as string) || '—'}</span>,
    },
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
      header: 'Items',
      cell: ({ getValue }) => `${getValue()} item(s)`
    },
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate({ to: '/rfqs/$id', params: { id: row.original.id } })}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {role === 'Customer' && row.original.status === 'Draft' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSending(row.original.id)}
              title="Send RFQ"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}

          {role === 'Customer' && row.original.status === 'Sent' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setClosing(row.original.id)}
              title="Close RFQ"
            >
              <Lock className="h-4 w-4" />
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

      <Input
        placeholder="Search RFQs by title..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
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
        />
      )}

      <ConfirmDialog
        open={!!sending}
        onOpenChange={(open) => {
          if (!open) setSending(undefined)
        }}
        title="Send RFQ"
        description="This will send the RFQ to all invited suppliers."
        confirmLabel="Send"
        onConfirm={() => sending && sendRFQ.mutate(sending)}
        isLoading={sendRFQ.isPending}
      />

      <ConfirmDialog
        open={!!closing}
        onOpenChange={(open) => {
          if (!open) setClosing(undefined)
        }}
        title="Close RFQ"
        description="This will mark the RFQ as Closed."
        confirmLabel="Close"
        onConfirm={() => closing && closeRFQ.mutate(closing)}
        isLoading={closeRFQ.isPending}
      />
    </div>
  )
}
