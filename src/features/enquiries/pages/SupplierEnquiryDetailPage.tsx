import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { enquiryApi } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { PageHeader } from '@/components/PageHeader'
import { DetailPageContainer, DetailPageGrid, DetailPageMainColumn, DetailPageSidebar, DetailPageSummary } from '@/components/detail-page'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Open: 'default',
  Closed: 'secondary',
}

export function SupplierEnquiryDetailPage() {
  const { id } = useParams({ from: '/_app/enquiries/$id' })
  const navigate = useNavigate()

  const { data: enquiry, isLoading } = useQuery({
    queryKey: queryKeys.enquiries.detail(id),
    queryFn: () => enquiryApi.get(id),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!enquiry) {
    return <div className="text-muted-foreground">Enquiry not found.</div>
  }

  const threadId = `Enquiry-${id}`

  return (
    <DetailPageContainer>
      <PageHeader
        title={enquiry.documentNumber}
        description={`${enquiry.enquiryType ?? 'Enquiry'} · from ${enquiry.customerName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[enquiry.status]}>{enquiry.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/enquiries' })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <DetailPageGrid>
        <DetailPageMainColumn>
          <DetailPageSummary
            items={[
              { label: 'Status', value: <Badge variant={statusColors[enquiry.status]}>{enquiry.status}</Badge> },
              { label: 'Customer', value: enquiry.customerName },
              { label: 'Type', value: enquiry.enquiryType ?? '—' },
              { label: 'Created', value: format(new Date(enquiry.createdAt), 'dd MMM yyyy') },
            ]}
            columns={4}
          />

          {enquiry.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{enquiry.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentItemsTable
                mode="enquiry"
                items={enquiry.items.map((item) => ({
                  id: item.id,
                  name: item.itemName,
                  supplierName: item.supplierName,
                  quantity: item.quantity,
                  notes: item.notes,
                  variants: item.variants?.map((v) => ({
                    id: v.id,
                    dimensionSummary: v.dimensionSummary,
                    sku: v.sku,
                    quantity: v.quantityRequested,
                  })),
                }))}
                emptyMessage="No items specified."
              />
            </CardContent>
          </Card>

          <AttachmentPanel entityType="Enquiry" entityId={id} />
        </DetailPageMainColumn>

        <DetailPageSidebar>
          <ThreadPanel
            threadId={threadId}
            disabledReason={enquiry.status === 'Draft' ? 'Enquiry must be open to message.' : undefined}
          />
        </DetailPageSidebar>
      </DetailPageGrid>
    </DetailPageContainer>
  )
}
