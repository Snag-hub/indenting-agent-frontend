import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { enquiryApi, type EnquirySummaryDto } from '@/features/enquiries/api/enquiryApi'
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

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Open: 'default',
  Closed: 'secondary',
}

export function EnquiriesPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState<string | undefined>()
  const [closing, setClosing] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.enquiries.list({ search, page }),
    queryFn: () => enquiryApi.list({ search, pageSize: 20, page }),
  })

  const submitEnquiry = useMutation({
    mutationFn: (id: string) => enquiryApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setSubmitting(undefined)
    },
  })

  const closeEnquiry = useMutation({
    mutationFn: (id: string) => enquiryApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setClosing(undefined)
    },
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<EnquirySummaryDto>[] = [
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
    { accessorKey: 'itemCount', header: 'Items', cell: ({ getValue }) => `${getValue()} item(s)` },
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
            onClick={() => navigate({ to: '/enquiries/$id', params: { id: row.original.id } })}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {row.original.status === 'Draft' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSubmitting(row.original.id)}
              title="Submit Enquiry"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}

          {row.original.status === 'Open' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setClosing(row.original.id)}
              title="Close Enquiry"
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
        title="Enquiries"
        description="Create and manage enquiries for items"
        action={
          <Button onClick={() => navigate({ to: '/enquiries/new' })}>
            <Plus className="mr-2 h-4 w-4" /> New Enquiry
          </Button>
        }
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
          isLoading={isLoading}
        />
      )}


      <ConfirmDialog
        open={!!submitting}
        onOpenChange={(open) => {
          if (!open) setSubmitting(undefined)
        }}
        title="Submit Enquiry"
        description="This will change the status to Open and notify relevant parties."
        confirmLabel="Submit"
        onConfirm={() => submitting && submitEnquiry.mutate(submitting)}
        isLoading={submitEnquiry.isPending}
      />

      <ConfirmDialog
        open={!!closing}
        onOpenChange={(open) => {
          if (!open) setClosing(undefined)
        }}
        title="Close Enquiry"
        description="This will mark the enquiry as Closed."
        confirmLabel="Close"
        onConfirm={() => closing && closeEnquiry.mutate(closing)}
        isLoading={closeEnquiry.isPending}
      />
    </div>
  )
}
