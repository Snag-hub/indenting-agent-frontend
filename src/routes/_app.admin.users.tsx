import { createFileRoute, redirect } from '@tanstack/react-router'
import { EmployeesPage } from '@/features/users/pages/EmployeesPage'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_app/admin/users')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role !== 'Admin') throw redirect({ to: '/dashboard' })
  },
  component: () => <EmployeesPage mode="admin" />,
})
