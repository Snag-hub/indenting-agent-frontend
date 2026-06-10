import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const threadsSearchSchema = z.object({
  threadId: z.string().optional(),
})

export const Route = createFileRoute('/_app/threads')({
  validateSearch: threadsSearchSchema,
  component: lazy(() =>
    import('@/features/threads/pages/ThreadsPage').then((m) => ({
      default: m.ThreadsPage,
    }))
  ),
})
