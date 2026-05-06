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
  quantityDispatched: number;
  notes?: string;
  variants?: DeliveryOrderItemVariantDto[] | null;
}

export interface DeliveryOrderSummaryDto {
  id: string;
  purchaseOrderId: string;
  title: string;
  supplierName: string;
  status: string;
  createdAt: string;
}

export interface DeliveryOrderDetailDto {
  id: string;
  purchaseOrderId: string;
  purchaseOrderDocumentNumber?: string;
  proformaInvoiceId?: string;
  proformaInvoiceDocumentNumber?: string;
  customerId: string;
  customerName?: string;
  supplierId: string;
  documentNumber: string;
  title: string;
  notes?: string;
  supplierName: string;
  status: string;
  items: DeliveryOrderItemDto[];
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
    purchaseOrderId: string;
    proformaInvoiceId?: string;
    title: string;
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
};
