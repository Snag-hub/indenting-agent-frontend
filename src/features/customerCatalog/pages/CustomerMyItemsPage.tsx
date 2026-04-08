import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { customerItemApi, type CustomerItemDto } from '@/features/customerCatalog/api/customerItemApi'
import { enquiryApi } from '@/features/enquiries/api/enquiryApi'
import { queryKeys } from '@/lib/queryKeys'
import { DataTable } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const addEditSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  customName: z.string().optional(),
  customDescription: z.string().optional(),
})

type AddEditForm = z.infer<typeof addEditSchema>

export function CustomerMyItemsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CustomerItemDto | null>(null)
  const [deleting, setDeleting] = useState<string | undefined>()
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch customer items
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.customerItems?.list?.({ search, page }) || ['customer-items', 'list', { search, page }],
    queryFn: () => customerItemApi.list({ search, pageSize: 20, page }),
  })

  // Fetch available items for dialog
  const { data: availableItems = [] } = useQuery({
    queryKey: ['enquiries', 'available-items', searchTerm],
    queryFn: () => enquiryApi.availableItems(searchTerm),
  })

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<AddEditForm>({
    resolver: zodResolver(addEditSchema),
    defaultValues: {
      itemId: '',
      customName: '',
      customDescription: '',
    },
  })

  const itemId = watch('itemId')
  const selectedItem = availableItems.find(i => i.id === itemId)

  const createItem = useMutation({
    mutationFn: (data: AddEditForm) =>
      customerItemApi.create({
        masterItemId: selectedItem?.type === 'Master' ? data.itemId : undefined,
        supplierItemId: selectedItem?.type === 'Supplier' ? data.itemId : undefined,
        customName: data.customName || undefined,
        customDescription: data.customDescription || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.customerItems?.list?.() || ['customer-items', 'list'],
      })
      setDialogOpen(false)
      reset()
      setEditingItem(null)
    },
  })

  const updateItem = useMutation({
    mutationFn: (data: AddEditForm) =>
      customerItemApi.update(editingItem!.id, {
        customName: data.customName || undefined,
        customDescription: data.customDescription || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.customerItems?.list?.() || ['customer-items', 'list'],
      })
      setDialogOpen(false)
      reset()
      setEditingItem(null)
    },
  })

  const deleteItem = useMutation({
    mutationFn: (id: string) => customerItemApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.customerItems?.list?.() || ['customer-items', 'list'],
      })
      setDeleting(undefined)
    },
  })

  const handleOpenDialog = (item?: CustomerItemDto) => {
    if (item) {
      setEditingItem(item)
      reset({
        itemId: item.masterItemId || item.supplierItemId || '',
        customName: item.customName || '',
        customDescription: item.customDescription || '',
      })
    } else {
      reset({
        itemId: '',
        customName: '',
        customDescription: '',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingItem(null)
    reset()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Items" description="Manage your custom item catalog" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const columns: ColumnDef<CustomerItemDto>[] = [
    {
      accessorKey: 'resolvedName',
      header: 'Resolved Name',
      cell: ({ row }) => <span className="font-medium">{row.original.resolvedName}</span>,
    },
    {
      accessorKey: 'customName',
      header: 'Custom Name',
      cell: ({ row }) =>
        row.original.customName ? (
          <span className="text-slate-700">{row.original.customName}</span>
        ) : (
          <span className="text-slate-400 italic">Not customised</span>
        ),
    },
    {
      accessorKey: 'supplierName',
      header: 'Supplier',
      cell: ({ getValue }) => (
        <span className="text-slate-600">{getValue() as string || '—'}</span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.masterItemId ? 'Master' : 'Supplier'
        return (
          <Badge variant={type === 'Master' ? 'default' : 'secondary'}>
            {type}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? 'outline' : 'secondary'}>
          {getValue() ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleOpenDialog(row.original)}
            title="Edit Item"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeleting(row.original.id)}
            title="Remove Item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Items"
        description="Manage your custom item catalog"
        action={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        }
      />

      <Input
        placeholder="Search items..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((data) => {
              if (editingItem) {
                updateItem.mutate(data)
              } else {
                createItem.mutate(data)
              }
            })}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="itemId">Item *</Label>
              <Input
                id="itemId"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!!editingItem}
              />
              {availableItems.length > 0 && (
                <div className="border rounded mt-2 max-h-40 overflow-y-auto">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        reset((prev) => ({
                          ...prev,
                          itemId: item.id,
                          customName: prev?.customName || item.name,
                        }))
                        setSearchTerm('')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm border-b last:border-b-0"
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">
                        {item.type} {item.supplierName && `• ${item.supplierName}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {itemId && (
                <div className="text-sm text-slate-600 mt-2">
                  Selected: <span className="font-medium">{selectedItem?.name}</span>
                </div>
              )}
              {errors.itemId && (
                <p className="text-xs text-destructive">{errors.itemId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="customName">Custom Name (optional)</Label>
              <Input
                id="customName"
                placeholder="Your custom name for this item"
                {...register('customName')}
              />
              {errors.customName && (
                <p className="text-xs text-destructive">{errors.customName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="customDescription">Custom Description (optional)</Label>
              <Textarea
                id="customDescription"
                placeholder="Additional notes or specifications"
                {...register('customDescription')}
              />
              {errors.customDescription && (
                <p className="text-xs text-destructive">{errors.customDescription.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createItem.isPending || updateItem.isPending}
              >
                {createItem.isPending || updateItem.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Remove Item"
        description="Are you sure you want to remove this item? This action cannot be undone."
        onConfirm={() => deleting && deleteItem.mutate(deleting)}
        isLoading={deleteItem.isPending}
        variant="destructive"
      />
    </div>
  )
}
