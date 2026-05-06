# ThreadPanel Integration Guide

This guide shows how to integrate the ThreadPanel component into existing detail pages for real-time threaded conversations.

## Basic Integration

### 1. Import ThreadPanel and create a thread ID

```tsx
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'

export function MyDetailPage() {
  const { id } = useParams({ from: '/_app/my-entity/$id' })
  const { user } = useAuthStore()
  
  // Generate or retrieve thread ID from your entity
  // Pattern: `${entityType}-${entityId}`
  const threadId = `MyEntity-${id}`
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Main content */}
      <div className="col-span-2">
        {/* ... entity details ... */}
      </div>
      
      {/* Thread panel on the right */}
      <div>
        <ThreadPanel 
          threadId={threadId}
          title="Conversation"
          canPostInternal={user?.role === 'Admin'}
        />
      </div>
    </div>
  )
}
```

### 2. Full Width Layout (Tabs)

Use tabs when you want to switch between different views:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'

export function MyDetailPage() {
  const { id } = useParams({ from: '/_app/my-entity/$id' })
  const threadId = `MyEntity-${id}`
  
  return (
    <div className="space-y-4">
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          {/* Entity details */}
        </TabsContent>
        
        <TabsContent value="conversation">
          <div className="h-[600px]">
            <ThreadPanel 
              threadId={threadId}
              title="All Messages"
              canPostInternal={user?.role === 'Admin'}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          {/* Audit history */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Detailed Integration Examples

### RFQDetailPage Integration

```tsx
// In frontend/src/features/rfqs/pages/RFQDetailPage.tsx

import { ThreadPanel } from '@/features/threads/components/ThreadPanel'

export function RFQDetailPage() {
  const { id } = useParams({ from: '/_app/rfqs/$id' })
  const { user } = useAuthStore()
  
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        {/* RFQ details, items table, etc. */}
      </div>
      
      <div className="space-y-4">
        {/* Status card, actions */}
        <ThreadPanel 
          threadId={`RFQ-${id}`}
          title={`RFQ ${rfq?.documentNumber}`}
          canPostInternal={user?.role === 'Admin'}
        />
      </div>
    </div>
  )
}
```

### PurchaseOrderDetailPage Integration

```tsx
// In frontend/src/features/purchaseOrders/pages/PurchaseOrderDetailPage.tsx

import { ThreadPanel } from '@/features/threads/components/ThreadPanel'

export function PurchaseOrderDetailPage() {
  const { id } = useParams({ from: '/_app/purchase-orders/$id' })
  const { user } = useAuthStore()
  const { data: po } = useQuery({
    queryKey: queryKeys.pos.detail(id),
    queryFn: () => purchaseOrderApi.get(id),
  })
  
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        {/* PO header, items, timeline */}
      </div>
      
      <aside className="space-y-4">
        {/* Status, actions, supplier info */}
        
        {/* Thread panel */}
        <ThreadPanel 
          threadId={`PurchaseOrder-${id}`}
          title={po?.documentNumber}
          canPostInternal={user?.role === 'Admin'}
        />
      </aside>
    </div>
  )
}
```

### ProformaInvoiceDetailPage Integration

```tsx
// In frontend/src/features/proformaInvoices/pages/ProformaInvoiceDetailPage.tsx

export function ProformaInvoiceDetailPage() {
  const { id } = useParams({ from: '/_app/proforma-invoices/$id' })
  const { user } = useAuthStore()
  
  return (
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="conversation">Messages</TabsTrigger>
      </TabsList>
      
      <TabsContent value="details">
        {/* Invoice details */}
      </TabsContent>
      
      <TabsContent value="conversation" className="h-screen">
        <ThreadPanel 
          threadId={`ProformaInvoice-${id}`}
          canPostInternal={user?.role === 'Admin'}
        />
      </TabsContent>
    </Tabs>
  )
}
```

### DeliveryOrderDetailPage Integration

```tsx
// In frontend/src/features/deliveryOrders/pages/DeliveryOrderDetailPage.tsx

export function DeliveryOrderDetailPage() {
  const { id } = useParams({ from: '/_app/delivery-orders/$id' })
  const { user } = useAuthStore()
  
  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Order">
        {/* Actions */}
      </PageHeader>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Delivery order details, items, timeline */}
        </div>
        
        <div>
          <ThreadPanel 
            threadId={`DeliveryOrder-${id}`}
            canPostInternal={user?.role === 'Admin'}
          />
        </div>
      </div>
    </div>
  )
}
```

### TicketDetailPage Integration (Replace Comments with Thread)

```tsx
// In frontend/src/features/tickets/pages/TicketDetailPage.tsx
// Replace the existing comment dialog with ThreadPanel

import { ThreadPanel } from '@/features/threads/components/ThreadPanel'

export function TicketDetailPage() {
  const { id } = useParams({ from: '/_app/tickets/$id' })
  const { user } = useAuthStore()
  const { data: ticket, isLoading } = useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => ticketApi.get(id),
  })
  
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        {/* Ticket header with status, priority */}
        <Card>
          <CardHeader>
            <CardTitle>{ticket?.title}</CardTitle>
            <CardDescription>{ticket?.ticketNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            {ticket?.description}
          </CardContent>
        </Card>
        
        {/* Timeline/Activity */}
      </div>
      
      <aside>
        {/* Ticket metadata */}
        <ThreadPanel 
          threadId={`Ticket-${id}`}
          title={`Ticket #${ticket?.ticketNumber}`}
          canPostInternal={user?.role === 'Admin'}
        />
      </aside>
    </div>
  )
}
```

## Styling and Height Management

### With Fixed Height

```tsx
<div className="h-[600px]">
  <ThreadPanel threadId={threadId} />
</div>
```

### With Flexible Height (Sidebar)

```tsx
<aside className="flex flex-col">
  <ThreadPanel threadId={threadId} />
  {/* Other sidebar content below */}
</aside>
```

### Full Page Height

```tsx
<div className="h-screen">
  <ThreadPanel threadId={threadId} />
</div>
```

## Props Reference

```typescript
interface ThreadPanelProps {
  // Required: unique identifier for the thread
  threadId: string
  
  // Optional: title to display in the panel header
  title?: string
  
  // Optional: allow posting internal (admin-only) messages
  // Set to true for users with Admin role
  canPostInternal?: boolean
}
```

## Real-Time Features

The ThreadPanel automatically:
- ✅ Connects to SignalR hub for real-time updates
- ✅ Receives new messages instantly
- ✅ Shows message edits and deletions in real-time
- ✅ Handles reconnections automatically
- ✅ Displays user presence (joined/left)
- ✅ Handles optimistic updates for better UX
- ✅ Auto-scrolls to latest message

## Permissions

- **Admins**: Can post internal messages, edit/delete any message
- **Customers/Suppliers**: Can only edit/delete their own messages
- **Everyone**: Can see non-internal messages

Set `canPostInternal={user?.role === 'Admin'}` to enable internal message checkbox.

## ThreadId Naming Convention

Use the pattern: `${EntityType}-${EntityId}`

Examples:
- `RFQ-550e8400-e29b-41d4-a716-446655440000`
- `PurchaseOrder-550e8400-e29b-41d4-a716-446655440000`
- `ProformaInvoice-550e8400-e29b-41d4-a716-446655440000`
- `DeliveryOrder-550e8400-e29b-41d4-a716-446655440000`
- `Ticket-550e8400-e29b-41d4-a716-446655440000`
- `Quotation-550e8400-e29b-41d4-a716-446655440000`
