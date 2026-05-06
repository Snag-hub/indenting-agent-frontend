# ThreadPanel Quick Reference

**Copy-paste snippets for fast integration**

## Basic Setup (3 lines of code)

```tsx
import { ThreadPanel } from '@/features/threads'
import { useAuthStore } from '@/stores/authStore'

const { user } = useAuthStore()
```

## Add to Detail Page

### Option 1: Right Sidebar (Recommended)

```tsx
<div className="grid grid-cols-3 gap-6">
  <div className="col-span-2">
    {/* Main content */}
  </div>
  
  <ThreadPanel 
    threadId={`RFQ-${id}`}
    title="Conversation"
    canPostInternal={user?.role === 'Admin'}
  />
</div>
```

### Option 2: Tab

```tsx
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="discussion">Discussion</TabsTrigger>
  </TabsList>
  
  <TabsContent value="discussion" className="h-[600px]">
    <ThreadPanel threadId={`RFQ-${id}`} />
  </TabsContent>
</Tabs>
```

### Option 3: Stacked (Mobile-friendly)

```tsx
<div className="space-y-6">
  {/* Details section */}
  <Card>
    {/* Content */}
  </Card>
  
  {/* Thread section */}
  <div className="h-[500px]">
    <ThreadPanel threadId={`RFQ-${id}`} />
  </div>
</div>
```

## Entity Type Examples

| Entity | ThreadId Example |
|--------|------------------|
| RFQ | `RFQ-550e8400-e29b-41d4-a716-446655440000` |
| Quotation | `Quotation-550e8400-e29b-41d4-a716-446655440000` |
| Purchase Order | `PurchaseOrder-550e8400-e29b-41d4-a716-446655440000` |
| Proforma Invoice | `ProformaInvoice-550e8400-e29b-41d4-a716-446655440000` |
| Delivery Order | `DeliveryOrder-550e8400-e29b-41d4-a716-446655440000` |
| Ticket | `Ticket-550e8400-e29b-41d4-a716-446655440000` |

## ThreadPanel Props

```typescript
interface ThreadPanelProps {
  // Required: Unique thread identifier
  threadId: string

  // Optional: Title shown in panel header
  title?: string
  // Example: "RFQ-2026-0042", "Ticket #TSK-001"

  // Optional: Allow posting internal (admin-only) messages
  canPostInternal?: boolean
  // Set to: user?.role === 'Admin'
}
```

## Common Patterns

### RFQDetailPage
```tsx
<ThreadPanel 
  threadId={`RFQ-${id}`}
  title={`RFQ ${rfq?.documentNumber}`}
  canPostInternal={user?.role === 'Admin'}
/>
```

### PurchaseOrderDetailPage
```tsx
<ThreadPanel 
  threadId={`PurchaseOrder-${id}`}
  title={`PO ${po?.documentNumber}`}
  canPostInternal={user?.role === 'Admin'}
/>
```

### ProformaInvoiceDetailPage
```tsx
<ThreadPanel 
  threadId={`ProformaInvoice-${id}`}
  title={`PI ${pi?.documentNumber}`}
  canPostInternal={user?.role === 'Admin'}
/>
```

### DeliveryOrderDetailPage
```tsx
<ThreadPanel 
  threadId={`DeliveryOrder-${id}`}
  title={`DO ${docu?.documentNumber}`}
  canPostInternal={user?.role === 'Admin'}
/>
```

### TicketDetailPage
```tsx
<ThreadPanel 
  threadId={`Ticket-${id}`}
  title={`#${ticket?.ticketNumber}`}
  canPostInternal={user?.role === 'Admin'}
/>
```

## Height Management

```tsx
// Fixed height (good for sidebars)
<div className="h-[600px]">
  <ThreadPanel threadId={threadId} />
</div>

// Flexible height (good for tabs)
<div className="h-full">
  <ThreadPanel threadId={threadId} />
</div>

// Min height (ensures it takes space)
<div className="min-h-[400px]">
  <ThreadPanel threadId={threadId} />
</div>
```

## API Usage (Lower-level)

If you need direct API access:

```tsx
import { threadApi } from '@/features/threads'

// Fetch messages
const messages = await threadApi.getMessages(threadId, page, pageSize)

// Send message
await threadApi.postMessage(threadId, {
  message: 'Hello',
  isInternal: false,
})

// Update message
await threadApi.updateMessage(threadId, messageId, {
  message: 'Updated text',
})

// Delete message
await threadApi.deleteMessage(threadId, messageId)
```

## Hook Usage (Lower-level)

If you need SignalR control:

```tsx
import { useThreadHub } from '@/hooks/useThreadHub'

const { 
  isConnected,        // boolean
  sendMessage,        // (msg, isInternal) => void
  updateMessage,      // (msgId, text) => void
  deleteMessage,      // (msgId) => void
} = useThreadHub(threadId)

// Send message
sendMessage('Hello world', false)

// Update message
updateMessage(messageId, 'Updated text')

// Delete message
deleteMessage(messageId)
```

## Full-Page Example

```tsx
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ThreadPanel } from '@/features/threads'
import { useAuthStore } from '@/stores/authStore'
import { rfqApi } from '@/features/rfqs/api/rfqApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

export function RFQDetailPage() {
  const { id } = useParams({ from: '/_app/rfqs/$id' })
  const { user } = useAuthStore()
  
  const { data: rfq } = useQuery({
    queryKey: queryKeys.rfqs.detail(id),
    queryFn: () => rfqApi.get(id),
  })

  return (
    <div className="space-y-6">
      <PageHeader title={rfq?.title} />
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6">
              {/* RFQ details */}
            </CardContent>
          </Card>
        </div>
        
        <aside>
          <ThreadPanel 
            threadId={`RFQ-${id}`}
            title={`RFQ ${rfq?.documentNumber}`}
            canPostInternal={user?.role === 'Admin'}
          />
        </aside>
      </div>
    </div>
  )
}
```

## Styling Customization

ThreadPanel already handles all styling. If you need to adjust:

```tsx
// Adjust container height
<div className="h-[700px]">
  <ThreadPanel threadId={threadId} />
</div>

// Adjust padding/spacing in parent
<aside className="space-y-4">
  <Card>Other widget</Card>
  <ThreadPanel threadId={threadId} />
</aside>

// Dark mode - ThreadPanel uses Tailwind dark mode automatically
// No additional styling needed
```

## Troubleshooting

### "ThreadPanel doesn't show messages"
→ Verify `threadId` matches backend thread ID pattern
→ Check browser DevTools Network tab for API errors
→ Ensure user is authenticated (`user?.id` should exist)

### "Real-time updates not working"
→ Check SignalR connection in DevTools Console
→ Verify `/hubs/threads` endpoint is accessible
→ Check if user has [Authorize] permission
→ Inspect browser WebSocket tab for SignalR frames

### "Can't edit/delete message"
→ Only creator or Admin can edit/delete
→ Verify `user?.id === message.createdById`
→ Check API errors in Network tab

### "Internal messages not showing"
→ Only Admins see internal messages
→ Set `canPostInternal={user?.role === 'Admin'}`
→ Non-admins won't see the checkbox or messages

## Performance Tips

1. **Pagination**: ThreadPanel loads 20 messages per page automatically
2. **Real-time**: Uses SignalR groups to minimize bandwidth
3. **Query caching**: TanStack Query caches per threadId
4. **Revalidation**: Auto-invalidates on message send/edit/delete

No manual optimization needed - it's built-in!

## Testing

```tsx
// Minimal test example
import { render, screen } from '@testing-library/react'
import { ThreadPanel } from '@/features/threads'

test('renders ThreadPanel', () => {
  render(<ThreadPanel threadId="test-123" />)
  
  expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument()
})
```

## Migration Checklist (for existing detail pages)

- [ ] Add ThreadPanel import
- [ ] Add useAuthStore import
- [ ] Get user from useAuthStore
- [ ] Determine entity type and id
- [ ] Choose layout (sidebar, tab, stacked)
- [ ] Add ThreadPanel JSX with threadId
- [ ] Set canPostInternal based on role
- [ ] Remove old comment/messaging system
- [ ] Test sending messages
- [ ] Test editing messages
- [ ] Test deleting messages
- [ ] Test real-time with two browsers
- [ ] Test admin internal messages

---

**Most Common Integration**:
```tsx
<ThreadPanel 
  threadId={`EntityType-${id}`}
  title={documentNumber}
  canPostInternal={user?.role === 'Admin'}
/>
```

Done! 🎉
