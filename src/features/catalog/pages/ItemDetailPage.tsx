import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { itemApi } from '@/features/catalog/api/itemApi'
import { pricingApi } from '@/features/pricing/api/pricingApi'
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface DimensionValue { id: string; value: string }
interface Dimension { id: string; name: string; values: DimensionValue[] }
interface VariantValueRow { dimensionId: string; dimensionValueId: string }

interface SupplierItem {
  id: string
  supplierId: string
  supplierName: string
  name: string
}

interface PriceTier {
  id: string
  minQty: number
  maxQty: number | null
  unitPrice: number
  currency: string
  effectiveFrom: string
  effectiveTo: string | null
}

interface CustomerTier {
  id: string
  customerId: string
  customerName: string
  minQty: number
  unitPrice: number
  currency: string
}

interface EditableCustomerTier extends CustomerTier {
  supplierItemId: string
}

const customerOverrideSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  minQty: z.number().min(0, 'Minimum quantity must be 0 or greater'),
  unitPrice: z.number().min(0, 'Unit price must be greater than 0'),
})
type CustomerOverrideForm = z.infer<typeof customerOverrideSchema>

const variantSchema = z.object({ sku: z.string().max(100).optional() })
type VariantForm = z.infer<typeof variantSchema>

export function ItemDetailPage() {
  const { id } = useItemDetailParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [variantOpen, setVariantOpen] = useState(false)
  const [deletingVariantId, setDeletingVariantId] = useState<string | undefined>()
  const [variantRows, setVariantRows] = useState<VariantValueRow[]>([{ dimensionId: '', dimensionValueId: '' }])

  // Pricing state
  const [selectedSupplierItemId, setSelectedSupplierItemId] = useState<string | undefined>()
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false)
  const [editingCustomerTier, setEditingCustomerTier] = useState<EditableCustomerTier | undefined>()

  const {
    register: registerPrice,
    handleSubmit: handlePriceSubmit,
    reset: resetPrice,
    setValue: setPriceValue,
    control: priceControl,
    formState: { errors: priceErrors },
  } = useForm<CustomerOverrideForm>({
    resolver: zodResolver(customerOverrideSchema),
    defaultValues: {
      customerId: '',
      minQty: 0,
      unitPrice: 0,
    },
  })

  const selectedCustomerId = useWatch({
    control: priceControl,
    name: 'customerId',
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VariantForm>({
    resolver: zodResolver(variantSchema),
  })

  const { data: item, isLoading } = useQuery({
    queryKey: queryKeys.catalog.item(id),
    queryFn: () => itemApi.getById(id),
  })

  const { data: dimensions = [] } = useQuery<Dimension[]>({
    queryKey: queryKeys.dimensions.my(),
    queryFn: () => api.get('/my/dimensions').then((r) => r.data),
  })

  // Fetch supplier items linked to this catalog item (admin-accessible browse endpoint)
  const { data: linkedSupplierItems = [] } = useQuery<SupplierItem[]>({
    queryKey: queryKeys.supplierItems.browse({ masterItemId: id }),
    queryFn: () =>
      api.get<{ data: SupplierItem[] }>('/supplier-items/browse', { params: { masterItemId: id, pageSize: 1000 } })
        .then((r) => r.data.data || []),
  })

  // Fetch customers for override selection
  const { data: customers = [] } = useQuery({
    queryKey: queryKeys.customers.list(),
    queryFn: () =>
      api.get<{ data: Array<{ id: string; name: string }> }>('/accounts/customers', { params: { pageSize: 1000 } })
        .then((r) => r.data.data || []),
  })

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

  // Pricing mutations
  const addCustomerTier = useMutation({
    mutationFn: (data: { supplierItemId: string; customerId: string; minQty: number; unitPrice: number }) =>
      pricingApi.addCustomerTier(data.supplierItemId, {
        customerId: data.customerId,
        minQty: data.minQty,
        unitPrice: data.unitPrice,
        currency: 'USD',
      }),
    onSuccess: () => {
      if (selectedSupplierItemId) {
        qc.invalidateQueries({ queryKey: queryKeys.pricing.customerTiers(selectedSupplierItemId) })
      }
      setPricingDialogOpen(false)
      resetPrice()
      setSelectedSupplierItemId(undefined)
    },
  })

  const updateCustomerTier = useMutation({
    mutationFn: (data: { tierId: string; minQty: number; unitPrice: number; currency: string }) =>
      pricingApi.updateCustomerTier(data.tierId, {
        minQty: data.minQty,
        unitPrice: data.unitPrice,
        currency: data.currency,
      }),
    onSuccess: () => {
      if (selectedSupplierItemId) {
        qc.invalidateQueries({ queryKey: queryKeys.pricing.customerTiers(selectedSupplierItemId) })
      }
      closePricingDialog()
    },
  })

  const closePricingDialog = () => {
    setPricingDialogOpen(false)
    setSelectedSupplierItemId(undefined)
    setEditingCustomerTier(undefined)
    resetPrice({
      customerId: '',
      minQty: 0,
      unitPrice: 0,
    })
  }

  const openAddOverrideDialog = (supplierItemId: string) => {
    setSelectedSupplierItemId(supplierItemId)
    setEditingCustomerTier(undefined)
    resetPrice({
      customerId: '',
      minQty: 0,
      unitPrice: 0,
    })
    setPricingDialogOpen(true)
  }

  const openEditOverrideDialog = (tier: EditableCustomerTier) => {
    setSelectedSupplierItemId(tier.supplierItemId)
    setEditingCustomerTier(tier)
    resetPrice({
      customerId: tier.customerId,
      minQty: tier.minQty,
      unitPrice: tier.unitPrice,
    })
    setPricingDialogOpen(true)
  }

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
  const openVariantDialog = () => {
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

  if (!item) return <div className="text-muted-foreground">Item not found.</div>

  const usedDimensionIds = (rowIndex: number) =>
    variantRows.filter((_, i) => i !== rowIndex).map((r) => r.dimensionId).filter(Boolean)

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
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Item Information</CardTitle></CardHeader>
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

        <TabsContent value="pricing" className="mt-4 space-y-4">
          {linkedSupplierItems.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No supplier items linked to this catalog item yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {linkedSupplierItems.map((supplierItem) => (
                <PricingSection
                  key={supplierItem.id}
                  supplierItem={supplierItem}
                  onAddOverride={() => openAddOverrideDialog(supplierItem.id)}
                  onEditOverride={(tier) => openEditOverrideDialog({ ...tier, supplierItemId: supplierItem.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={variantOpen} onOpenChange={setVariantOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Variant</DialogTitle></DialogHeader>
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
                    <Select value={row.dimensionId} onValueChange={(v) => updateRow(i, 'dimensionId', v)}>
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

      <ConfirmDialog
        open={!!deletingVariantId}
        onOpenChange={(open) => {
          if (!open) setDeletingVariantId(undefined)
        }}
        title="Remove Variant"
        description="This will permanently remove this variant from the item."
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={() => deletingVariantId && removeVariant.mutate(deletingVariantId)}
        isLoading={removeVariant.isPending}
      />

      <Dialog
        open={pricingDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setPricingDialogOpen(true)
            return
          }
          closePricingDialog()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustomerTier ? 'Edit Customer Override' : 'Add Customer Override'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handlePriceSubmit((data) => {
              if (selectedSupplierItemId) {
                if (editingCustomerTier) {
                  updateCustomerTier.mutate({
                    tierId: editingCustomerTier.id,
                    minQty: data.minQty,
                    unitPrice: data.unitPrice,
                    currency: editingCustomerTier.currency,
                  })
                } else {
                  addCustomerTier.mutate({
                    supplierItemId: selectedSupplierItemId,
                    customerId: data.customerId,
                    minQty: data.minQty,
                    unitPrice: data.unitPrice,
                  })
                }
              }
            })}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="customerId">Customer</Label>
              <Select
                value={selectedCustomerId || ''}
                onValueChange={(value) => setPriceValue('customerId', value, { shouldValidate: true })}
                disabled={!!editingCustomerTier}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {priceErrors.customerId && (
                <p className="text-xs text-destructive">{priceErrors.customerId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="minQty">Minimum Quantity</Label>
              <Input
                id="minQty"
                type="number"
                placeholder="0"
                {...registerPrice('minQty', { valueAsNumber: true })}
              />
              {priceErrors.minQty && (
                <p className="text-xs text-destructive">{priceErrors.minQty.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...registerPrice('unitPrice', { valueAsNumber: true })}
              />
              {priceErrors.unitPrice && (
                <p className="text-xs text-destructive">{priceErrors.unitPrice.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closePricingDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addCustomerTier.isPending || updateCustomerTier.isPending}>
                {addCustomerTier.isPending || updateCustomerTier.isPending
                  ? 'Saving…'
                  : editingCustomerTier
                    ? 'Save Changes'
                    : 'Add Override'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function useItemDetailParams() {
  return { id: window.location.pathname.split('/').pop() || '' }
}

interface PricingSectionProps {
  supplierItem: SupplierItem
  onAddOverride: () => void
  onEditOverride: (tier: CustomerTier) => void
}

function PricingSection({ supplierItem, onAddOverride, onEditOverride }: PricingSectionProps) {
  const qc = useQueryClient()
  const [deletingTierId, setDeletingTierId] = useState<string | undefined>()

  const { data: baseTiers = [] } = useQuery<PriceTier[]>({
    queryKey: queryKeys.pricing.baseTiers(supplierItem.id),
    queryFn: () => pricingApi.getBaseTiers(supplierItem.id),
  })

  const { data: customerTiers = [] } = useQuery<CustomerTier[]>({
    queryKey: queryKeys.pricing.customerTiers(supplierItem.id),
    queryFn: () => pricingApi.getCustomerTiers(supplierItem.id),
  })

  const { mutate: deleteCustomerTier, isPending: isDeleting } = useMutation({
    mutationFn: (tierId: string) => pricingApi.deleteCustomerTier(tierId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pricing.customerTiers(supplierItem.id) })
      setDeletingTierId(undefined)
    },
  })

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {supplierItem.name}
            <p className="text-sm font-normal text-muted-foreground">
              Supplier: {supplierItem.supplierName}
            </p>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Price Tiers */}
          <div>
            <h3 className="font-semibold mb-3">Base Price Tiers</h3>
            {baseTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No base price tiers defined</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min Qty</TableHead>
                      <TableHead>Max Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Effective From</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {baseTiers.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="text-sm">{tier.minQty}</TableCell>
                        <TableCell className="text-sm">
                          {tier.maxQty ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tier.currency} {tier.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(tier.effectiveFrom), 'dd MMM yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Customer Overrides */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Customer-Specific Overrides</h3>
              <Button size="sm" onClick={onAddOverride}>
                <Plus className="mr-2 h-4 w-4" /> Add Override
              </Button>
            </div>
            {customerTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customer overrides defined</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Min Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerTiers.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="text-sm">{tier.customerName}</TableCell>
                        <TableCell className="text-sm">{tier.minQty}</TableCell>
                        <TableCell className="text-sm">
                          {tier.currency} {tier.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditOverride(tier)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingTierId(tier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <ConfirmDialog
              open={!!deletingTierId}
              onOpenChange={(open) => {
                if (!open) setDeletingTierId(undefined)
              }}
              title="Remove Override"
              description="This will permanently remove this customer price override."
              variant="destructive"
              confirmLabel="Remove"
              onConfirm={() => deletingTierId && deleteCustomerTier(deletingTierId)}
              isLoading={isDeleting}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
