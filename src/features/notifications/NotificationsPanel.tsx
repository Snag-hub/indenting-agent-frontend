import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { notificationApi, type NotificationDto } from '@/features/notifications/api/notificationApi'
import { useNotificationStore } from '@/stores/notificationStore'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CheckCheck, Trash2 } from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function groupNotificationsByDate(notifications: NotificationDto[]) {
  const today: NotificationDto[] = []
  const yesterday: NotificationDto[] = []
  const thisWeek: NotificationDto[] = []
  const older: NotificationDto[] = []

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt)
    if (isToday(date)) {
      today.push(notification)
    } else if (isYesterday(date)) {
      yesterday.push(notification)
    } else if (isThisWeek(date)) {
      thisWeek.push(notification)
    } else {
      older.push(notification)
    }
  })

  return [
    { label: 'Today', notifications: today },
    { label: 'Yesterday', notifications: yesterday },
    { label: 'This Week', notifications: thisWeek },
    { label: 'Older', notifications: older },
  ].filter((group) => group.notifications.length > 0)
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setUnreadCount } = useNotificationStore()
  const [swipeStates, setSwipeStates] = useState<Record<string, number>>({})
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationApi.list(1, 50, false),
    enabled: isOpen,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
      setUnreadCount(0)
    },
  })

  const deleteNotification = useMutation({
    mutationFn: (id: string) => {
      // Find the notification being deleted to check if it's unread
      const notifToDelete = notifications.find((n) => n.id === id)
      return notificationApi.delete(id).then(() => ({ wasUnread: notifToDelete && !notifToDelete.isRead }))
    },
    onSuccess: (data) => {
      // Update unread count if deleted notification was unread
      if (data.wasUnread) {
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })

  const clearAll = useMutation({
    mutationFn: () => notificationApi.clearAll(),
    onSuccess: () => {
      // Everything visible is now cleared; the unread count goes to zero.
      setUnreadCount(0)
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })


  const notifications = notificationsData?.data ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const groupedNotifications = groupNotificationsByDate(notifications)

  const handleNotificationClick = (notification: NotificationDto) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id)
    }

    // Navigate based on entityType
    if (notification.entityType && notification.entityId) {
      const routes: Record<string, string> = {
        'Enquiry': '/enquiries/$id',
        'RFQ': '/rfqs/$id',
        'Quotation': '/quotations/$id',
        'PurchaseOrder': '/purchase-orders/$id',
        'ProformaInvoice': '/proforma-invoices/$id',
        'DeliveryOrder': '/delivery-orders/$id',
        'Payment': '/payments/$id',
        'Ticket': '/tickets/$id',
      }

      const route = routes[notification.entityType]
      if (route) {
        navigate({ to: route, params: { id: notification.entityId } })
        onClose()
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0]
    setSwipeStates((prev) => ({
      ...prev,
      [notificationId]: touch.clientX,
    }))
  }

  const handleTouchMove = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0]
    const startX = swipeStates[notificationId] ?? 0
    const diff = startX - touch.clientX

    // Update swipe state with current position (negative values = swiping left)
    if (diff > 0) {
      setSwipeStates((prev) => ({
        ...prev,
        [notificationId]: -diff, // Negative value indicates swiping
      }))
    }
  }

  const handleTouchEnd = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.changedTouches[0]
    const startX = Math.abs(swipeStates[notificationId] ?? 0)
    const endX = touch.clientX
    const diff = startX - endX

    // Swiped left more than 50px - delete notification
    if (diff > 50) {
      deleteNotification.mutate(notificationId)
    }

    // Clear swipe state
    setSwipeStates((prev) => {
      const newState = { ...prev }
      delete newState[notificationId]
      return newState
    })
  }

  return (
    <div className="flex flex-col h-full w-full">
      {notifications.length > 0 && (
        <div className="p-4 border-b bg-slate-50 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {unreadCount > 0 ? `${unreadCount} unread` : `${notifications.length} notifications`}
            </span>
            <p className="text-xs text-slate-600">Swipe left to dismiss</p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex-1"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearAllDialogOpen(true)}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear drawer
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No notifications</div>
        ) : (
          <div>
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                {/* Date Group Header */}
                <div className="sticky top-0 bg-slate-100 px-4 py-2 z-10 border-b">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {group.label}
                  </p>
                </div>

                {/* Notifications in group */}
                {group.notifications.map((notification) => {
                  const swipeAmount = swipeStates[notification.id] ?? 0
                  const isSwiping = swipeAmount < 0
                  return (
                    <div
                      key={notification.id}
                      className="relative overflow-hidden bg-white border-b"
                      onTouchStart={(e) => handleTouchStart(e, notification.id)}
                      onTouchMove={(e) => handleTouchMove(e, notification.id)}
                      onTouchEnd={(e) => handleTouchEnd(e, notification.id)}
                    >
                      {/* Swipe background (delete action) - only show when swiping */}
                      {isSwiping && (
                        <div className="absolute inset-y-0 right-0 bg-red-500 flex items-center justify-center w-20">
                          <Trash2 className="h-4 w-4 text-white" />
                        </div>
                      )}

                      {/* Main notification content */}
                      <div
                        className={cn(
                          'relative px-4 py-3 cursor-pointer transition-all border-b',
                          !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                        )}
                        style={{
                          transform: isSwiping ? `translateX(${swipeAmount * 0.3}px)` : 'translateX(0)',
                          transition: !isSwiping ? 'transform 0.2s ease-out' : 'none',
                        }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm line-clamp-3',
                              !notification.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                            )}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification.mutate(notification.id)
                              }}
                              disabled={deleteNotification.isPending}
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Confirmation Dialog */}
      <ConfirmDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title="Clear All Notifications"
        description="Dismiss every notification in this drawer. They stay in the database for 30 days for audit and will then be automatically deleted."
        confirmLabel="Clear All"
        isLoading={clearAll.isPending}
        variant="default"
        onConfirm={() => {
          clearAll.mutate(undefined, {
            onSettled: () => {
              setClearAllDialogOpen(false)
            },
          })
        }}
      />
    </div>
  )
}
