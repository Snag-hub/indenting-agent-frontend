import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { AuthLayout } from '@/layouts/AuthLayout'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const token = useAuthStore.getState().accessToken
    if (token) throw redirect({ to: '/dashboard' })
  },
  component: AuthLayout,
})
