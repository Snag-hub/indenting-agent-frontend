import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { enquiryApi } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!enquiry) {
    return <div className="text-muted-foreground">Enquiry not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={enquiry.title}
        description="Customer Enquiry"
        action={
          <div className="flex items-center gap-2">
            <Badge variant="default">Open</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/enquiries' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      {/* Customer & Date Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Customer</p>
              <p className="font-medium">{enquiry.customerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Submitted</p>
              <p className="font-medium">
                {format(new Date(enquiry.createdAt), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {enquiry.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{enquiry.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Line Items — clean, no supplier metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requested Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiry.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-6">
                      No items specified.
                    </TableCell>
                  </TableRow>
                ) : (
                  enquiry.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.itemName}</TableCell>
                      <TableCell className="text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-sm">
                        {item.notes
                          ? item.notes
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
