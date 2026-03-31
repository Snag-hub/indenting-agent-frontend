import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/dashboard')({
  component: lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage }))),
})
