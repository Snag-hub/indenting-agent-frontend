import { useNavigate, useChildMatches, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { enquiryApi, type EnquirySummaryDto } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Eye, Plus, Trash2, Send, Lock } from 'lucide-react'
import { format } from 'date-fns'

const enquiryLineSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
})

const enquiryFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().optional(),
  items: z.array(enquiryLineSchema),
})

type EnquiryForm = z.infer<typeof enquiryFormSchema>

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'outline',
  Open: 'default',
  Closed: 'secondary',
}

export function EnquiriesPage() {
  const navigate = useNavigate()
  const childMatches = useChildMatches()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState<string | undefined>()
  const [closing, setClosing] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.enquiries.list({ search, page }),
    queryFn: () => enquiryApi.list({ search, pageSize: 20, page }),
  })

  const { data: availableItems = [] } = useQuery({
    queryKey: ['enquiries', 'available-items'],
    queryFn: () => enquiryApi.availableItems(),
  })

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<EnquiryForm>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      title: '',
      notes: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const createEnquiry = useMutation({
    mutationFn: (data: EnquiryForm) =>
      enquiryApi.create({
        title: data.title,
        notes: data.notes || undefined,
        items: data.items.map((item) => {
          const found = availableItems.find((a) => a.id === item.itemId)
          return {
            masterItemId: found?.type === 'Master' ? item.itemId : undefined,
            supplierItemId: found?.type === 'Supplier' ? item.itemId : undefined,
            quantity: item.quantity,
            notes: item.notes || undefined,
          }
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setDialogOpen(false)
      reset()
    },
  })

  const submitEnquiry = useMutation({
    mutationFn: (id: string) => enquiryApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setSubmitting(undefined)
    },
  })

  const closeEnquiry = useMutation({
    mutationFn: (id: string) => enquiryApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enquiries.list() })
      setClosing(undefined)
    },
  })

  if (childMatches.length > 0) return <Outlet />

  const columns: ColumnDef<EnquirySummaryDto>[] = [
    { accessorKey: 'title', header: 'Title' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={statusColors[getValue() as string]}>
          {getValue() as string}
        </Badge>
      ),
    },
    { accessorKey: 'itemCount', header: 'Items', cell: ({ getValue }) => `${getValue()} item(s)` },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => format(new Date(getValue() as string), 'dd MMM yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate({ to: '/enquiries/$id', params: { id: row.original.id } })}
          >
            <Eye className="h-4 w-4" />
          </Button>

          {row.original.status === 'Draft' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSubmitting(row.original.id)}
              title="Submit Enquiry"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}

          {row.original.status === 'Open' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setClosing(row.original.id)}
              title="Close Enquiry"
            >
              <Lock className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Create and manage enquiries for items"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Enquiry
          </Button>
        }
      />

      <Input
        placeholder="Search enquiries by title..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          totalCount={data?.totalCount ?? 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Enquiry</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((data) => createEnquiry.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Q1 2024 Materials Request"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details or requirements..."
                {...register('notes')}
                className="min-h-20"
              />
            </div>

            <div className="space-y-3">
              <Label>Line Items (optional)</Label>

              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Item</Label>
                    <Controller
                      control={control}
                      name={`items.${index}.itemId`}
                      render={({ field }) => (
                        <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" disabled>Select item</SelectItem>
                            {availableItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.resolvedName}
                                {item.type === 'Supplier' && item.supplierName
                                  ? ` — ${item.supplierName}`
                                  : item.type === 'Master'
                                  ? ' (Master)'
                                  : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.items?.[index]?.itemId && (
                      <p className="text-xs text-destructive">
                        {errors.items[index]?.itemId?.message}
                      </p>
                    )}
                  </div>

                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      min="1"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-xs text-destructive">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Input
                      placeholder="Item notes"
                      {...register(`items.${index}.notes`)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ itemId: '', quantity: 1, notes: undefined })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); reset() }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createEnquiry.isPending}>
                {createEnquiry.isPending ? 'Creating…' : 'Create Enquiry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!submitting}
        onOpenChange={(open) => {
          if (!open) setSubmitting(undefined)
        }}
        title="Submit Enquiry"
        description="This will change the status to Open and notify relevant parties."
        confirmLabel="Submit"
        onConfirm={() => submitting && submitEnquiry.mutate(submitting)}
        isLoading={submitEnquiry.isPending}
      />

      <ConfirmDialog
        open={!!closing}
        onOpenChange={(open) => {
          if (!open) setClosing(undefined)
        }}
        title="Close Enquiry"
        description="This will mark the enquiry as Closed."
        confirmLabel="Close"
        onConfirm={() => closing && closeEnquiry.mutate(closing)}
        isLoading={closeEnquiry.isPending}
      />
    </div>
  )
}
