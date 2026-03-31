import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { supplierItemApi } from '@/features/supplierCatalog/api/supplierItemApi'
import { queryKeys } from '@/lib/queryKeys'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { PriceTierEditor } from '@/components/PriceTierEditor'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'

interface DimensionValue { id: string; value: string }
interface Dimension { id: string; name: string; values: DimensionValue[] }

interface VariantValueRow {
  dimensionId: string
  dimensionValueId: string
}

const variantSchema = z.object({
  sku: z.string().max(100).optional(),
})
type VariantForm = z.infer<typeof variantSchema>

export function MyItemDetailPage() {
  const { id } = useParams({ from: '/_app/my-items/$id' })
  const qc = useQueryClient()

  const [variantOpen, setVariantOpen] = useState(false)
  const [deletingVariantId, setDeletingVariantId] = useState<string | undefined>()
  const [variantRows, setVariantRows] = useState<VariantValueRow[]>([
    { dimensionId: '', dimensionValueId: '' },
  ])

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.supplierItems.detail(id),
    queryFn: () => supplierItemApi.get(id),
  })

  const { data: dimensions = [] } = useQuery<Dimension[]>({
    queryKey: queryKeys.dimensions.my(),
    queryFn: () => api.get('/my/dimensions').then((r) => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VariantForm>({
    resolver: zodResolver(variantSchema),
  })

  const addVariant = useMutation({
    mutationFn: (d: VariantForm) =>
      supplierItemApi.addVariant(id, {
        sku: d.sku || null,
        values: variantRows.filter((r) => r.dimensionId && r.dimensionValueId),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supplierItems.detail(id) })
      setVariantOpen(false)
      reset()
      setVariantRows([{ dimensionId: '', dimensionValueId: '' }])
    },
  })

  const removeVariant = useMutation({
    mutationFn: (variantId: string) => supplierItemApi.removeVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supplierItems.detail(id) })
      setDeletingVariantId(undefined)
    },
  })

  const updateRow = (index: number, field: keyof VariantValueRow, value: string) => {
    setVariantRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'dimensionId') next[index].dimensionValueId = ''
      return next
    })
  }

  const addRow = () => setVariantRows((prev) => [...prev, { dimensionId: '', dimensionValueId: '' }])
  const removeRow = (index: number) => setVariantRows((prev) => prev.filter((_, i) => i !== index))

  const usedDimensionIds = (rowIndex: number) =>
    variantRows
      .filter((_, i) => i !== rowIndex)
      .map((r) => r.dimensionId)
      .filter(Boolean)

  function openVariantDialog() {
    reset()
    setVariantRows([{ dimensionId: '', dimensionValueId: '' }])
    setVariantOpen(true)
  }

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
          <TabsTrigger value="variants">
            Variants
            {(data.variants?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-2">{data.variants.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="base-pricing">Base Pricing</TabsTrigger>
          <TabsTrigger value="customer-pricing">Customer Pricing</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
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
                <p className="font-medium text-slate-500">Category</p>
                <p>{data.categoryName ?? <span className="text-slate-400">Not assigned</span>}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Master Item</p>
                <p>{data.masterItemName ?? <span className="text-slate-400">Not linked</span>}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500">Supplier</p>
                <p>{data.supplierName}</p>
              </div>
              {data.description && (
                <div className="col-span-2">
                  <p className="font-medium text-slate-500">Description</p>
                  <p className="whitespace-pre-wrap">{data.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {dimensions.length === 0
                ? 'No dimensions defined yet. Create dimensions in My Dimensions first.'
                : 'Define variants using your tenant dimensions.'}
            </p>
            <Button size="sm" onClick={openVariantDialog} disabled={dimensions.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Add Variant
            </Button>
          </div>

          {(data.variants?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No variants yet. Click "Add Variant" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(data.variants ?? []).map((variant) => (
                <Card key={variant.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-1">
                      {variant.sku && (
                        <p className="text-xs text-muted-foreground font-medium">
                          SKU: <span className="font-mono">{variant.sku}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {variant.values.map((v) => (
                          <Badge key={v.dimensionId} variant="outline">
                            <span className="text-muted-foreground mr-1">{v.dimensionName}:</span>
                            {v.value}
                          </Badge>
                        ))}
                        {variant.values.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No dimension values</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingVariantId(variant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="base-pricing">
          <Card>
            <CardHeader><CardTitle>Base Price Tiers</CardTitle></CardHeader>
            <CardContent>
              <PriceTierEditor supplierItemId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer-pricing">
          <Card>
            <CardHeader><CardTitle>Customer-Specific Pricing</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">Customer price tiers coming in next iteration.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments">
          <Card>
            <CardContent className="pt-6">
              <AttachmentPanel entityType="SupplierItem" entityId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={variantOpen} onOpenChange={setVariantOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Variant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => addVariant.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sku">SKU (optional)</Label>
              <Input id="sku" placeholder="e.g. ITEM-RED-L" {...register('sku')} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Dimension Values</Label>
              {variantRows.map((row, i) => {
                const dim = dimensions.find((d) => d.id === row.dimensionId)
                const blocked = usedDimensionIds(i)
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <Select
                      value={row.dimensionId}
                      onValueChange={(v) => updateRow(i, 'dimensionId', v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select dimension" />
                      </SelectTrigger>
                      <SelectContent>
                        {dimensions.map((d) => (
                          <SelectItem key={d.id} value={d.id} disabled={blocked.includes(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={row.dimensionValueId}
                      onValueChange={(v) => updateRow(i, 'dimensionValueId', v)}
                      disabled={!dim}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {dim?.values.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(i)}
                      disabled={variantRows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}

              {variantRows.length < dimensions.length && (
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="mr-2 h-4 w-4" /> Add Dimension
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVariantOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  addVariant.isPending ||
                  variantRows.every((r) => !r.dimensionId || !r.dimensionValueId)
                }
              >
                {addVariant.isPending ? 'Saving…' : 'Add Variant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingVariantId}
        onOpenChange={(o) => { if (!o) setDeletingVariantId(undefined) }}
        title="Remove Variant"
        description="This will permanently remove this variant from the item."
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={() => deletingVariantId && removeVariant.mutate(deletingVariantId)}
        isLoading={removeVariant.isPending}
      />
    </div>
  )
}
