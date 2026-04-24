import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { notificationApi, type NotificationDto } from '@/lib/notificationApi'
import { useNotificationStore } from '@/stores/notificationStore'
import { Button } from '@/components/ui/button'
import { CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setUnreadCount } = useNotificationStore()

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationApi.list({ pageSize: 50 }),
    enabled: isOpen,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
      setUnreadCount(0)
    },
  })

  const notifications = notificationsData?.data ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleNotificationClick = (notification: NotificationDto) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id)
    }

    // Navigate based on entityType
    if (notification.entityType && notification.entityId) {
      const routes: Record<string, string> = {
        'Quotation': '/quotations/$id',
        'RFQ': '/rfqs/$id',
        'PurchaseOrder': '/purchase-orders/$id',
        'ProformaInvoice': '/proforma-invoices/$id',
        'DeliveryOrder': '/delivery-orders/$id',
        'Payment': '/payments/$id',
      }

      const route = routes[notification.entityType]
      if (route) {
        navigate({ to: route, params: { id: notification.entityId } })
        onClose()
      }
    }
  }

  return (
    <div className="w-96 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Notifications</h2>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No notifications</div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 cursor-pointer hover:bg-accent transition-colors border-0',
                  !notification.isRead && 'bg-blue-50'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
