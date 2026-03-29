import { api } from '@/lib/api'
import type { PagedResult } from '@/types/api'

export interface SupplierDto {
  id: string
  name: string
  contactEmail: string | null
  contactPhone: string | null
  createdAt: string
}

export interface SupplierDetailDto extends SupplierDto {
  itemCount: number
}

export interface CreateSupplierPayload {
  name: string
  contactEmail?: string
  contactPhone?: string
}

export interface UpdateSupplierPayload {
  name: string
  contactEmail?: string
  contactPhone?: string
}

export const supplierApi = {
  list: (params: { search?: string; page: number; pageSize: number }) =>
    api.get<PagedResult<SupplierDto>>('/suppliers', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<SupplierDetailDto>(`/suppliers/${id}`).then((r) => r.data),

  create: (payload: CreateSupplierPayload) =>
    api.post<string>('/suppliers', payload).then((r) => r.data),

  update: (id: string, payload: UpdateSupplierPayload) =>
    api.put(`/suppliers/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/suppliers/${id}`),
}
