import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { queryKeys } from '@/lib/queryKeys'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { ChevronLeft, Package } from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_app/suppliers/$id')({
  component: SupplierDetailPage,
})

function SupplierDetailPage() {
  const { id } = Route.useParams()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => supplierApi.get(id),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!data) return <p className="text-slate-500">Supplier not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/suppliers"><ChevronLeft className="h-4 w-4" /> Suppliers</Link>
        </Button>
      </div>

      <PageHeader title={data.name} description={data.contactEmail ?? undefined} />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="catalog">
            Item Catalog ({data.itemCount ?? 0})
          </TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-slate-500">Name</p>
                <p>{data.name}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Email</p>
                <p>{data.contactEmail ?? '—'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Phone</p>
                <p>{data.contactPhone ?? '—'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Created</p>
                <p>{format(new Date(data.createdAt), 'dd MMM yyyy')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Catalog Tab */}
        <TabsContent value="catalog">
          <Card>
            <CardHeader><CardTitle>Item Catalog</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <Package className="h-8 w-8" />
                <p className="text-sm">
                  {data.itemCount > 0
                    ? `${data.itemCount} items — view in Supplier Items`
                    : 'No items in catalog yet.'}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/supplier-items/browse" search={{ supplierId: id }}>
                    Browse Items
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card>
            <CardContent className="pt-6">
              <AttachmentPanel entityType="Supplier" entityId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
