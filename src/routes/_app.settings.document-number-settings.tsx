import { createFileRoute } from '@tanstack/react-router'
import { DocumentNumberSettingsPage } from '@/features/admin/pages/DocumentNumberSettingsPage'

export const Route = createFileRoute('/_app/settings/document-number-settings')({
  component: DocumentNumberSettingsPage,
})
