import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
// Route import gives us typed access to search params (entityType, entityId, entityNumber)
import { Route } from '@/routes/_app.tickets.new'
import { ticketApi } from '@/features/tickets/api/ticketApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Link2 } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Maps internal entity type codes to human-readable labels
 * for the "linked entity" banner shown when a ticket is raised
 * directly from a DO or PI detail page.
 */
const ENTITY_LABELS: Record<string, string> = {
  DO: 'Delivery Order',
  PI: 'Proforma Invoice',
  PO: 'Purchase Order',
  RFQ: 'Request for Quotation',
  QT: 'Quotation',
}

/** Zod schema — description is required (backend validator enforces it too). */
const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
})

type CreateTicketForm = z.infer<typeof createTicketSchema>

/**
 * Create Ticket page.
 *
 * Can be opened in two ways:
 * 1. From the Tickets nav → plain form with no pre-filled entity
 * 2. From a DO or PI detail page → URL carries `entityType`, `entityId`, `entityNumber`
 *    search params; a banner is shown and the linked entity is saved with the ticket.
 */
export function CreateTicketPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Read optional search params set by the DO / PI "Create Ticket" buttons
  const { entityType, entityId, entityNumber } = Route.useSearch()

  const { register, handleSubmit, formState: { errors } } = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      priority: 'Medium',
    },
  })

  const createTicket = useMutation({
    mutationFn: (data: CreateTicketForm) =>
      ticketApi.create({
        title: data.title,
        description: data.description,
        priority: data.priority,
        // Pass entity link when navigated from DO / PI detail
        linkedEntityType: entityType,
        linkedEntityId: entityId,
      }),
    onSuccess: (ticketId) => {
      // Invalidate the tickets list so the new ticket appears immediately
      qc.invalidateQueries({ queryKey: queryKeys.tickets.list() })
      toast.success('Ticket created successfully')
      navigate({ to: '/tickets/$id', params: { id: ticketId } })
    },
    onError: () => toast.error('Failed to create ticket'),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Support Ticket"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/tickets' })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      {/*
        Linked entity banner — only shown when navigating from a DO or PI detail page.
        Displays the entity type label and document number so the user knows
        which document this ticket is linked to.
      */}
      {entityType && entityId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border rounded-md px-4 py-2 max-w-2xl">
          <Link2 className="h-4 w-4 shrink-0" />
          <span>Linked to</span>
          <Badge variant="secondary">{ENTITY_LABELS[entityType] ?? entityType}</Badge>
          {entityNumber && <span className="font-mono font-semibold">{entityNumber}</span>}
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => createTicket.mutate(data))}
            className="space-y-6"
          >
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Detailed explanation of the issue…"
                className="min-h-32"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Priority — native select to avoid shadcn Select + RHF complexity */}
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
              {errors.priority && (
                <p className="text-xs text-destructive">{errors.priority.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Creating…' : 'Create Ticket'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/tickets' })}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
