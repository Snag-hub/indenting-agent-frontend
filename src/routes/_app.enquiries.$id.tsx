import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

const EnquiryDetailPage = lazy(() =>
  import('@/features/enquiries/pages/EnquiryDetailPage').then((m) => ({ default: m.EnquiryDetailPage }))
)
const SupplierEnquiryDetailPage = lazy(() =>
  import('@/features/enquiries/pages/SupplierEnquiryDetailPage').then((m) => ({ default: m.SupplierEnquiryDetailPage }))
)

function EnquiryDetailRoute() {
  const role = useAuthStore((s) => s.user?.role)
  return (
    <Suspense>
      {role === 'Supplier' ? <SupplierEnquiryDetailPage /> : <EnquiryDetailPage />}
    </Suspense>
  )
}

export const Route = createFileRoute('/_app/enquiries/$id')({
  component: EnquiryDetailRoute,
})
