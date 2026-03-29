import { api } from '@/lib/api'
import type { PagedResult } from '@/types/api'

export interface SupplierItemSummaryDto {
  id: string
  name: string
  description: string | null
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  supplierName: string
  createdAt: string
}

export interface SupplierItemDetailDto extends SupplierItemSummaryDto {
  masterItemId: string | null
  masterItemName: string | null
  variants: ItemVariantDto[]
}

export interface ItemVariantDto {
  id: string
  sku: string
  values: { dimensionName: string; valueName: string }[]
}

export interface CreateSupplierItemPayload {
  name: string
  description?: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
}

export interface UpdateSupplierItemPayload {
  name: string
  description?: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
}

export const supplierItemApi = {
  mine: (params: { search?: string; page: number; pageSize: number }) =>
    api.get<PagedResult<SupplierItemSummaryDto>>('/my/supplier-items', { params }).then((r) => r.data),

  browse: (params: { search?: string; page: number; pageSize: number; supplierId?: string }) =>
    api.get<PagedResult<SupplierItemSummaryDto>>('/supplier-items/browse', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<SupplierItemDetailDto>(`/supplier-items/${id}`).then((r) => r.data),

  create: (payload: CreateSupplierItemPayload) =>
    api.post<string>('/my/supplier-items', payload).then((r) => r.data),

  update: (id: string, payload: UpdateSupplierItemPayload) =>
    api.put(`/my/supplier-items/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/my/supplier-items/${id}`),

  linkToMaster: (supplierItemId: string, masterItemId: string) =>
    api.post(`/supplier-items/${supplierItemId}/link-master/${masterItemId}`),

  unlinkFromMaster: (supplierItemId: string) =>
    api.delete(`/supplier-items/${supplierItemId}/unlink-master`),
}
