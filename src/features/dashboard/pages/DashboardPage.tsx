import { useAuthStore } from '@/stores/authStore'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        Welcome, {user?.fullName}
      </h1>
      <p className="text-slate-500">Role: {user?.role}</p>
    </div>
  )
}
