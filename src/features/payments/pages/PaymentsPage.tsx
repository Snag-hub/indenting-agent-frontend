import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { paymentApi, type PaymentSummaryDto } from '@/features/payments/api/paymentApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye } from 'lucide-react'
import { format } from 'date-fns'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'outline',
  Confirmed: 'default',
  Rejected: 'destructive',
}

export function PaymentsPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.payments.list({ page }),
    queryFn: () => paymentApi.list({ pageSize: 20, page }),
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<PaymentSummaryDto>[] = [
    { accessorKey: 'referenceNumber', header: 'Reference #' },
    { accessorKey: 'supplierName', header: 'Supplier' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
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
      accessorKey: 'createdAt',
      header: 'Date',
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
            onClick={() => navigate({ to: '/payments/$id', params: { id: row.original.id } })}
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
        title="Payments"
        description="Manage and track payments"
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
