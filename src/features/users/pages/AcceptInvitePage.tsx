import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/features/users/api/usersApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  fullName: z.string().max(255).optional().or(z.literal('')),
  password: z.string().min(8, 'At least 8 characters').max(200),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const { token } = useSearch({ strict: false }) as { token?: string }
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const accept = useMutation({
    mutationFn: (data: FormData) =>
      authApi.acceptInvite({
        token: token ?? '',
        password: data.password,
        fullName: data.fullName || undefined,
      }),
    onSuccess: () => {
      setDone(true)
      toast.success('Account activated. You can now sign in.')
      setTimeout(() => navigate({ to: '/login' }), 1500)
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : 'Could not accept invitation.'
      toast.error(message)
    },
  })

  if (!token) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Invalid invitation link</h2>
        <p className="text-sm text-slate-500">The token is missing from the URL.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">All set</h2>
        <p className="text-sm text-slate-500">Redirecting to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit((d) => accept.mutate(d))} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Set your password</h2>
        <p className="text-sm text-slate-500">Finish setting up your account to sign in.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="fullName">Full name (optional)</Label>
        <Input id="fullName" {...register('fullName')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={accept.isPending}>
        {accept.isPending ? 'Activating…' : 'Activate account'}
      </Button>
    </form>
  )
}
