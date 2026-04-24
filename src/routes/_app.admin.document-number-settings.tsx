import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/admin/document-number-settings')({
  component: lazy(() =>
    import('@/features/admin/pages/DocumentNumberSettingsPage').then(m => ({
      default: m.DocumentNumberSettingsPage,
    }))
  ),
})
