import { createFileRoute } from '@tanstack/react-router'
import { NotificationsListPage } from '@/features/notifications/pages/NotificationsListPage'

export const Route = createFileRoute('/_app/notifications')({
  component: NotificationsListPage,
})
