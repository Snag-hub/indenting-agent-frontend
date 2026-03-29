import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi, type CustomerDto } from '../api/customerApi'
import { queryKeys } from '@/lib/queryKeys'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing?: CustomerDto
}

export function CustomerFormDialog({ open, onOpenChange, existing }: Props) {
  const qc = useQueryClient()
  const isEdit = !!existing

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', contactEmail: '', contactPhone: '' },
  })

  // Re-populate fields whenever the dialog opens or the target row changes
  useEffect(() => {
    if (open) {
      reset(existing ?? { name: '', contactEmail: '', contactPhone: '' })
    }
  }, [open, existing, reset])

  const create = useMutation({
    mutationFn: (data: FormData) => customerApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.list() })
      onOpenChange(false)
      reset()
    },
  })

  const update = useMutation({
    mutationFn: (data: FormData) => customerApi.update(existing!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.list() })
      qc.invalidateQueries({ queryKey: queryKeys.customers.detail(existing!.id) })
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
          <DialogTitle>{isEdit ? 'Edit Customer' : 'New Customer'}</DialogTitle>
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
