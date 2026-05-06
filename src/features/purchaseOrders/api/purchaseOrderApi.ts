import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface PurchaseOrderItemVariantDto {
  id: string;
  supplierItemVariantId: string;
  quantity: number;
  unitPrice: number;
  dimensionSummary?: string | null;
  sku?: string | null;
}

export interface PurchaseOrderItemDto {
  id: string;
  supplierItemId: string;
  supplierItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  variants?: PurchaseOrderItemVariantDto[];
}

export interface PurchaseOrderSummaryDto {
  id: string;
  documentNumber?: string;
  quotationId: string;
  title: string;
  supplierName: string;
  status: string;
  itemCount: number;
  createdAt: string;
}

export interface PurchaseOrderDetailDto {
  id: string;
  quotationId: string;
  customerId: string;
  supplierId: string;
  title: string;
  notes?: string;
  supplierName: string;
  status: string;
  items: PurchaseOrderItemDto[];

  // Monetary totals
  subtotal: number;
  discountAmount: number;
  discountPercent?: number | null;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency?: string | null;

  createdAt: string;
  documentNumber?: string;
}

export interface CreatePurchaseOrderInput {
  quotationId: string;
  notes?: string;
}

export interface VoucherVariantBalanceDto {
  supplierItemVariantId: string;
  dimensionSummary?: string | null;
  sku?: string | null;
  orderedQty: number;
  invoicedQty: number;
  remainingQty: number;
  unitPrice: number;
}

export interface VoucherItemBalanceDto {
  supplierItemId: string;
  supplierItemName: string;
  orderedQty: number;
  dispatchedQty: number;
  remainingQty: number;
  variants?: VoucherVariantBalanceDto[] | null;
}

export const purchaseOrderApi = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) =>
    api
      .get<PagedResult<PurchaseOrderSummaryDto>>("/purchase-orders", { params })
      .then((r) => r.data),

  create: (data: CreatePurchaseOrderInput) =>
    api.post<string>("/purchase-orders", data).then((r) => r.data),

  get: (id: string) =>
    api
      .get<PurchaseOrderDetailDto>(`/purchase-orders/${id}`)
      .then((r) => r.data),

  confirm: (id: string) => api.post(`/purchase-orders/${id}/confirm`),

  close: (id: string) => api.post(`/purchase-orders/${id}/close`),

  getDispatchBalance: (id: string) =>
    api
      .get<VoucherItemBalanceDto[]>(`/purchase-orders/${id}/dispatch-balance`)
      .then((r) => r.data),

  getInvoiceBalance: (id: string) =>
    api
      .get<VoucherItemBalanceDto[]>(`/purchase-orders/${id}/invoice-balance`)
      .then((r) => r.data),
};
