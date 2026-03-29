import { api } from '@/lib/api'

export interface PriceTierDto {
  id: string
  minQty: number
  maxQty: number | null
  unitPrice: number
  currency: string
  effectiveFrom: string
  effectiveTo: string | null
}

export interface CustomerPriceTierDto {
  id: string
  customerId: string
  customerName: string
  minQty: number
  maxQty: number | null
  unitPrice: number
  currency: string
}

export interface PriceResolutionDto {
  unitPrice: number
  currency: string
  tierType: 'customer' | 'base'
  minQty: number
  maxQty: number | null
}

export interface AddBaseTierPayload {
  minQty: number
  maxQty?: number
  unitPrice: number
  currency: string
  effectiveFrom: string
  effectiveTo?: string
}

export interface AddCustomerTierPayload {
  customerId: string
  minQty: number
  maxQty?: number
  unitPrice: number
  currency: string
}

export const pricingApi = {
  getBaseTiers: (supplierItemId: string) =>
    api.get<PriceTierDto[]>(`/my/supplier-items/${supplierItemId}/price-tiers`).then((r) => r.data),

  addBaseTier: (supplierItemId: string, payload: AddBaseTierPayload) =>
    api.post<string>(`/my/supplier-items/${supplierItemId}/price-tiers`, payload).then((r) => r.data),

  updateBaseTier: (id: string, payload: Omit<AddBaseTierPayload, 'currency'> & { currency: string }) =>
    api.put(`/my/price-tiers/${id}`, payload),

  deleteBaseTier: (id: string) =>
    api.delete(`/my/price-tiers/${id}`),

  getCustomerTiers: (supplierItemId: string, customerId?: string) =>
    api.get<CustomerPriceTierDto[]>(`/my/supplier-items/${supplierItemId}/customer-price-tiers`, {
      params: customerId ? { customerId } : undefined,
    }).then((r) => r.data),

  addCustomerTier: (supplierItemId: string, payload: AddCustomerTierPayload) =>
    api.post<string>(`/my/supplier-items/${supplierItemId}/customer-price-tiers`, payload).then((r) => r.data),

  updateCustomerTier: (id: string, payload: Omit<AddCustomerTierPayload, 'customerId'>) =>
    api.put(`/my/customer-price-tiers/${id}`, payload),

  deleteCustomerTier: (id: string) =>
    api.delete(`/my/customer-price-tiers/${id}`),

  resolvePrice: (supplierItemId: string, customerId: string, quantity: number) =>
    api.get<PriceResolutionDto>('/pricing/resolve', {
      params: { supplierItemId, customerId, quantity },
    }).then((r) => r.data),
}
