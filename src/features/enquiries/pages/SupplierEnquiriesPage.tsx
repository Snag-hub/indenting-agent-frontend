import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { enquiryApi, type EnquirySummaryDto } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye } from 'lucide-react'
import { format } from 'date-fns'

export function SupplierEnquiriesPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.enquiries.list({ search, page }),
    queryFn: () => enquiryApi.list({ search, pageSize: 20, page }),
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<EnquirySummaryDto>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Doc #',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ getValue }) => (
        <span className="font-medium text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant="default">{getValue() as string}</Badge>
      ),
    },
    {
      accessorKey: 'itemCount',
      header: 'Items',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{getValue() as number} item(s)</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(getValue() as string), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            title="View Enquiry"
            onClick={() => navigate({ to: '/enquiries/$id', params: { id: row.original.id } })}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ] as ColumnDef<EnquirySummaryDto>[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Browse open customer enquiries"
      />

      <Input
        placeholder="Search enquiries by title..."
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
        />
      )}
    </div>
  )
}
