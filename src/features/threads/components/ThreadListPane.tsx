import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { ThreadSummaryDto } from '@/features/threads/api/threadApi'
import { formatDistanceToNow } from 'date-fns'
import { Building2, ExternalLink, Loader2, MessageSquare, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

// Maps entityType → TanStack Router route (same pattern as notifications)
const ENTITY_ROUTES: Record<string, string> = {
  Enquiry: '/enquiries/$id',
  RFQ: '/rfqs/$id',
  Quotation: '/quotations/$id',
  PurchaseOrder: '/purchase-orders/$id',
  ProformaInvoice: '/proforma-invoices/$id',
  DeliveryOrder: '/delivery-orders/$id',
  Payment: '/payments/$id',
  Ticket: '/tickets/$id',
}

const entityTypeBadgeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PurchaseOrder: 'default',
  DeliveryOrder: 'secondary',
  ProformaInvoice: 'outline',
  RFQ: 'default',
  Enquiry: 'secondary',
  Quotation: 'default',
  Ticket: 'destructive',
}

function PartyBadge({ role, name }: { role?: string; name?: string }) {
  if (!role || !name) return null
  const isCustomer = role === 'Customer'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        isCustomer
          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      }`}
    >
      {isCustomer ? <Building2 className="h-3 w-3" /> : <Store className="h-3 w-3" />}
      {name}
    </span>
  )
}

interface ThreadListPaneProps {
  threads: ThreadSummaryDto[]
  selectedThreadId: string | null
  onSelectThread: (threadId: string) => void
  isLoading: boolean
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

function ThreadSkeleton() {
  return (
    <div className="border-b p-4 space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

export function ThreadListPane({
  threads,
  selectedThreadId,
  onSelectThread,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: ThreadListPaneProps) {
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    const scrollEl = scrollRef.current
    if (!sentinel || !scrollEl) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: scrollEl, rootMargin: '150px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <ThreadSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
        <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
        <h3 className="font-medium text-foreground mb-1">No conversations yet</h3>
        <p className="text-sm text-center">Conversations from your documents will appear here</p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
      {threads.map((thread) => {
        const isUnread = thread.unreadCount > 0
        const isSelected = selectedThreadId === thread.threadId
        const docRoute = ENTITY_ROUTES[thread.entityType]

        return (
          <button
            key={thread.threadId}
            onClick={() => onSelectThread(thread.threadId)}
            className={cn(
              'w-full text-left border-b px-4 py-3 transition-colors',
              // Selected state
              isSelected && 'bg-accent',
              // Unread — blue tint when not selected
              !isSelected && isUnread && 'bg-blue-50 hover:bg-blue-100',
              // Normal read state
              !isSelected && !isUnread && 'hover:bg-accent',
            )}
          >
            <div className="space-y-1.5">
              {/* Row 1: entity type badge + doc number + unread count */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={entityTypeBadgeColors[thread.entityType] || 'outline'} className="shrink-0">
                  {thread.entityType}
                </Badge>

                {/* Doc number — clickable chip that navigates directly to the document */}
                {thread.entityDocumentNumber && docRoute ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate({ to: docRoute, params: { id: thread.entityId } })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        navigate({ to: docRoute, params: { id: thread.entityId } })
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                    title={`Open ${thread.entityType}`}
                  >
                    {thread.entityDocumentNumber}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </span>
                ) : (
                  <span className="text-xs font-mono text-muted-foreground">
                    {thread.entityDocumentNumber || thread.entityId}
                  </span>
                )}

                {/* Unread badge — pushed to the right */}
                {isUnread && (
                  <Badge variant="destructive" className="ml-auto shrink-0">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>

              {/* Row 2: opposing party */}
              <PartyBadge role={thread.entityPartyRole} name={thread.entityPartyName} />

              {/* Row 3: entity title if present */}
              {thread.entityTitle && (
                <p className={cn('text-sm truncate', isUnread ? 'font-semibold text-slate-900' : 'font-medium')}>
                  {thread.entityTitle}
                </p>
              )}

              {/* Row 4: last message preview */}
              {thread.lastMessagePreview && (
                <p className={cn(
                  'text-xs line-clamp-1',
                  isUnread ? 'text-slate-700 font-medium' : 'text-muted-foreground',
                )}>
                  {thread.lastMessagePreview}
                </p>
              )}

              {/* Row 5: timestamp + message count */}
              <div className="flex items-center justify-between pt-0.5">
                <span className={cn('text-xs', isUnread ? 'text-slate-600 font-medium' : 'text-muted-foreground')}>
                  {thread.lastMessageAt
                    ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
                    : 'Just now'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {thread.messageCount} msg{thread.messageCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </button>
        )
      })}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-3 flex justify-center">
        {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!hasNextPage && threads.length > 0 && (
          <p className="text-xs text-muted-foreground">All conversations loaded</p>
        )}
      </div>
    </div>
  )
}
