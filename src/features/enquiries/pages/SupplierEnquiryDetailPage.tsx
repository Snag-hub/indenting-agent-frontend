import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { enquiryApi } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { ArrowLeft, MessageSquare, Paperclip } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'

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
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!enquiry) {
    return <div className="text-muted-foreground">Enquiry not found.</div>
  }

  const threadId = `Enquiry-${id}`

  return (
    <div className="space-y-4">
      {/* Sticky Summary Header */}
      <div className="sticky top-0 z-10 bg-background border-b rounded-t-lg shadow-sm">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{enquiry.documentNumber}</h1>
              <p className="text-sm text-muted-foreground">
                Created {formatDistanceToNow(new Date(enquiry.createdAt), { addSuffix: true })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/enquiries' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="default">Open</Badge>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-40 z-10 bg-background border-b">
          <TabsList className="grid w-full grid-cols-4 h-auto p-0">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground py-4">
              Overview
            </TabsTrigger>
            <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground py-4">
              Items
            </TabsTrigger>
            <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground py-4 flex items-center justify-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground py-4 flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="text-sm">{enquiry.customerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                  <p className="text-sm">{format(new Date(enquiry.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>

              {enquiry.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{enquiry.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DocumentItemsTable
                mode="enquiry"
                items={enquiry.items.map((item) => ({
                  id: item.id,
                  name: item.itemName,
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
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <AttachmentPanel entityType="Enquiry" entityId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <ThreadPanel threadId={threadId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
