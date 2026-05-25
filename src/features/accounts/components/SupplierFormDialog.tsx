import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supplierApi, type SupplierDto } from '../api/supplierApi'
import { queryKeys } from '@/lib/queryKeys'
import { useCurrencies } from '@/hooks/useSettings'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  preferredCurrency: z.string().min(1, 'Currency is required'),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing?: SupplierDto
}

export function SupplierFormDialog({ open, onOpenChange, existing }: Props) {
  const qc = useQueryClient()
  const isEdit = !!existing
  const { currencies } = useCurrencies()

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', contactEmail: '', contactPhone: '', preferredCurrency: 'USD' },
  })

  // Re-populate fields whenever the dialog opens or the target row changes
  useEffect(() => {
    if (open) {
      reset(existing
        ? {
          name: existing.name,
          contactEmail: existing.contactEmail ?? '',
          contactPhone: existing.contactPhone ?? '',
          preferredCurrency: existing.preferredCurrency ?? 'USD',
        }
        : { name: '', contactEmail: '', contactPhone: '', preferredCurrency: 'USD' })
    }
  }, [open, existing, reset])

  const create = useMutation({
    mutationFn: (data: FormData) => supplierApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.list() })
      onOpenChange(false)
      reset()
    },
  })

  const update = useMutation({
    mutationFn: (data: FormData) => supplierApi.update(existing!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.list() })
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.detail(existing!.id) })
      onOpenChange(false)
    },
  })

  const onSubmit = (data: FormData) => {
    if (isEdit) update.mutate(data)
    else create.mutate(data)
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" {...register('contactEmail')} />
            {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" {...register('contactPhone')} />
          </div>
          <div className="space-y-1">
            <Label>Preferred Currency</Label>
            <Controller
              control={control}
              name="preferredCurrency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.preferredCurrency && <p className="text-xs text-red-500">{errors.preferredCurrency.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
