import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { itemApi } from '@/features/catalog/api/itemApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/_app/catalog/items/$id')({
  component: ItemDetailPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface DimensionValue { id: string; value: string }
interface Dimension { id: string; name: string; values: DimensionValue[] }

interface VariantValueRow {
  dimensionId: string
  dimensionValueId: string
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const variantSchema = z.object({
  sku: z.string().max(100).optional(),
})
type VariantForm = z.infer<typeof variantSchema>

// ─── Component ───────────────────────────────────────────────────────────────

function ItemDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [variantOpen, setVariantOpen] = useState(false)
  const [deletingVariantId, setDeletingVariantId] = useState<string | undefined>()
  // Rows of dimension selectors for new variant form
  const [variantRows, setVariantRows] = useState<VariantValueRow[]>([
    { dimensionId: '', dimensionValueId: '' },
  ])

  // ── Queries ────────────────────────────────────────────────────
  const { data: item, isLoading } = useQuery({
    queryKey: queryKeys.catalog.item(id),
    queryFn: () => itemApi.getById(id),
  })

  const { data: dimensions = [] } = useQuery<Dimension[]>({
    queryKey: queryKeys.dimensions.my(),
    queryFn: () => api.get('/my/dimensions').then((r) => r.data),
  })

  // ── Form ───────────────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VariantForm>({
    resolver: zodResolver(variantSchema),
  })

  // ── Mutations ──────────────────────────────────────────────────
  const addVariant = useMutation({
    mutationFn: (data: VariantForm) =>
      itemApi.addVariant(id, {
        sku: data.sku || null,
        values: variantRows.filter((r) => r.dimensionId && r.dimensionValueId),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.catalog.item(id) })
      setVariantOpen(false)
      reset()
      setVariantRows([{ dimensionId: '', dimensionValueId: '' }])
    },
  })

  const removeVariant = useMutation({
    mutationFn: (variantId: string) => itemApi.removeVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.catalog.item(id) })
      setDeletingVariantId(undefined)
    },
  })

  // ── Variant row helpers ────────────────────────────────────────
  const updateRow = (index: number, field: keyof VariantValueRow, value: string) => {
    setVariantRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // Reset value when dimension changes
      if (field === 'dimensionId') next[index].dimensionValueId = ''
      return next
    })
  }

  const addRow = () => setVariantRows((prev) => [...prev, { dimensionId: '', dimensionValueId: '' }])
  const removeRow = (index: number) => setVariantRows((prev) => prev.filter((_, i) => i !== index))

  const openVariantDialog = () => {
    reset()
    setVariantRows([{ dimensionId: '', dimensionValueId: '' }])
    setVariantOpen(true)
  }

  // ── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!item) return <div className="text-muted-foreground">Item not found.</div>

  const usedDimensionIds = (rowIndex: number) =>
    variantRows
      .filter((_, i) => i !== rowIndex)
      .map((r) => r.dimensionId)
      .filter(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.name}
        description={item.categoryName ? `Category: ${item.categoryName}` : 'No category assigned'}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/catalog/items' })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Items
          </Button>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="variants">
            Variants
            {item.variants.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {item.variants.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Details Tab ───────────────────────────────────────── */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-muted-foreground font-medium">Name</p>
                  <p>{item.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Status</p>
                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Category</p>
                  <p>{item.categoryName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Created</p>
                  <p>{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                {item.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground font-medium">Description</p>
                    <p className="whitespace-pre-wrap">{item.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Variants Tab ──────────────────────────────────────── */}
        <TabsContent value="variants" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {dimensions.length === 0
                ? 'No dimensions defined yet. Create dimensions in My Dimensions first.'
                : 'Define variants using your tenant dimensions.'}
            </p>
            <Button
              size="sm"
              onClick={openVariantDialog}
              disabled={dimensions.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Variant
            </Button>
          </div>

          {item.variants.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No variants yet. Click "Add Variant" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {item.variants.map((variant) => (
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
      </Tabs>

      {/* ── Add Variant Dialog ──────────────────────────────────── */}
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
                    {/* Dimension selector */}
                    <Select
                      value={row.dimensionId}
                      onValueChange={(v) => updateRow(i, 'dimensionId', v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select dimension" />
                      </SelectTrigger>
                      <SelectContent>
                        {dimensions.map((d) => (
                          <SelectItem
                            key={d.id}
                            value={d.id}
                            disabled={blocked.includes(d.id)}
                          >
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Value selector */}
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
                          <SelectItem key={v.id} value={v.id}>
                            {v.value}
                          </SelectItem>
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

      {/* ── Delete Variant Confirm ──────────────────────────────── */}
      <ConfirmDialog
        open={!!deletingVariantId}
        title="Remove Variant"
        description="This will permanently remove this variant from the item."
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={() => deletingVariantId && removeVariant.mutate(deletingVariantId)}
        onCancel={() => setDeletingVariantId(undefined)}
        loading={removeVariant.isPending}
      />
    </div>
  )
}
