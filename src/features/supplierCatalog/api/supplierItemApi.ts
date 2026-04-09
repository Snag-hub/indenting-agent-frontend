import { api } from '@/lib/api'
import type { PagedResult } from '@/types/api'

export interface SupplierItemVariantValueDto {
  dimensionId: string
  dimensionName: string
  dimensionValueId: string
  value: string
}

export interface SupplierItemVariantDto {
  id: string
  sku: string | null
  values: SupplierItemVariantValueDto[]
}

export interface SupplierItemVariantSummaryDto {
  id: string
  sku: string | null
  dimensionSummary: string
}

export interface SupplierItemSummaryDto {
  id: string
  supplierId: string
  supplierName: string
  name: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  itemId: string | null
  masterItemName: string | null
  categoryId: string | null
  categoryName: string | null
  createdAt: string
}

export interface SupplierItemDetailDto {
  id: string
  supplierId: string
  supplierName: string
  name: string
  description: string | null
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  itemId: string | null
  masterItemName: string | null
  categoryId: string | null
  categoryName: string | null
  variants: SupplierItemVariantDto[]
  createdAt: string
}

export interface CreateSupplierItemPayload {
  name: string
  description?: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  categoryId?: string | null
}

export interface UpdateSupplierItemPayload {
  name: string
  description?: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  categoryId?: string | null
}

export interface AddVariantPayload {
  sku?: string | null
  values: { dimensionId: string; dimensionValueId: string }[]
}

export const supplierItemApi = {
  mine: (params: { search?: string; categoryId?: string; page: number; pageSize: number }) =>
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

  addVariant: (supplierItemId: string, payload: AddVariantPayload) =>
    api.post<string>(`/my/supplier-items/${supplierItemId}/variants`, payload).then((r) => r.data),

  removeVariant: (variantId: string) =>
    api.delete(`/my/supplier-items/variants/${variantId}`),

  getVariants: (id: string) =>
    api.get<SupplierItemVariantSummaryDto[]>(`/supplier-items/${id}/variants`).then((r) => r.data),
}
