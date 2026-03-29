import { api } from '@/lib/api'
import type { PagedResult } from '@/types/api'

export interface CustomerDto {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  createdAt: string
}

export interface CustomerDetailDto extends CustomerDto {
  mappedSupplierItems: CustomerSupplierItemDto[]
}

export interface CustomerSupplierItemDto {
  mappingId: string
  supplierItemId: string
  supplierItemName: string
  supplierName: string
}

export interface CreateCustomerPayload {
  name: string
  contactEmail?: string
  contactPhone?: string
}

export interface UpdateCustomerPayload {
  name: string
  contactEmail?: string
  contactPhone?: string
}

export const customerApi = {
  list: (params: { search?: string; page: number; pageSize: number }) =>
    api.get<PagedResult<CustomerDto>>('/customers', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<CustomerDetailDto>(`/customers/${id}`).then((r) => r.data),

  create: (payload: CreateCustomerPayload) =>
    api.post<string>('/customers', payload).then((r) => r.data),

  update: (id: string, payload: UpdateCustomerPayload) =>
    api.put(`/customers/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/customers/${id}`),

  mapSupplierItem: (customerId: string, supplierItemId: string) =>
    api.post<string>(`/customers/${customerId}/supplier-items/${supplierItemId}`).then((r) => r.data),

  unmapSupplierItem: (mappingId: string) =>
    api.delete(`/customers/supplier-item-mappings/${mappingId}`),
}
