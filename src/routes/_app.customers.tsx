import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { customerApi, type CustomerDto } from '@/features/accounts/api/customerApi'
import { CustomerFormDialog } from '@/features/accounts/components/CustomerFormDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { queryKeys } from '@/lib/queryKeys'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_app/customers')({
  component: CustomersPage,
})

function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerDto | undefined>()
  const [deleting, setDeleting] = useState<CustomerDto | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.customers.list({ search, page }),
    queryFn: () => customerApi.list({ search, page, pageSize: 20 }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.list() })
      setDeleting(undefined)
    },
  })

  const columns: ColumnDef<CustomerDto>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'contactEmail', header: 'Email', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'contactPhone', header: 'Phone', cell: ({ getValue }) => getValue() ?? '—' },
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
          <Button size="icon" variant="ghost" asChild>
            <Link to="/customers/$id" params={{ id: row.original.id }}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(row.original); setFormOpen(true) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setDeleting(row.original)}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer accounts and access mappings."
        action={
          <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> New Customer
          </Button>
        }
      />

      <Input
        placeholder="Search customers..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(undefined) }}
        existing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(undefined) }}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        isLoading={remove.isPending}
      />
    </div>
  )
}
