import { Link, Outlet, useChildMatches } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { supplierItemApi, type SupplierItemSummaryDto } from '@/features/supplierCatalog/api/supplierItemApi'
import { categoryApi, type CategoryTreeNode } from '@/features/catalog/api/categoryApi'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { queryKeys } from '@/lib/queryKeys'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  minOrderQty: z.number().int().min(1),
  batchSize: z.number().int().min(1),
  leadTimeDays: z.number().int().min(0),
  categoryId: z.string().nullable().optional(),
})
type FormData = z.infer<typeof schema>

function flattenTree(nodes: CategoryTreeNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${'  '.repeat(depth)}${n.name}` },
    ...flattenTree(n.children, depth + 1),
  ])
}

export function MyItemsPage() {
  const childMatches = useChildMatches()
  const hasChildRoute = childMatches.length > 0

  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierItemSummaryDto | undefined>()
  const [deleting, setDeleting] = useState<SupplierItemSummaryDto | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.supplierItems.mine({ search, page }),
    queryFn: () => supplierItemApi.mine({ search, page, pageSize: 20 }),
  })

  const { data: categoryTree } = useQuery({
    queryKey: queryKeys.catalog.categoryTree(),
    queryFn: categoryApi.getTree,
  })

  const categories = categoryTree ? flattenTree(categoryTree) : []

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { minOrderQty: 1, batchSize: 1, leadTimeDays: 0, categoryId: null },
  })

  const categoryIdValue = useWatch({ control, name: 'categoryId' })

  const create = useMutation({
    mutationFn: (d: FormData) => supplierItemApi.create({ ...d, categoryId: d.categoryId || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.supplierItems.mine() }); setFormOpen(false); reset() },
  })

  const update = useMutation({
    mutationFn: (d: FormData) => supplierItemApi.update(editing!.id, { ...d, categoryId: d.categoryId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supplierItems.mine() })
      qc.invalidateQueries({ queryKey: queryKeys.supplierItems.detail(editing!.id) })
      setFormOpen(false); setEditing(undefined)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => supplierItemApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.supplierItems.mine() }); setDeleting(undefined) },
  })

  function openCreate() {
    setEditing(undefined)
    reset({ minOrderQty: 1, batchSize: 1, leadTimeDays: 0, categoryId: null })
    setFormOpen(true)
  }

  function openEdit(item: SupplierItemSummaryDto) {
    setEditing(item)
    reset({
      name: item.name,
      description: '',
      minOrderQty: item.minOrderQty,
      batchSize: item.batchSize,
      leadTimeDays: item.leadTimeDays,
      categoryId: item.categoryId ?? null,
    })
    setFormOpen(true)
  }

  const columns: ColumnDef<SupplierItemSummaryDto>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'categoryName', header: 'Category', cell: ({ row }) => row.original.categoryName ?? '—' },
    { accessorKey: 'minOrderQty', header: 'MOQ' },
    { accessorKey: 'batchSize', header: 'Batch Size' },
    { accessorKey: 'leadTimeDays', header: 'Lead Time (days)' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button size="icon" variant="ghost" asChild>
            <Link to="/my-items/$id" params={{ id: row.original.id }}><Eye className="h-4 w-4" /></Link>
          </Button>
          <Button size="icon" variant="ghost" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setDeleting(row.original)}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ]

  if (hasChildRoute) {
    return <Outlet />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description="Manage your supplier item catalog."
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Item
          </Button>
        }
      />

      <Input placeholder="Search items..." value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="max-w-sm" />

      <DataTable columns={columns} data={data?.data ?? []} totalCount={data?.totalCount ?? 0}
        page={page} pageSize={20} onPageChange={setPage} isLoading={isLoading} />

      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(undefined) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'New Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => editing ? update.mutate(d) : create.mutate(d))} className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={categoryIdValue || '__none__'}
                onValueChange={(v) => setValue('categoryId', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>MOQ *</Label>
                <Input type="number" {...register('minOrderQty', { valueAsNumber: true })} />
                {errors.minOrderQty && <p className="text-xs text-red-500">{errors.minOrderQty.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Batch Size *</Label>
                <Input type="number" {...register('batchSize', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Lead Time (days) *</Label>
                <Input type="number" {...register('leadTimeDays', { valueAsNumber: true })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Saving...' : editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(undefined) }}
        title="Delete Item" description={`Delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id)} isLoading={remove.isPending}
      />
    </div>
  )
}
