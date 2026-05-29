import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  deliveryOrderApi,
  type DeliveryOrderItemLotsDto,
  type DeliveryOrderLotDto,
  type AddLotInput,
} from '@/features/deliveryOrders/api/deliveryOrderApi'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Props {
  deliveryOrderId: string
}

const lotsQueryKey = (id: string) => ['delivery-orders', id, 'lots'] as const

const schema = z.object({
  lotNumber: z.string().min(1, 'Lot number is required').max(100),
  quantity: z.coerce.number().int().min(1, 'Must be at least 1'),
  manufactureDate: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export function DeliveryOrderLotsCard({ deliveryOrderId }: Props) {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const canEdit = role === 'Supplier' || role === 'Admin'

  const { data: items = [], isLoading } = useQuery({
    queryKey: lotsQueryKey(deliveryOrderId),
    queryFn: () => deliveryOrderApi.listLots(deliveryOrderId),
  })

  // Dialog state — one editor reused for create + edit, one confirm for delete.
  type EditorState =
    | { mode: 'closed' }
    | { mode: 'add'; itemId: string; itemName: string; remaining: number }
    | { mode: 'edit'; itemId: string; itemName: string; remaining: number; lot: DeliveryOrderLotDto }
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [removing, setRemoving] = useState<DeliveryOrderLotDto | undefined>()

  const close = () => setEditor({ mode: 'closed' })

  const invalidate = () => qc.invalidateQueries({ queryKey: lotsQueryKey(deliveryOrderId) })

  const addLot = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: AddLotInput }) =>
      deliveryOrderApi.addLot(deliveryOrderId, itemId, payload),
    onSuccess: () => { invalidate(); close(); toast.success('Lot added.') },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not add the lot.'),
  })

  const updateLot = useMutation({
    mutationFn: ({ lotId, payload }: { lotId: string; payload: AddLotInput }) =>
      deliveryOrderApi.updateLot(lotId, payload),
    onSuccess: () => { invalidate(); close(); toast.success('Lot updated.') },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not update the lot.'),
  })

  const removeLot = useMutation({
    mutationFn: (lotId: string) => deliveryOrderApi.removeLot(lotId),
    onSuccess: () => { invalidate(); setRemoving(undefined); toast.success('Lot removed.') },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not remove the lot.'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lot Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading lots…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items on this delivery order.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <ItemLotBlock
                key={item.deliveryOrderItemId}
                item={item}
                canEdit={canEdit}
                onAdd={() => setEditor({
                  mode: 'add',
                  itemId: item.deliveryOrderItemId,
                  itemName: item.supplierItemName,
                  remaining: item.remainingQuantity,
                })}
                onEdit={(lot) => setEditor({
                  mode: 'edit',
                  itemId: item.deliveryOrderItemId,
                  itemName: item.supplierItemName,
                  remaining: item.remainingQuantity + lot.quantity, // ceiling excludes this lot
                  lot,
                })}
                onRemove={(lot) => setRemoving(lot)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {editor.mode !== 'closed' && (
        <LotEditorDialog
          state={editor}
          onClose={close}
          onSubmit={(form) => {
            const payload: AddLotInput = {
              lotNumber: form.lotNumber.trim(),
              quantity: form.quantity,
              manufactureDate: form.manufactureDate || null,
              expiryDate: form.expiryDate || null,
              notes: form.notes ? form.notes.trim() : null,
            }
            if (editor.mode === 'add') addLot.mutate({ itemId: editor.itemId, payload })
            else updateLot.mutate({ lotId: editor.lot.id, payload })
          }}
          isPending={addLot.isPending || updateLot.isPending}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => { if (!o) setRemoving(undefined) }}
        title="Remove Lot"
        description={`Remove lot ${removing?.lotNumber ?? ''} (${removing?.quantity ?? 0} units)?`}
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={() => removing && removeLot.mutate(removing.id)}
        isLoading={removeLot.isPending}
      />
    </Card>
  )
}

interface BlockProps {
  item: DeliveryOrderItemLotsDto
  canEdit: boolean
  onAdd: () => void
  onEdit: (lot: DeliveryOrderLotDto) => void
  onRemove: (lot: DeliveryOrderLotDto) => void
}

function ItemLotBlock({ item, canEdit, onAdd, onEdit, onRemove }: BlockProps) {
  const ratio = `${item.lotsTotalQuantity} / ${item.quantityDispatched}`
  const fullyAllocated = item.remainingQuantity === 0

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-medium text-sm">{item.supplierItemName}</p>
          <p className="text-xs text-muted-foreground">
            Lots allocate <span className="font-mono">{ratio}</span> dispatched units
            {item.remainingQuantity > 0 && (
              <span> · <span className="text-amber-600">{item.remainingQuantity} unallocated</span></span>
            )}
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            disabled={fullyAllocated}
            title={fullyAllocated ? 'All dispatched units are already allocated to lots' : undefined}
            onClick={onAdd}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Lot
          </Button>
        )}
      </div>

      {item.lots.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No lots recorded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="text-left py-1 pr-4 font-normal">Lot #</th>
              <th className="text-right py-1 pr-6 font-normal w-20">Qty</th>
              <th className="text-left py-1 pr-4 font-normal">Mfg</th>
              <th className="text-left py-1 pr-4 font-normal">Expiry</th>
              <th className="text-left py-1 pr-4 font-normal">Notes</th>
              {canEdit && <th className="w-16" />}
            </tr>
          </thead>
          <tbody>
            {item.lots.map((lot) => (
              <tr key={lot.id} className="border-t">
                <td className="py-1 pr-4 font-mono">{lot.lotNumber}</td>
                <td className="py-1 pr-6 text-right font-mono w-20">{lot.quantity}</td>
                <td className="py-1 pr-4">{fmtDate(lot.manufactureDate)}</td>
                <td className="py-1 pr-4">{expiryCell(lot.expiryDate)}</td>
                <td className="py-1 pr-4 text-muted-foreground">{lot.notes || '—'}</td>
                {canEdit && (
                  <td className="py-1 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(lot)} title="Edit lot">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onRemove(lot)} title="Remove lot">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try { return new Date(d).toISOString().slice(0, 10) } catch { return '—' }
}

function expiryCell(d: string | null | undefined) {
  if (!d) return <span className="text-muted-foreground">—</span>
  const expired = new Date(d).getTime() < Date.now()
  const date = fmtDate(d)
  return expired
    ? <Badge variant="destructive" className="font-mono">{date}</Badge>
    : <span>{date}</span>
}

interface LotEditorState {
  mode: 'add' | 'edit'
  itemName: string
  remaining: number
  lot?: DeliveryOrderLotDto
}

function LotEditorDialog({
  state, onClose, onSubmit, isPending,
}: {
  state: LotEditorState
  onClose: () => void
  onSubmit: (d: FormData) => void
  isPending: boolean
}) {
  const isEdit = state.mode === 'edit'
  // schema uses z.coerce.number(), so the resolver's *input* type differs from its
  // *output* type (quantity: unknown -> number). Give useForm the three generics
  // <Input, Context, Output> so the resolver and submit handler line up.
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit && state.lot
      ? {
          lotNumber: state.lot.lotNumber,
          quantity: state.lot.quantity,
          manufactureDate: state.lot.manufactureDate?.slice(0, 10) ?? '',
          expiryDate: state.lot.expiryDate?.slice(0, 10) ?? '',
          notes: state.lot.notes ?? '',
        }
      : { lotNumber: '', quantity: 1, manufactureDate: '', expiryDate: '', notes: '' },
  })

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lot' : 'Add Lot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {state.itemName} — up to <span className="font-mono">{state.remaining}</span> unit(s) can go on this lot.
          </p>

          <div className="space-y-1">
            <Label htmlFor="lotNumber">Lot Number *</Label>
            <Input id="lotNumber" {...register('lotNumber')} />
            {errors.lotNumber && <p className="text-xs text-red-500">{errors.lotNumber.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={state.remaining}
              {...register('quantity')}
            />
            {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="manufactureDate">Manufacture Date</Label>
              <Input id="manufactureDate" type="date" {...register('manufactureDate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input id="expiryDate" type="date" {...register('expiryDate')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Lot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
