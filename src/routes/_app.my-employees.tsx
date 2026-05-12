import { createFileRoute, redirect } from '@tanstack/react-router'
import { EmployeesPage } from '@/features/users/pages/EmployeesPage'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_app/my-employees')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (!user) throw redirect({ to: '/login' })
    if (user.role === 'Admin') throw redirect({ to: '/admin/users' as never })
    if (!user.isOrgAdmin) throw redirect({ to: '/dashboard' })
  },
  component: () => <EmployeesPage mode="org" />,
})
