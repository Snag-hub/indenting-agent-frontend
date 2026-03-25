import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

export const Route = createRootRoute({
  component: Outlet,
})
