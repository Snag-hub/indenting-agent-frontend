import { createFileRoute } from '@tanstack/react-router'
import { NotificationPreferencesPage } from '@/features/settings/pages/NotificationPreferencesPage'

export const Route = createFileRoute('/_app/settings/notification-preferences')({
  component: NotificationPreferencesPage,
})
