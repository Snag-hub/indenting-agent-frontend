import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { queryKeys } from '@/lib/queryKeys'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { PriceTierEditor } from '@/components/PriceTierEditor'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft } from 'lucide-react'

export const Route = createFileRoute('/_app/my-items/$id')({
  component: MyItemDetailPage,
})

function MyItemDetailPage() {
  const { id } = Route.useParams()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.supplierItems.detail(id),
    queryFn: () => supplierItemApi.get(id),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!data) return <p className="text-slate-500">Item not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/my-items"><ChevronLeft className="h-4 w-4" /> My Items</Link>
        </Button>
      </div>

      <PageHeader title={data.name} description={data.description ?? undefined} />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="variants">Variants ({data.variants?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="base-pricing">Base Pricing</TabsTrigger>
          <TabsTrigger value="customer-pricing">Customer Pricing</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader><CardTitle>Item Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-slate-500">Min Order Qty</p>
                <p>{data.minOrderQty}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Batch Size</p>
                <p>{data.batchSize}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Lead Time</p>
                <p>{data.leadTimeDays} days</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Master Item</p>
                <p>{data.masterItemName ?? <span className="text-slate-400">Not linked</span>}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants">
          <Card>
            <CardHeader><CardTitle>Item Variants</CardTitle></CardHeader>
            <CardContent>
              {data.variants?.length === 0 ? (
                <p className="text-sm text-slate-400">No variants defined yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Attributes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.variants?.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm">{v.sku}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {v.values.map((val, i) => (
                              <Badge key={i} variant="secondary">
                                {val.dimensionName}: {val.valueName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Base Pricing Tab */}
        <TabsContent value="base-pricing">
          <Card>
            <CardHeader><CardTitle>Base Price Tiers</CardTitle></CardHeader>
            <CardContent>
              <PriceTierEditor supplierItemId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Pricing Tab */}
        <TabsContent value="customer-pricing">
          <Card>
            <CardHeader><CardTitle>Customer-Specific Pricing</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">Customer price tiers coming in next iteration.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card>
            <CardContent className="pt-6">
              <AttachmentPanel entityType="SupplierItem" entityId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
