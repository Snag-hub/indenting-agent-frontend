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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export function CatalogCategoriesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryTreeNode | null>(null)
  const [deleting, setDeleting] = useState<CategoryTreeNode | null>(null)

  const { data: tree = [], isLoading } = useQuery({
    queryKey: queryKeys.catalog.categoryTree(),
    queryFn: categoryApi.getTree,
  })

  const createMutation = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.catalog.categoryTree() })
      setOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormValues }) =>
      categoryApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.catalog.categoryTree() })
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: categoryApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.catalog.categoryTree() })
      setDeleting(null)
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Categories</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} className="mr-1" /> New Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
            <CategoryForm
              key={String(open)}
              onSubmit={(v) => createMutation.mutate(v)}
              onCancel={() => setOpen(false)}
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
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          {editing && (
            <CategoryForm
              key={editing.id}
              defaultValues={{ name: editing.name }}
              onSubmit={(v) => updateMutation.mutate({ id: editing.id, data: v })}
              onCancel={() => setEditing(null)}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(null) }}
        title="Delete Category"
        description={`Delete "${deleting?.name}"? Child categories will also be removed.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

function CategoryNode({
  node, depth, onEdit, onDelete,
}: {
  node: CategoryTreeNode
  depth: number
  onEdit: (n: CategoryTreeNode) => void
  onDelete: (n: CategoryTreeNode) => void
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
        <button onClick={() => onDelete(node)} className="text-slate-400 hover:text-red-600 p-1">
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
  onCancel,
  loading,
}: {
  defaultValues?: Partial<CategoryFormValues>
  onSubmit: (v: CategoryFormValues) => void
  onCancel: () => void
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
        <Input {...register('name')} autoFocus />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
