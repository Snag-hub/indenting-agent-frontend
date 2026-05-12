import { api } from '@/lib/api'
import type { PagedResult } from '@/types/api'

export type OrganisationType = 'Admin' | 'Customer' | 'Supplier'
export type UserStatus = 'Invited' | 'Active' | 'Disabled'

export interface EmployeeSummaryDto {
  id: string
  email: string
  fullName: string
  role: string
  organisationType: OrganisationType
  customerId: string | null
  customerName: string | null
  supplierId: string | null
  supplierName: string | null
  isOrgAdmin: boolean
  status: UserStatus
  createdAt: string
}

export interface EmployeeDetailDto extends EmployeeSummaryDto {
  modifiedAt: string | null
  latestInviteExpiresAt: string | null
  latestInviteAcceptedAt: string | null
}

export interface BrowseEmployeesParams {
  search?: string
  role?: string
  status?: UserStatus
  organisationType?: OrganisationType
  customerId?: string
  supplierId?: string
  page?: number
  pageSize?: number
}

export interface CreateEmployeePayload {
  email: string
  fullName: string
  role: string
  organisationType: OrganisationType
  customerId?: string | null
  supplierId?: string | null
  isOrgAdmin: boolean
}

export interface UpdateEmployeePayload {
  fullName: string
  isOrgAdmin: boolean
}

function makeClient(rootPath: string) {
  return {
    list: (params: BrowseEmployeesParams) =>
      api.get<PagedResult<EmployeeSummaryDto>>(rootPath, { params }).then((r) => r.data),
    get: (id: string) =>
      api.get<EmployeeDetailDto>(`${rootPath}/${id}`).then((r) => r.data),
    create: (payload: CreateEmployeePayload) =>
      api.post<string>(rootPath, payload).then((r) => r.data),
    update: (id: string, payload: UpdateEmployeePayload) =>
      api.put(`${rootPath}/${id}`, payload),
    deactivate: (id: string) => api.post(`${rootPath}/${id}/deactivate`),
    reactivate: (id: string) => api.post(`${rootPath}/${id}/reactivate`),
    resendInvite: (id: string) => api.post(`${rootPath}/${id}/resend-invite`),
    delete: (id: string) => api.delete(`${rootPath}/${id}`),
  }
}

export const usersApi = makeClient('/admin/users')
export const myEmployeesApi = makeClient('/my/employees')

export const authApi = {
  acceptInvite: (payload: { token: string; password: string; fullName?: string }) =>
    api.post('/auth/accept-invite', payload),
}
