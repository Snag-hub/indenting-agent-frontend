import { api } from '@/lib/api'
import type { PagedResult } from '@/types/api'

export interface ItemSummary {
  id: string
  name: string
  categoryId: string | null
  categoryName: string | null
  isActive: boolean
  createdAt: string
}

export interface ItemDetail extends ItemSummary {
  description: string | null
  variants: {
    id: string
    sku: string | null
    values: { dimensionId: string; dimensionName: string; dimensionValueId: string; value: string }[]
  }[]
}

export interface AddVariantPayload {
  sku?: string | null
  values: { dimensionId: string; dimensionValueId: string }[]
}

export const itemApi = {
  list: (params?: { categoryId?: string; page?: number; pageSize?: number }) =>
    api.get<PagedResult<ItemSummary>>('/catalog/items', { params }).then((r) => r.data),
  getById: (id: string) => api.get<ItemDetail>(`/catalog/items/${id}`).then((r) => r.data),
  create: (data: { name: string; categoryId?: string; description?: string }) =>
    api.post<string>('/catalog/items', data).then((r) => r.data),
  update: (id: string, data: { name: string; categoryId?: string | null; description?: string | null }) =>
    api.put(`/catalog/items/${id}`, data),
  delete: (id: string) => api.delete(`/catalog/items/${id}`),
  addVariant: (itemId: string, payload: AddVariantPayload) =>
    api.post<string>(`/catalog/items/${itemId}/variants`, payload).then((r) => r.data),
  removeVariant: (variantId: string) => api.delete(`/catalog/items/variants/${variantId}`),
}
