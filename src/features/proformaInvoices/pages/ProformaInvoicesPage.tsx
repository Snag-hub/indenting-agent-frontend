import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { proformaInvoiceApi, type ProformaInvoiceSummaryDto } from '@/features/proformaInvoices/api/proformaInvoiceApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Sent: 'default',
  Acknowledged: 'secondary',
  Cancelled: 'destructive',
}

export function ProformaInvoicesPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  useAuthStore()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.proformaInvoices.list({ page }),
    queryFn: () => proformaInvoiceApi.list({ pageSize: 20, page }),
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<ProformaInvoiceSummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Doc #',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    { accessorKey: 'title', header: 'Title' },
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
      accessorKey: 'itemCount',
      header: 'Items',
      cell: ({ getValue }) => `${getValue()} item(s)`,
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
            onClick={() => navigate({ to: '/proforma-invoices/$id', params: { id: row.original.id } })}
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
        title="Proforma Invoices"
        description="Manage proforma invoices"
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
    </div>
  )
}
