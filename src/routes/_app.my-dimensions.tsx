import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Tag } from 'lucide-react'

export const Route = createFileRoute('/_app/my-dimensions')({
  component: MyDimensionsPage,
})

interface DimensionValue { id: string; value: string }
interface Dimension { id: string; name: string; values: DimensionValue[] }

const dimSchema = z.object({ name: z.string().min(1, 'Name is required') })
const valSchema = z.object({ value: z.string().min(1, 'Value is required') })

type DimForm = z.infer<typeof dimSchema>
type ValForm = z.infer<typeof valSchema>

function MyDimensionsPage() {
  const qc = useQueryClient()
  const [dimOpen, setDimOpen] = useState(false)
  const [valOpen, setValOpen] = useState<string | undefined>()
  const [deletingDim, setDeletingDim] = useState<Dimension | undefined>()
  const [deletingVal, setDeletingVal] = useState<{ dimId: string; valId: string; label: string } | undefined>()

  const { data: dimensions = [], isLoading } = useQuery<Dimension[]>({
    queryKey: ['my-dimensions'],
    queryFn: () => api.get('/my/dimensions').then((r) => r.data),
  })

  const { register: regDim, handleSubmit: submitDim, reset: resetDim, formState: { errors: dimErrors } } =
    useForm<DimForm>({ resolver: zodResolver(dimSchema) })

  const { register: regVal, handleSubmit: submitVal, reset: resetVal, formState: { errors: valErrors } } =
    useForm<ValForm>({ resolver: zodResolver(valSchema) })

  const createDim = useMutation({
    mutationFn: (d: DimForm) => api.post('/my/dimensions', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-dimensions'] }); setDimOpen(false); resetDim() },
  })

  const deleteDim = useMutation({
    mutationFn: (id: string) => api.delete(`/my/dimensions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-dimensions'] }); setDeletingDim(undefined) },
  })

  const addVal = useMutation({
    mutationFn: ({ dimId, value }: { dimId: string; value: string }) =>
      api.post(`/my/dimensions/${dimId}/values`, { value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-dimensions'] }); setValOpen(undefined); resetVal() },
  })

  const deleteVal = useMutation({
    mutationFn: ({ dimId, valId }: { dimId: string; valId: string }) =>
      api.delete(`/my/dimensions/${dimId}/values/${valId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-dimensions'] }); setDeletingVal(undefined) },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dimensions"
        description="Define dimensions and values for your item variants."
        action={
          <Button onClick={() => setDimOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Dimension
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : dimensions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
          <Tag className="h-8 w-8" />
          <p className="text-sm">No dimensions yet. Create one to define item variants.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dimensions.map((dim) => (
            <Card key={dim.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{dim.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { resetVal(); setValOpen(dim.id) }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeletingDim(dim)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dim.values.length === 0 ? (
                  <p className="text-xs text-slate-400">No values yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dim.values.map((v) => (
                      <div key={v.id} className="flex items-center gap-1">
                        <Badge variant="secondary">{v.value}</Badge>
                        <button
                          onClick={() => setDeletingVal({ dimId: dim.id, valId: v.id, label: v.value })}
                          className="text-slate-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Dimension Dialog */}
      <Dialog open={dimOpen} onOpenChange={setDimOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Dimension</DialogTitle></DialogHeader>
          <form onSubmit={submitDim((d) => createDim.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input {...regDim('name')} placeholder="e.g. Color, Size, Material" />
              {dimErrors.name && <p className="text-xs text-red-500">{dimErrors.name.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDimOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createDim.isPending}>
                {createDim.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Value Dialog */}
      <Dialog open={!!valOpen} onOpenChange={(o) => { if (!o) setValOpen(undefined) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Value</DialogTitle></DialogHeader>
          <form onSubmit={submitVal((d) => valOpen && addVal.mutate({ dimId: valOpen, value: d.value }))} className="space-y-4">
            <div className="space-y-1">
              <Label>Value *</Label>
              <Input {...regVal('value')} placeholder="e.g. Red, Large, Cotton" />
              {valErrors.value && <p className="text-xs text-red-500">{valErrors.value.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setValOpen(undefined)}>Cancel</Button>
              <Button type="submit" disabled={addVal.isPending}>
                {addVal.isPending ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingDim} onOpenChange={(o) => { if (!o) setDeletingDim(undefined) }}
        title="Delete Dimension"
        description={`Delete dimension "${deletingDim?.name}" and all its values?`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deletingDim && deleteDim.mutate(deletingDim.id)}
        isLoading={deleteDim.isPending}
      />

      <ConfirmDialog
        open={!!deletingVal} onOpenChange={(o) => { if (!o) setDeletingVal(undefined) }}
        title="Remove Value"
        description={`Remove value "${deletingVal?.label}"?`}
        confirmLabel="Remove" variant="destructive"
        onConfirm={() => deletingVal && deleteVal.mutate(deletingVal)}
        isLoading={deleteVal.isPending}
      />
    </div>
  )
}
