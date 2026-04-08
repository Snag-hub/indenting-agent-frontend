/**
 * In development: CreateEnquiryPage will be implemented with multi-step supplier-first flow.
 * For now, users can create enquiries via the inline dialog in EnquiriesPage.
 */
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function CreateEnquiryPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/enquiries' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Enquiry</h1>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Coming Soon:</strong> Multi-step enquiry creation with supplier-first flow.
          For now, please use the "New Enquiry" button on the Enquiries page to create enquiries via the dialog.
        </p>
      </div>

      <Button onClick={() => navigate({ to: '/enquiries' })}>
        Back to Enquiries
      </Button>
    </div>
  )
}
