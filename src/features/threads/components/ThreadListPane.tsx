import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ThreadSummaryDto } from '@/features/threads/api/threadApi'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'

const entityTypeBadgeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PurchaseOrder: 'default',
  DeliveryOrder: 'secondary',
  ProformaInvoice: 'outline',
  RFQ: 'default',
  Enquiry: 'secondary',
  Quotation: 'default',
  Ticket: 'destructive',
}

interface ThreadListPaneProps {
  threads: ThreadSummaryDto[]
  selectedThreadId: string | null
  onSelectThread: (threadId: string) => void
  isLoading: boolean
  page: number
  totalCount: number
  onPageChange: (page: number) => void
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
  page,
  totalCount,
  onPageChange,
}: ThreadListPaneProps) {
  const pageSize = 20
  const maxPage = Math.ceil(totalCount / pageSize)

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
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
        <p className="text-sm text-center">
          Conversations from your documents will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <button
            key={thread.threadId}
            onClick={() => onSelectThread(thread.threadId)}
            className={`w-full text-left border-b px-4 py-3 hover:bg-accent transition-colors ${
              selectedThreadId === thread.threadId ? 'bg-accent' : ''
            }`}
          >
            <div className="space-y-2">
              {/* Header: Entity Type Badge + Document Number */}
              <div className="flex items-center gap-2">
                <Badge variant={entityTypeBadgeColors[thread.entityType] || 'outline'}>
                  {thread.entityType}
                </Badge>
                <span className="text-sm font-mono">
                  {thread.entityDocumentNumber || thread.entityId}
                </span>
                {thread.unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {thread.unreadCount}
                  </Badge>
                )}
              </div>

              {/* Entity Title */}
              {thread.entityTitle && (
                <p className="text-sm font-medium truncate">{thread.entityTitle}</p>
              )}

              {/* Last Message Preview */}
              {thread.lastMessagePreview && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {thread.lastMessagePreview}
                </p>
              )}

              {/* Last Activity Time */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {thread.lastMessageAt
                    ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
                    : 'Just now'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {maxPage > 1 && (
        <div className="border-t p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {maxPage}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === maxPage}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
