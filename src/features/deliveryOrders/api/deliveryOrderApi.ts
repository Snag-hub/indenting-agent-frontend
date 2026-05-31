import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface DeliveryOrderItemVariantDto {
  id: string;
  supplierItemVariantId: string;
  dimensionSummary?: string | null;
  sku?: string | null;
  quantity: number;
}

export interface DeliveryOrderItemDto {
  id: string;
  supplierItemId: string;
  supplierItemName: string;
  quantity?: number;
  sku?: string;
  quantityDispatched: number;
  notes?: string;
  variants?: DeliveryOrderItemVariantDto[] | null;
}

export interface DeliveryOrderSummaryDto {
  id: string;
  proformaInvoiceId: string;
  purchaseOrderId: string;
  documentNumber: string;
  supplierName: string;
  status: string;
  createdAt: string;
}

export interface DeliveryOrderDetailDto {
  id: string;
  proformaInvoiceId: string;
  proformaInvoiceDocumentNumber: string;
  purchaseOrderId: string;
  purchaseOrderDocumentNumber: string;
  customerId: string;
  customerName?: string;
  supplierId: string;
  documentNumber: string;
  notes?: string;
  supplierName: string;
  supplierAddress?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  poReference?: string;
  status: string;
  items: DeliveryOrderItemDto[];

  // Monetary totals (resolved from PO pricing via PI, then MoneyCalculator)
  subtotal: number;
  discountAmount: number;
  discountPercent?: number | null;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency?: string | null;

  createdAt: string;
}

export const deliveryOrderApi = {
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<DeliveryOrderSummaryDto>>("/delivery-orders", { params })
      .then((r) => r.data),

  create: (data: {
    proformaInvoiceId: string;
    notes?: string;
    items: {
      supplierItemId: string;
      quantityDispatched: number;
      notes?: string;
      variants?: { supplierItemVariantId: string; quantityDispatched: number }[];
    }[];
  }) => api.post<string>("/delivery-orders", data).then((r) => r.data),

  get: (id: string) =>
    api
      .get<DeliveryOrderDetailDto>(`/delivery-orders/${id}`)
      .then((r) => r.data),

  dispatch: (id: string) => api.post(`/delivery-orders/${id}/dispatch`),

  deliver: (id: string) => api.post(`/delivery-orders/${id}/deliver`),

  cancel: (id: string) => api.post(`/delivery-orders/${id}/cancel`),

  delete: (id: string) => api.delete(`/delivery-orders/${id}`),

  // Lot tracking ---------------------------------------------------------

  listLots: (deliveryOrderId: string) =>
    api
      .get<DeliveryOrderItemLotsDto[]>(`/delivery-orders/${deliveryOrderId}/lots`)
      .then((r) => r.data),

  addLot: (deliveryOrderId: string, itemId: string, payload: AddLotInput) =>
    api
      .post<string>(`/delivery-orders/${deliveryOrderId}/items/${itemId}/lots`, payload)
      .then((r) => r.data),

  updateLot: (lotId: string, payload: UpdateLotInput) =>
    api.put(`/delivery-orders/lots/${lotId}`, payload),

  removeLot: (lotId: string) => api.delete(`/delivery-orders/lots/${lotId}`),
};

export interface DeliveryOrderLotDto {
  id: string;
  deliveryOrderItemId: string;
  lotNumber: string;
  quantity: number;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export interface DeliveryOrderItemLotsDto {
  deliveryOrderItemId: string;
  supplierItemId: string;
  supplierItemName: string;
  quantityDispatched: number;
  lotsTotalQuantity: number;
  remainingQuantity: number;
  lots: DeliveryOrderLotDto[];
}

export interface AddLotInput {
  lotNumber: string;
  quantity: number;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export type UpdateLotInput = AddLotInput
