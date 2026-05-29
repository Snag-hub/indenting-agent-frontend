import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  usersApi, myEmployeesApi,
  type EmployeeSummaryDto, type UserStatus,
} from '@/features/users/api/usersApi'
import { InviteEmployeeDialog } from '@/features/users/components/InviteEmployeeDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { queryKeys } from '@/lib/queryKeys'
import { Plus, Pencil, Trash2, Mail, PowerOff, Power } from 'lucide-react'

interface Props {
  mode: 'admin' | 'org'
}

const STATUS_BADGE: Record<UserStatus, string> = {
  Invited: 'bg-amber-100 text-amber-800',
  Active: 'bg-green-100 text-green-800',
  Disabled: 'bg-slate-200 text-slate-600',
}

export function EmployeesPage({ mode }: Props) {
  const qc = useQueryClient()
  const client = mode === 'admin' ? usersApi : myEmployeesApi
  const queryKey = mode === 'admin' ? queryKeys.users : queryKeys.myEmployees

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeSummaryDto | undefined>()
  const [deleting, setDeleting] = useState<EmployeeSummaryDto | undefined>()

  const params = { search, page, pageSize: 20 }
  const { data, isLoading } = useQuery({
    queryKey: queryKey.list(params),
    queryFn: () => client.list(params),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKey.list() })

  const remove = useMutation({
    mutationFn: (id: string) => client.delete(id),
    onSuccess: () => { invalidate(); setDeleting(undefined); toast.success('Employee deleted.') },
  })
  const deactivate = useMutation({
    mutationFn: (id: string) => client.deactivate(id),
    onSuccess: () => { invalidate(); toast.success('Employee deactivated.') },
  })
  const reactivate = useMutation({
    mutationFn: (id: string) => client.reactivate(id),
    onSuccess: () => { invalidate(); toast.success('Employee reactivated.') },
  })
  const resend = useMutation({
    mutationFn: (id: string) => client.resendInvite(id),
    onSuccess: () => { invalidate(); toast.success('Invitation re-sent.') },
  })

  const columns: ColumnDef<EmployeeSummaryDto>[] = [
    { accessorKey: 'fullName', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role' },
    ...(mode === 'admin' ? [{
      id: 'organisation',
      header: 'Organisation',
      cell: ({ row }: { row: { original: EmployeeSummaryDto } }) => {
        const r = row.original
        if (r.organisationType === 'Admin') return <span className="text-slate-500">— Admin —</span>
        return (
          <span>
            <span className="text-xs text-slate-500">{r.organisationType}:</span>{' '}
            {r.customerName ?? r.supplierName ?? '—'}
          </span>
        )
      },
    } as ColumnDef<EmployeeSummaryDto>] : []),
    {
      accessorKey: 'isOrgAdmin',
      header: 'Org Admin',
      cell: ({ getValue }) => (getValue() ? '✓' : ''),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as UserStatus
        return <Badge className={STATUS_BADGE[status]}>{status}</Badge>
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
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            {r.status === 'Invited' && (
              <Button size="icon" variant="ghost" title="Resend invitation"
                onClick={() => resend.mutate(r.id)}>
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" title="Edit"
              onClick={() => { setEditing(r); setFormOpen(true) }}>
              <Pencil className="h-4 w-4" />
            </Button>
            {r.status === 'Disabled' ? (
              <Button size="icon" variant="ghost" title="Reactivate"
                onClick={() => reactivate.mutate(r.id)}>
                <Power className="h-4 w-4 text-green-600" />
              </Button>
            ) : r.status === 'Active' ? (
              <Button size="icon" variant="ghost" title="Deactivate"
                onClick={() => deactivate.mutate(r.id)}>
                <PowerOff className="h-4 w-4 text-amber-600" />
              </Button>
            ) : null}
            <Button size="icon" variant="ghost" title="Delete"
              onClick={() => setDeleting(r)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        )
      },
    },
  ]

  const title = mode === 'admin' ? 'Users' : 'Employees'
  const description = mode === 'admin'
    ? 'Manage user accounts across every organisation in the tenant.'
    : 'Manage the employees of your organisation.'

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Invite Employee
          </Button>
        }
      />

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
      />

      <InviteEmployeeDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={mode}
        existing={editing as never}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(undefined) }}
        title="Delete employee"
        description={`Are you sure you want to delete ${deleting?.fullName}?`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        isLoading={remove.isPending}
      />
    </div>
  )
}
