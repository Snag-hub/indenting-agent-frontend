import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AcceptInvitePage } from '@/features/users/pages/AcceptInvitePage'

const search = z.object({ token: z.string().optional() })

export const Route = createFileRoute('/_auth/accept-invite')({
  validateSearch: search,
  component: AcceptInvitePage,
})
