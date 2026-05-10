import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import { ThreadPanel } from './ThreadPanel'
import { threadApi } from '../api/threadApi'

interface ThreadDrawerButtonProps {
  entityType: string
  entityId: string
  size?: 'sm' | 'lg'
}

export function ThreadDrawerButton({ entityType, entityId, size = 'sm' }: ThreadDrawerButtonProps) {
  const [open, setOpen] = useState(false)
  const threadId = `${entityType}-${entityId}`

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['threadUnreadCount', threadId],
    queryFn: () => threadApi.getUnreadCount(entityType, entityId),
  })

  return (
    <>
      <Button
        variant="ghost"
        size={size === 'lg' ? 'default' : size}
        onClick={() => setOpen(true)}
        className="relative"
      >
        <MessageSquare className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Discussion</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ThreadPanel threadId={threadId} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
