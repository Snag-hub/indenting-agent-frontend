import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/reports')({
  component: lazy(() =>
    import('@/features/reports/pages/ReportsPage').then((m) => ({
      default: m.ReportsPage,
    }))
  ),
})
