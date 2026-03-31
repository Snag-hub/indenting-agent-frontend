import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { pricingApi, type PriceTierDto } from '@/features/pricing/api/pricingApi'
import { queryKeys } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { format } from 'date-fns'

const schema = z.object({
  minQty: z.number().int().min(1),
  maxQty: z.number().int().min(1).optional().or(z.literal('')),
  unitPrice: z.number().positive(),
  currency: z.string().min(1),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface Props {
  supplierItemId: string
}

export function PriceTierEditor({ supplierItemId }: Props) {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PriceTierDto | undefined>()
  const [deleting, setDeleting] = useState<string | undefined>()

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: queryKeys.pricing.baseTiers(supplierItemId),
    queryFn: () => pricingApi.getBaseTiers(supplierItemId),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'USD', effectiveFrom: new Date().toISOString().split('T')[0] },
  })

  const add = useMutation({
    mutationFn: (data: FormData) =>
      pricingApi.addBaseTier(supplierItemId, {
        minQty: data.minQty,
        maxQty: data.maxQty ? Number(data.maxQty) : undefined,
        unitPrice: data.unitPrice,
        currency: data.currency,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pricing.baseTiers(supplierItemId) })
      setFormOpen(false)
      reset()
    },
  })

  const update = useMutation({
    mutationFn: (data: FormData) =>
      pricingApi.updateBaseTier(editing!.id, {
        minQty: data.minQty,
        maxQty: data.maxQty ? Number(data.maxQty) : undefined,
        unitPrice: data.unitPrice,
        currency: data.currency,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pricing.baseTiers(supplierItemId) })
      setFormOpen(false)
      setEditing(undefined)
      reset()
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => pricingApi.deleteBaseTier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pricing.baseTiers(supplierItemId) })
      setDeleting(undefined)
    },
  })

  const onSubmit = (data: FormData) => {
    if (editing) update.mutate(data)
    else add.mutate(data)
  }

  const isPending = add.isPending || update.isPending

  if (isLoading) return <p className="text-sm text-slate-400">Loading tiers...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(undefined); reset({ currency: 'USD', effectiveFrom: new Date().toISOString().split('T')[0] }); setFormOpen(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <p className="text-sm text-slate-400">No price tiers yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Min Qty</TableHead>
              <TableHead>Max Qty</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.minQty}</TableCell>
                <TableCell>{t.maxQty ?? '∞'}</TableCell>
                <TableCell>{t.unitPrice.toFixed(2)}</TableCell>
                <TableCell>{t.currency}</TableCell>
                <TableCell>{format(new Date(t.effectiveFrom), 'dd MMM yyyy')}</TableCell>
                <TableCell>{t.effectiveTo ? format(new Date(t.effectiveTo), 'dd MMM yyyy') : '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(t.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) { setEditing(undefined); reset() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Price Tier' : 'Add Price Tier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Min Qty *</Label>
                <Input type="number" {...register('minQty', { valueAsNumber: true })} />
                {errors.minQty && <p className="text-xs text-red-500">{errors.minQty.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Max Qty</Label>
                <Input type="number" {...register('maxQty', { valueAsNumber: true })} placeholder="Leave blank for unlimited" />
              </div>
              <div className="space-y-1">
                <Label>Unit Price *</Label>
                <Input type="number" step="0.01" {...register('unitPrice', { valueAsNumber: true })} />
                {errors.unitPrice && <p className="text-xs text-red-500">{errors.unitPrice.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Currency *</Label>
                <Input {...register('currency')} placeholder="USD" />
                {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Effective From *</Label>
                <Input type="date" {...register('effectiveFrom')} />
                {errors.effectiveFrom && <p className="text-xs text-red-500">{errors.effectiveFrom.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Effective To</Label>
                <Input type="date" {...register('effectiveTo')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : editing ? 'Save' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(undefined) }}
        title="Delete Price Tier"
        description="Remove this price tier? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting)}
        isLoading={remove.isPending}
      />
    </div>
  )
}
