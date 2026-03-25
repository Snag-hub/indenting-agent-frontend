import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { categoryApi, type CategoryTreeNode } from '@/features/catalog/api/categoryApi'
import { categorySchema, type CategoryFormValues } from '@/features/catalog/schemas/categorySchema'
import { queryKeys } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/_app/catalog/categories')({
  component: CategoriesPage,
})

function CategoriesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryTreeNode | null>(null)

  const { data: tree = [], isLoading } = useQuery({
    queryKey: queryKeys.catalog.categoryTree(),
    queryFn: categoryApi.getTree,
  })

  const createMutation = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.catalog.categoryTree() }); setOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormValues }) =>
      categoryApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.catalog.categoryTree() }); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: categoryApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.catalog.categoryTree() }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Categories</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} /> New Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
            <CategoryForm
              onSubmit={(v) => createMutation.mutate(v)}
              loading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-slate-500">Loading…</div>
      ) : tree.length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center">No categories yet.</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200">
          {tree.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              depth={0}
              onEdit={setEditing}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          {editing && (
            <CategoryForm
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

function CategoryNode({
  node, depth, onEdit, onDelete,
}: {
  node: CategoryTreeNode
  depth: number
  onEdit: (n: CategoryTreeNode) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0"
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 w-4"
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : <span className="w-4 inline-block" />}
        </button>
        <span className="flex-1 text-sm font-medium text-slate-800">{node.name}</span>
        <button onClick={() => onEdit(node)} className="text-slate-400 hover:text-slate-700 p-1">
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(node.id)} className="text-slate-400 hover:text-red-600 p-1">
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <CategoryNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}

function CategoryForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<CategoryFormValues>
  onSubmit: (v: CategoryFormValues) => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
