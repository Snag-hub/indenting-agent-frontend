# TicketDetailPage Integration Example

This document shows the changes needed to replace the HTTP-based comments with the real-time ThreadPanel in TicketDetailPage.

## Changes Summary

### 1. Remove Old Comment Imports and State

**REMOVE these from TicketDetailPage.tsx:**

```tsx
// Remove these imports
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Send } from 'lucide-react'

// Remove these state variables
const [addCommentDialogOpen, setAddCommentDialogOpen] = useState(false)
const [removingCommentId, setRemovingCommentId] = useState<string | undefined>()

// Remove these form declarations
const { register: regComment, handleSubmit: handleAddComment, reset: resetComment, formState: { errors: commentErrors } } = useForm<AddCommentForm>({
  resolver: zodResolver(addCommentSchema),
})

// Remove these schema and type definitions
const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').min(3, 'Comment must be at least 3 characters'),
})
type AddCommentForm = z.infer<typeof addCommentSchema>

// Remove these mutations
const addComment = useMutation({
  mutationFn: (data: AddCommentForm) =>
    ticketApi.addComment(id, { content: data.content }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
    setAddCommentDialogOpen(false)
    resetComment()
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
```

### 2. Add New ThreadPanel Import

**ADD this import:**

```tsx
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { useAuthStore } from '@/stores/authStore'
```

### 3. Update the Layout

**CHANGE the main return statement layout:**

```tsx
// OLD: Single column layout
export function TicketDetailPage() {
  // ... state ...
  
  return (
    <div className="space-y-6">
      <PageHeader title={ticket.title} action={/* ... */} />
      {/* Details card */}
      <Card>
        {/* Ticket details */}
      </Card>
      {/* Comments section */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        {/* OLD comment dialog and list */}
      </Card>
    </div>
  )
}

// NEW: Three-column grid layout
export function TicketDetailPage() {
  const { user } = useAuthStore()
  // ... state ...
  
  return (
    <div className="space-y-6">
      <PageHeader title={ticket.title} action={/* ... */} />
      
      <div className="grid grid-cols-3 gap-6">
        {/* Main content: 2 columns */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Ticket details */}
            </CardContent>
          </Card>
        </div>
        
        {/* Right sidebar: 1 column */}
        <aside className="space-y-4">
          {/* Metadata card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={statusColors[ticket.status]}>{ticket.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Priority</p>
                  <Badge variant={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                </div>
                {/* Other metadata fields */}
              </div>
            </CardContent>
          </Card>
          
          {/* Thread panel */}
          <ThreadPanel 
            threadId={`Ticket-${id}`}
            title={`#${ticket.ticketNumber}`}
            canPostInternal={user?.role === 'Admin'}
          />
        </aside>
      </div>
    </div>
  )
}
```

### 4. Remove Comment Dialog and UI Elements

**REMOVE these UI sections from the JSX:**

```tsx
// Remove the "Add Comment" button
<Button 
  onClick={() => setAddCommentDialogOpen(true)}
  size="sm"
>
  <Send className="mr-2 h-4 w-4" /> Add Comment
</Button>

// Remove the comments card
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Comments ({ticket.comments?.length ?? 0})</CardTitle>
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => setAddCommentDialogOpen(true)}
      >
        Add
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    {ticket.comments?.map(comment => (
      <div key={comment.id} className="pb-4 border-b last:border-b-0">
        {/* Old comment UI */}
      </div>
    ))}
  </CardContent>
</Card>

// Remove the add comment dialog
<Dialog open={addCommentDialogOpen} onOpenChange={setAddCommentDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Comment</DialogTitle>
    </DialogHeader>
    {/* Old comment form */}
  </DialogContent>
</Dialog>

// Remove the delete comment confirmation dialog
<AlertDialog open={!!removingCommentId}>
  {/* Old delete dialog */}
</AlertDialog>
```

## Before and After Code Example

### BEFORE (Old HTTP-based Comments)

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Send } from 'lucide-react'

export function TicketDetailPage() {
  const [addCommentDialogOpen, setAddCommentDialogOpen] = useState(false)
  const { register: regComment, handleSubmit: handleAddComment } = useForm()
  
  const addComment = useMutation({
    mutationFn: (data) => ticketApi.addComment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
      setAddCommentDialogOpen(false)
    },
  })
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <Button onClick={() => setAddCommentDialogOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Add Comment
          </Button>
        </CardHeader>
        <CardContent>
          {ticket.comments?.map(comment => (
            <div key={comment.id}>
              {comment.content}
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Dialog open={addCommentDialogOpen} onOpenChange={setAddCommentDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddComment((data) => addComment.mutate(data))}>
            <Textarea {...regComment('content')} />
            <Button type="submit" disabled={addComment.isPending}>Send</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### AFTER (Real-Time ThreadPanel)

```tsx
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { useAuthStore } from '@/stores/authStore'

export function TicketDetailPage() {
  const { id } = useParams({ from: '/_app/tickets/$id' })
  const { user } = useAuthStore()
  const { data: ticket, isLoading } = useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => ticketApi.get(id),
  })
  
  return (
    <div className="space-y-6">
      <PageHeader title={ticket?.title} />
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Ticket details */}
        </div>
        
        <aside>
          <ThreadPanel 
            threadId={`Ticket-${id}`}
            title={`#${ticket?.ticketNumber}`}
            canPostInternal={user?.role === 'Admin'}
          />
        </aside>
      </div>
    </div>
  )
}
```

## Migration Checklist

- [ ] Remove old comment schema and types (addCommentSchema, AddCommentForm)
- [ ] Remove old state variables (addCommentDialogOpen, removingCommentId)
- [ ] Remove old form hook (regComment, handleAddComment, resetComment)
- [ ] Remove old mutations (addComment, removeComment)
- [ ] Remove old imports (Textarea, Dialog, Send icon)
- [ ] Add ThreadPanel import
- [ ] Add useAuthStore import
- [ ] Convert layout to 3-column grid (col-span-2 + sidebar)
- [ ] Add ThreadPanel component to sidebar
- [ ] Remove old comments Card and Dialog from JSX
- [ ] Remove old delete confirmation dialog
- [ ] Test real-time message sending and receiving
- [ ] Verify internal message toggle works for admins
- [ ] Verify non-admins can't post internal messages

## Benefits of Migration

✅ **Real-time messaging** - Messages appear instantly via SignalR
✅ **Better UX** - No page refresh needed for new messages
✅ **Edit/Delete** - Users can edit and delete their messages
✅ **Admin features** - Internal-only messages for admin discussion
✅ **Audit trail** - All messages persisted in database
✅ **Scalable** - Uses Hangfire for background processing
✅ **Consistent** - Same messaging experience across all entities

## Testing

After integration, test:

1. **Send message** - Message appears immediately in ThreadPanel
2. **Edit message** - Edit button appears on hover for own messages
3. **Delete message** - Delete with confirmation dialog
4. **Admin internal** - Admins see checkbox for internal messages
5. **Non-admin** - Non-admins don't see internal checkbox or internal messages
6. **Real-time** - Open ticket in two browsers, send message in one, verify it appears in the other
7. **Pagination** - Click "Load earlier messages" to see older messages
8. **Auto-scroll** - New messages auto-scroll to bottom
