import { api } from '@/lib/api'
import type { PagedResult } from '@/types/api'

export interface CustomerItemDto {
  id: string
  masterItemId?: string
  supplierItemId?: string
  resolvedName: string
  customName?: string
  customDescription?: string
  supplierName?: string
  isActive: boolean
}

export interface CreateCustomerItemInput {
  masterItemId?: string
  supplierItemId?: string
  customName?: string
  customDescription?: string
}

export interface UpdateCustomerItemInput {
  customName?: string
  customDescription?: string
}

export const customerItemApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<PagedResult<CustomerItemDto>>('/my/customer-items', { params }).then(r => r.data),
  
  create: (input: CreateCustomerItemInput) =>
    api.post<string>('/my/customer-items', input).then(r => r.data),
  
  update: (id: string, input: UpdateCustomerItemInput) =>
    api.put(`/my/customer-items/${id}`, input).then(r => r.data),
  
  remove: (id: string) =>
    api.delete(`/my/customer-items/${id}`).then(r => r.data),
}
