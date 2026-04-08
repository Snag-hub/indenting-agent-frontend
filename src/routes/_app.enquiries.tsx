import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

const EnquiriesPage = lazy(() =>
  import('@/features/enquiries/pages/EnquiriesPage').then((m) => ({ default: m.EnquiriesPage }))
)
const SupplierEnquiriesPage = lazy(() =>
  import('@/features/enquiries/pages/SupplierEnquiriesPage').then((m) => ({ default: m.SupplierEnquiriesPage }))
)

function EnquiriesRoute() {
  const role = useAuthStore((s) => s.user?.role)
  return (
    <Suspense>
      {role === 'Supplier' ? <SupplierEnquiriesPage /> : <EnquiriesPage />}
    </Suspense>
  )
}

export const Route = createFileRoute('/_app/enquiries')({
  component: EnquiriesRoute,
})
