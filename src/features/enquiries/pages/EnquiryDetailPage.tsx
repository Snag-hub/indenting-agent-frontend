import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { enquiryApi } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DocumentItemsTable } from '@/components/DocumentItemsTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Send, Lock, FileText, MessageSquare, Paperclip } from 'lucide-react'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { formatDistanceToNow } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Open: 'default',
  Closed: 'secondary',
}

export function EnquiryDetailPage() {
  const { id } = useParams({ from: '/_app/enquiries/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)

  const { data: enquiry, isLoading } = useQuery({
    queryKey: queryKeys.enquiries.detail(id),
    queryFn: () => enquiryApi.get(id),
  })

  const submitEnquiry = useMutation({
    mutationFn: () => enquiryApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setSubmitting(false)
    },
  })

  const closeEnquiry = useMutation({
    mutationFn: () => enquiryApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setClosing(false)
    },
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

          <div className="flex items-center justify-between">
            <Badge variant={statusColors[enquiry.status]} className="text-base px-3 py-1">
              {enquiry.status}
            </Badge>
            <div className="flex items-center gap-2">
              {enquiry.status === 'Draft' && (
                <Button
                  size="sm"
                  onClick={() => setSubmitting(true)}
                >
                  <Send className="mr-2 h-4 w-4" /> Submit
                </Button>
              )}

              {enquiry.status === 'Open' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: '/rfqs/new', search: { enquiryId: id } })}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Create RFQ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setClosing(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Close
                  </Button>
                </>
              )}
            </div>
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
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm">{enquiry.enquiryType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <p className="text-sm">{enquiry.priority}</p>
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
              {enquiry.items && enquiry.items.length > 0 ? (
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
                  emptyMessage="No line items specified."
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No line items specified.
                </div>
              )}
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

      <ConfirmDialog
        open={submitting}
        onOpenChange={(open) => {
          if (!open) setSubmitting(false)
        }}
        title="Submit Enquiry"
        description="This will change the status to Open and notify relevant parties."
        confirmLabel="Submit"
        onConfirm={() => submitEnquiry.mutate()}
        isLoading={submitEnquiry.isPending}
      />

      <ConfirmDialog
        open={closing}
        onOpenChange={(open) => {
          if (!open) setClosing(false)
        }}
        title="Close Enquiry"
        description="This will mark the enquiry as Closed."
        confirmLabel="Close"
        onConfirm={() => closeEnquiry.mutate()}
        isLoading={closeEnquiry.isPending}
      />
    </div>
  )
}
