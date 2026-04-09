import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const CreateEnquiryPage = lazy(() =>
  import('@/features/enquiries/pages/CreateEnquiryPage').then((m) => ({
    default: m.CreateEnquiryPage,
  }))
)

function CreateEnquiryRoute() {
  return (
    <Suspense>
      <CreateEnquiryPage />
    </Suspense>
  )
}

export const Route = createFileRoute('/_app/enquiries/new')({
  component: CreateEnquiryRoute,
})
