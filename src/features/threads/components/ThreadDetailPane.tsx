import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThreadPanel } from '@/features/threads/components/ThreadPanel'
import { AttachmentPanel } from '@/components/AttachmentPanel'
import { threadApi, type ThreadSummaryDto } from '@/features/threads/api/threadApi'
import { queryKeys } from '@/lib/queryKeys'
import { X } from 'lucide-react'

const entityTypeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PurchaseOrder: 'default',
  DeliveryOrder: 'secondary',
  ProformaInvoice: 'outline',
  RFQ: 'default',
  Enquiry: 'secondary',
  Quotation: 'default',
  Ticket: 'destructive',
}

interface ThreadDetailPaneProps {
  thread: ThreadSummaryDto
  onClose: () => void
  canPostInternal: boolean
}

export function ThreadDetailPane({
  thread,
  onClose,
  canPostInternal,
}: ThreadDetailPaneProps) {
  const qc = useQueryClient()

  const markAsRead = useMutation({
    mutationFn: () => threadApi.markAsRead(thread.threadId),
    onSuccess: () => {
      // Invalidate threads list to refresh unread counts
      qc.invalidateQueries({ queryKey: queryKeys.threads.list() })
    },
  })

  // Mark thread as read when opened
  useEffect(() => {
    if (thread.unreadCount > 0) {
      markAsRead.mutate()
    }
  }, [thread.threadId])

  return (
    <div className="border rounded-lg bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 space-y-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={entityTypeColors[thread.entityType] || 'outline'}>
                {thread.entityType}
              </Badge>
              <span className="text-sm font-mono text-muted-foreground">
                {thread.entityDocumentNumber}
              </span>
            </div>
            <h2 className="text-lg font-semibold">
              {thread.entityTitle || thread.entityDocumentNumber || thread.entityId}
            </h2>
            {thread.entityPartyName && (
              <p className="text-sm text-muted-foreground">{thread.entityPartyName}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content: Split into Message and Attachments */}
      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden p-4">
        {/* Left: ThreadPanel (Messages) */}
        <div className="col-span-2 overflow-hidden">
          <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
            <ThreadPanel
              threadId={thread.threadId}
              title={`${thread.entityType} ${thread.entityDocumentNumber}`}
              canPostInternal={canPostInternal}
            />
          </Card>
        </div>

        {/* Right: AttachmentPanel */}
        <div className="col-span-1 overflow-hidden">
          <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attachments</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <AttachmentPanel
                entityType={thread.entityType}
                entityId={thread.entityId}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
