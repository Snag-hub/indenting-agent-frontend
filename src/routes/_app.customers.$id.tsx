import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { customerApi } from '@/features/accounts/api/customerApi'
import { queryKeys } from '@/lib/queryKeys'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/_app/customers/$id')({
  component: CustomerDetailPage,
})

function CustomerDetailPage() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const [unmapping, setUnmapping] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customerApi.get(id),
  })

  const unmap = useMutation({
    mutationFn: (mappingId: string) => customerApi.unmapSupplierItem(mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.detail(id) })
      setUnmapping(undefined)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!data) return <p className="text-slate-500">Customer not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/customers"><ChevronLeft className="h-4 w-4" /> Customers</Link>
        </Button>
      </div>

      <PageHeader title={data.name} description={data.contactEmail ?? undefined} />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="items">Mapped Items ({data.mappedSupplierItems?.length ?? 0})</TabsTrigger>
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

        {/* Mapped Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader><CardTitle>Mapped Supplier Items</CardTitle></CardHeader>
            <CardContent>
              {data.mappedSupplierItems?.length === 0 ? (
                <p className="text-sm text-slate-400">No supplier items mapped yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.mappedSupplierItems?.map((m) => (
                      <TableRow key={m.mappingId}>
                        <TableCell>{m.supplierItemName}</TableCell>
                        <TableCell>{m.supplierName}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setUnmapping(m.mappingId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card>
            <CardContent className="pt-6">
              <AttachmentPanel entityType="Customer" entityId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!unmapping}
        onOpenChange={(o) => { if (!o) setUnmapping(undefined) }}
        title="Remove Mapping"
        description="Remove this supplier item from the customer? The item itself is not deleted."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => unmapping && unmap.mutate(unmapping)}
        isLoading={unmap.isPending}
      />
    </div>
  )
}
