import { api } from '@/lib/api'

export interface AuditLogDto {
  id: string
  entityType: string
  entityId: string
  action: string
  oldValue?: string | null
  newValue?: string | null
  changedById: string
  changedByName?: string | null
  changedAt: string
}

export interface AuditLogsPagedResult {
  data: AuditLogDto[]
  totalCount: number
  page: number
  pageSize: number
}

export const auditApi = {
  /**
   * GET /api/v1/audit-logs
   * Paginated list of all audit logs (Admin only).
   */
  list: (params: {
    page?: number
    pageSize?: number
    entityType?: string
    entityId?: string
    from?: string
    to?: string
  } = {}): Promise<AuditLogsPagedResult> =>
    api.get<AuditLogsPagedResult>('/audit-logs', { params }).then((r) => r.data),

  /**
   * GET /api/v1/audit-logs/{entityType}/{entityId}
   * Full audit history for a single entity (Admin only).
   */
  getEntityHistory: (entityType: string, entityId: string): Promise<AuditLogDto[]> =>
    api.get<AuditLogDto[]>(`/audit-logs/${entityType}/${entityId}`).then((r) => r.data),
}
