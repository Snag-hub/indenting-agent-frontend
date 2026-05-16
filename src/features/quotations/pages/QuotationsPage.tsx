import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { quotationApi, type QuotationSummaryDto } from '@/features/quotations/api/quotationApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Submitted: 'default',
  Accepted: 'secondary',
  Rejected: 'destructive',
}

export function QuotationsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.quotations.list({ search, page }),
    queryFn: () => quotationApi.list({ search, pageSize: 20, page }),
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
    { accessorKey: 'rfqTitle', header: 'RFQ Title' },
    { accessorKey: 'supplierName', header: 'Supplier' },
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate({ to: '/quotations/$id', params: { id: row.original.id } })}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {(role === 'Supplier' || role === 'Admin') && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDeleting(row.original.id)}
              title="Delete Quotation"
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
        title="Quotations"
        description="Manage and track quotations"
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by RFQ title or supplier..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
      </div>

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
        title="Delete Quotation"
        description="This will permanently remove the quotation. Accepted quotations with downstream POs may block deletion."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteQuotation.mutate(deleting)}
        isLoading={deleteQuotation.isPending}
      />
    </div>
  )
}
