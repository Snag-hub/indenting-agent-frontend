import { createFileRoute } from '@tanstack/react-router'
import { AuditLogsPage } from '@/features/audit/pages/AuditLogsPage'

export const Route = createFileRoute('/_app/audit-logs')({
  component: AuditLogsPage,
})
