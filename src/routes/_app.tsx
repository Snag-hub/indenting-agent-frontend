import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/layouts/AppShell'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const token = useAuthStore.getState().accessToken
    if (!token) throw redirect({ to: '/login' })
  },
  component: AppShell,
})
