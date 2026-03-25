import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const token = useAuthStore.getState().accessToken
    throw redirect({ to: token ? '/dashboard' : '/login' })
  },
  component: () => null,
})
