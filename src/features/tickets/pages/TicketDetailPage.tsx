import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ticketApi } from '@/features/tickets/api/ticketApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Send, Lock, Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Open: 'default',
  'In Progress': 'default',
  Resolved: 'secondary',
  Closed: 'secondary',
}

const priorityColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Low: 'outline',
  Medium: 'default',
  High: 'destructive',
  Critical: 'destructive',
}

const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').min(3, 'Comment must be at least 3 characters'),
})

type AddCommentForm = z.infer<typeof addCommentSchema>

const updateTicketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']),
})

type UpdateTicketForm = z.infer<typeof updateTicketSchema>

export function TicketDetailPage() {
  const { id } = useParams({ from: '/_app/tickets/$id' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [addCommentDialogOpen, setAddCommentDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [removingCommentId, setRemovingCommentId] = useState<string | undefined>()
  const [closing, setClosing] = useState(false)

  const { data: ticket, isLoading } = useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => ticketApi.get(id),
  })

  const { register: regComment, handleSubmit: handleAddComment, reset: resetComment, formState: { errors: commentErrors } } = useForm<AddCommentForm>({
    resolver: zodResolver(addCommentSchema),
  })

  const { register: regUpdate, handleSubmit: handleUpdateSubmit, formState: { errors: updateErrors } } = useForm<UpdateTicketForm>({
    resolver: zodResolver(updateTicketSchema),
    defaultValues: {
      title: ticket?.title ?? '',
      description: ticket?.description ?? '',
      priority: ticket?.priority ?? 'Medium',
      status: ticket?.status ?? 'Open',
    },
  })

  const addComment = useMutation({
    mutationFn: (data: AddCommentForm) =>
      ticketApi.addComment(id, { content: data.content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
      setAddCommentDialogOpen(false)
      resetComment()
    },
  })

  const updateTicket = useMutation({
    mutationFn: (data: UpdateTicketForm) =>
      ticketApi.update(id, {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        status: data.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.tickets.list() })
      setEditDialogOpen(false)
    },
  })

  const removeComment = useMutation({
    mutationFn: (commentId: string) =>
      ticketApi.removeComment(id, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
      setRemovingCommentId(undefined)
    },
  })

  const closeTicket = useMutation({
    mutationFn: () => ticketApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.tickets.list() })
      setClosing(false)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!ticket) {
    return <div className="text-muted-foreground">Ticket not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ticket.title}
        description={ticket.documentNumber ? `#${ticket.documentNumber}` : ''}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[ticket.status]}>
              {ticket.status}
            </Badge>
            <Badge variant={priorityColors[ticket.priority]}>
              {ticket.priority}
            </Badge>

            {ticket.status !== 'Closed' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClosing(true)}
                >
                  <Lock className="mr-2 h-4 w-4" /> Close
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/tickets' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge variant={statusColors[ticket.status]}>{ticket.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <Badge variant={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
            </div>
            {ticket.assignedToName && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                <p className="text-sm font-medium">{ticket.assignedToName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created By</p>
              <p className="text-sm font-medium">{ticket.createdByName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{format(new Date(ticket.createdAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Updated</p>
              <p className="text-sm">{ticket.modifiedAt ? format(new Date(ticket.modifiedAt), 'dd MMM yyyy HH:mm') : '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {ticket.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Comments ({ticket.comments.length})</CardTitle>
          {ticket.status !== 'Closed' && (
            <Button size="sm" variant="outline" onClick={() => setAddCommentDialogOpen(true)}>
              <Send className="mr-2 h-4 w-4" /> Add Comment
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No comments yet.</p>
          ) : (
            ticket.comments.map((comment) => (
              <div key={comment.id} className="border-l-2 border-muted pl-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium">{comment.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setRemovingCommentId(comment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Comment Dialog */}
      <Dialog open={addCommentDialogOpen} onOpenChange={setAddCommentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddComment((data) => addComment.mutate(data))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="comment">Comment *</Label>
              <Textarea
                id="comment"
                placeholder="Add your comment…"
                className="min-h-20"
                {...regComment('content')}
              />
              {commentErrors.content && (
                <p className="text-xs text-destructive">{commentErrors.content.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCommentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addComment.isPending}>
                {addComment.isPending ? 'Posting…' : 'Post Comment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmit((data) => updateTicket.mutate(data))} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" {...regUpdate('title')} />
              {updateErrors.title && (
                <p className="text-xs text-destructive">{updateErrors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" className="min-h-20" {...regUpdate('description')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  className="w-full h-9 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  {...regUpdate('status')}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-priority">Priority</Label>
                <select
                  id="edit-priority"
                  className="w-full h-9 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  {...regUpdate('priority')}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTicket.isPending}>
                {updateTicket.isPending ? 'Updating…' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Comment */}
      <ConfirmDialog
        title="Delete Comment"
        description="This comment will be permanently deleted. This action cannot be undone."
        open={!!removingCommentId}
        onConfirm={() => removingCommentId && removeComment.mutate(removingCommentId)}
        onCancel={() => setRemovingCommentId(undefined)}
        loading={removeComment.isPending}
      />

      {/* Confirm Close Ticket */}
      <ConfirmDialog
        title="Close Ticket"
        description="Are you sure you want to close this ticket? It can be reopened later."
        open={closing}
        onConfirm={() => closeTicket.mutate()}
        onCancel={() => setClosing(false)}
        loading={closeTicket.isPending}
      />
    </div>
  )
}
