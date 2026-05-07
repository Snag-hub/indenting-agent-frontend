import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/threads')({
  component: lazy(() =>
    import('@/features/threads/pages/ThreadsPage').then((m) => ({
      default: m.ThreadsPage,
    }))
  ),
})
