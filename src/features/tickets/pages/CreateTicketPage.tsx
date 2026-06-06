import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Route } from '@/routes/_app.tickets.new'
import { ticketApi, type TicketEntityType } from '@/features/tickets/api/ticketApi'
import { useAvailableTicketDocuments } from '@/features/tickets/hooks/useAvailableTicketDocuments'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

const ENTITY_LABELS: Record<string, string> = {
  DO: 'Delivery Order',
  PI: 'Proforma Invoice',
  PO: 'Purchase Order',
  RFQ: 'Request for Quotation',
  QT: 'Quotation',
  Payment: 'Payment',
}

// Which document types each role may raise a ticket against. Mirrors the backend
// access rules so the picker never offers a type whose document list would 403.
//   Shared docs (RFQ/QT/PO) — both parties.  PI/DO — customer only.  Payment — supplier only.
const ENTITY_TYPES_BY_ROLE: Record<string, TicketEntityType[]> = {
  Customer: ['RFQ', 'QT', 'PO', 'PI', 'DO'],
  Supplier: ['RFQ', 'QT', 'PO', 'Payment'],
  Admin: ['RFQ', 'QT', 'PO', 'PI', 'DO', 'Payment'],
}

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
})

type CreateTicketForm = z.infer<typeof createTicketSchema>

export function CreateTicketPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const allowedEntityTypes = ENTITY_TYPES_BY_ROLE[role ?? ''] ?? ENTITY_TYPES_BY_ROLE.Admin

  const { entityType: prefilledType, entityId: prefilledId, entityNumber } = Route.useSearch()

  // When navigated from a document page, use those values; otherwise let user choose
  const [selectedEntityType, setSelectedEntityType] = useState<TicketEntityType | ''>(
    (prefilledType as TicketEntityType) ?? ''
  )
  const [selectedEntityId, setSelectedEntityId] = useState<string>(prefilledId ?? '')

  const { documents, isLoading: docsLoading } = useAvailableTicketDocuments(
    selectedEntityType || null
  )

  const { register, handleSubmit, formState: { errors } } = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { priority: 'Medium' },
  })

  const createTicket = useMutation({
    mutationFn: (data: CreateTicketForm) =>
      ticketApi.create({
        title: data.title,
        description: data.description,
        priority: data.priority,
        linkedEntityType: (selectedEntityType || undefined) as TicketEntityType | undefined,
        linkedEntityId: selectedEntityId || undefined,
      }),
    onSuccess: (ticketId) => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets.list() })
      toast.success('Ticket created successfully')
      navigate({ to: '/tickets/$id', params: { id: ticketId } })
    },
    onError: () => toast.error('Failed to create ticket'),
  })

  const isLinked = !!(selectedEntityType && selectedEntityId)
  const linkedDoc = prefilledId
    ? { number: entityNumber ?? prefilledId }
    : documents.find((d) => d.id === selectedEntityId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Support Ticket"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/tickets' })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      {/* Show linked entity banner when navigated from document page */}
      {prefilledType && prefilledId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border rounded-md px-4 py-2 max-w-2xl">
          <Link2 className="h-4 w-4 shrink-0" />
          <span>Linked to</span>
          <Badge variant="secondary">{ENTITY_LABELS[prefilledType] ?? prefilledType}</Badge>
          {entityNumber && <span className="font-mono font-semibold">{entityNumber}</span>}
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Ticket Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => createTicket.mutate(data))} className="space-y-6">

            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="Brief description of the issue" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" placeholder="Detailed explanation of the issue…" className="min-h-32" {...register('description')} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="priority">Priority *</Label>
              <select
                id="priority"
                className="w-full h-9 px-3 py-2 bg-background border border-input rounded-md text-sm"
                {...register('priority')}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
            </div>

            {/* Entity linking — only shown when not pre-filled from a document page */}
            {!prefilledType && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Link to a document (optional)</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Document Type</Label>
                    <Select
                      value={selectedEntityType}
                      onValueChange={(v) => { setSelectedEntityType(v as TicketEntityType | ''); setSelectedEntityId('') }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {allowedEntityTypes.map((t) => (
                          <SelectItem key={t} value={t}>{ENTITY_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEntityType && (
                    <div className="space-y-1">
                      <Label>Document</Label>
                      <Select value={selectedEntityId} onValueChange={setSelectedEntityId} disabled={docsLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={docsLoading ? 'Loading…' : 'Select document'} />
                        </SelectTrigger>
                        <SelectContent>
                          {documents.map((doc) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              {doc.number} — {doc.status}
                            </SelectItem>
                          ))}
                          {!docsLoading && documents.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No documents found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {isLinked && linkedDoc && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border rounded-md px-3 py-2">
                    <Link2 className="h-4 w-4 shrink-0" />
                    <span>Linked to</span>
                    <Badge variant="secondary">{ENTITY_LABELS[selectedEntityType] ?? selectedEntityType}</Badge>
                    <span className="font-mono font-semibold">{linkedDoc.number}</span>
                    {(linkedDoc as { createdDate?: string }).createdDate && (
                      <span className="text-xs">{format(new Date((linkedDoc as { createdDate: string }).createdDate), 'dd MMM yyyy')}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Creating…' : 'Create Ticket'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/tickets' })}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
