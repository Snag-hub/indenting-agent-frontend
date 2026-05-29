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
  quantityTiers: number[]
}

export interface SupplierItemVariantSummaryDto {
  id: string
  sku: string | null
  dimensionSummary: string
  quantityTiers: number[]
}

export interface EnquirySupplierItemVariantDto {
  id: string
  sku: string | null
  dimensionSummary: string
  enquiryQuantity: number
  allocatedQuantity: number
  remainingQuantity: number
  quantityTiers: number[]
}

export interface SupplierItemSummaryDto {
  id: string
  supplierId: string
  supplierName: string
  name: string
  documentNumber: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  itemId: string | null
  masterItemName: string | null
  categoryId: string | null
  categoryName: string | null
  createdAt: string
  quantityTiers: number[]
  hasVariants: boolean
}

export interface SupplierItemDetailDto {
  id: string
  supplierId: string
  supplierName: string
  name: string
  documentNumber: string
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
  quantityTiers: number[]
}

export interface CreateSupplierItemPayload {
  name: string
  description?: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  categoryId?: string | null
  quantityTiers?: number[]
}

export interface UpdateSupplierItemPayload {
  name: string
  description?: string
  minOrderQty: number
  batchSize: number
  leadTimeDays: number
  categoryId?: string | null
  quantityTiers?: number[]
}

export interface AddVariantPayload {
  sku?: string | null
  values: { dimensionId: string; dimensionValueId: string }[]
  quantityTiers?: number[]
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

  setItemQuantityTiers: (itemId: string, quantityTiers: number[]) =>
    api.put(`/my/supplier-items/${itemId}/quantity-tiers`, { quantityTiers }),

  setVariantQuantityTiers: (variantId: string, quantityTiers: number[]) =>
    api.put(`/my/supplier-items/variants/${variantId}/quantity-tiers`, { quantityTiers }),

  getVariants: (id: string) =>
    api.get<SupplierItemVariantSummaryDto[]>(`/supplier-items/${id}/variants`).then((r) => r.data),

  getEnquiryVariants: (supplierItemId: string, enquiryId: string) =>
    api.get<EnquirySupplierItemVariantDto[]>(`/supplier-items/${supplierItemId}/variants/by-enquiry/${enquiryId}`).then((r) => r.data),
}
