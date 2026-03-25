import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { itemApi, type ItemSummary } from '@/features/catalog/api/itemApi'
import { queryKeys } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export const Route = createFileRoute('/_app/catalog/items')({
  component: ItemsPage,
})

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
})
type ItemFormValues = z.infer<typeof itemSchema>

function ItemsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ItemSummary | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.catalog.items({ page, pageSize }),
    queryFn: () => itemApi.list({ page, pageSize }),
  })

  const createMutation = useMutation({
    mutationFn: itemApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog', 'items'] }); setOpen(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: itemApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog', 'items'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ItemFormValues }) =>
      itemApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog', 'items'] }); setEditing(null) },
  })

  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Master Items</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} /> New Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Item</DialogTitle></DialogHeader>
            <ItemForm onSubmit={(v) => createMutation.mutate(v)} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Category</th>
              <th className="text-left px-4 py-3 font-medium text-slate-700">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No items yet.</td></tr>
            ) : (
              data?.data.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.categoryName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(item)} className="text-slate-400 hover:text-slate-700 p-1">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(item.id)} className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalCount > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{data.totalCount} items</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          {editing && (
            <ItemForm
              defaultValues={{ name: editing.name }}
              onSubmit={(v) => updateMutation.mutate({ id: editing.id, data: v })}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ItemForm({
  defaultValues, onSubmit, loading,
}: {
  defaultValues?: Partial<ItemFormValues>
  onSubmit: (v: ItemFormValues) => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues,
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Input {...register('description')} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
