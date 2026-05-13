import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  usersApi, myEmployeesApi,
  type CreateEmployeePayload, type EmployeeDetailDto, type UpdateEmployeePayload,
} from '@/features/users/api/usersApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const schema = z.object({
  email: z.string().email('Invalid email').max(255),
  fullName: z.string().min(1, 'Full name is required').max(255),
  role: z.string().min(1, 'Role is required'),
  isOrgAdmin: z.boolean(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'admin' | 'org'
  /** Pre-existing employee to edit. When set, the dialog only updates fullName + isOrgAdmin. */
  existing?: EmployeeDetailDto
  /** For admin mode: org pre-selection (creating an employee for a specific customer/supplier). */
  targetOrganisationType?: 'Admin' | 'Customer' | 'Supplier'
  targetCustomerId?: string | null
  targetSupplierId?: string | null
}

export function InviteEmployeeDialog({
  open, onOpenChange, mode, existing,
  targetOrganisationType, targetCustomerId, targetSupplierId,
}: Props) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isEdit = !!existing

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', fullName: '', role: '', isOrgAdmin: false },
  })

  useEffect(() => {
    if (open) {
      if (existing) {
        reset({
          email: existing.email,
          fullName: existing.fullName,
          role: existing.role,
          isOrgAdmin: existing.isOrgAdmin,
        })
      } else {
        reset({
          email: '',
          fullName: '',
          // For org-admin mode, pre-fill role from caller's own role; admin picks per-row.
          role: mode === 'org' ? (user?.role ?? '') : '',
          isOrgAdmin: false,
        })
      }
    }
  }, [open, existing, reset, mode, user?.role])

  const isOrgAdminWatch = watch('isOrgAdmin')

  const queryKey = mode === 'admin' ? queryKeys.users.list() : queryKeys.myEmployees.list()
  const detailKey = (id: string) =>
    mode === 'admin' ? queryKeys.users.detail(id) : queryKeys.myEmployees.detail(id)

  const client = mode === 'admin' ? usersApi : myEmployeesApi

  const create = useMutation({
    mutationFn: (data: FormData) => {
      const orgType = mode === 'admin'
        ? (targetOrganisationType ?? 'Admin')
        : (user!.organisationType)
      const customerId = mode === 'admin' ? targetCustomerId ?? null : user!.customerId
      const supplierId = mode === 'admin' ? targetSupplierId ?? null : user!.supplierId
      const payload: CreateEmployeePayload = {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        organisationType: orgType,
        customerId,
        supplierId,
        isOrgAdmin: data.isOrgAdmin,
      }
      return client.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      toast.success('Invitation sent.')
      onOpenChange(false)
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : 'Could not create employee.'
      toast.error(message)
    },
  })

  const update = useMutation({
    mutationFn: (data: FormData) => {
      const payload: UpdateEmployeePayload = { fullName: data.fullName, isOrgAdmin: data.isOrgAdmin }
      return client.update(existing!.id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: detailKey(existing!.id) })
      toast.success('Employee updated.')
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
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Invite Employee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" disabled={isEdit} {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role *</Label>
            <Input id="role" disabled={isEdit} placeholder="Admin / Customer / Supplier" {...register('role')} />
            {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isOrgAdmin"
              checked={!!isOrgAdminWatch}
              onCheckedChange={(v) => setValue('isOrgAdmin', !!v)}
            />
            <Label htmlFor="isOrgAdmin" className="cursor-pointer">
              Organisation admin (can manage other employees)
            </Label>
          </div>
          {!isEdit && (
            <p className="text-xs text-slate-500">
              An email invitation will be sent to this address. The invitee sets their own password.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
