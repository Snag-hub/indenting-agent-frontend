import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface QuotationItemVariantDto {
  id: string;
  supplierItemVariantId: string;
  quantity: number;
  unitPrice?: number;
  dimensionSummary?: string | null;
  sku?: string | null;
  notes?: string | null;
  rfqQuantity?: number;
}

export interface QuotationItemDto {
  id: string;
  supplierItemId: string;
  supplierItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  variants: QuotationItemVariantDto[];
  variantPrices?: Record<string, number>;
  rfqQuantity?: number;
}

export interface QuotationVersionDto {
  id: string;
  versionNumber: number;
  notes?: string;
  validUntil?: string;
  items: QuotationItemDto[];

  // Monetary totals
  subtotal: number;
  discountAmount: number;
  discountPercent?: number | null;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency?: string | null;
}

export interface QuotationSummaryDto {
  id: string;
  rfqId: string;
  documentNumber: string;
  rfqTitle: string;
  supplierName: string;
  status: string; // 'Draft' | 'Submitted' | 'Accepted' | 'Rejected'
  versionCount: number;
  createdAt: string;
}

export interface QuotationDetailDto {
  id: string;
  rfqId: string;
  documentNumber: string;
  rfqTitle: string;
  supplierName: string;
  status: string;
  versions: QuotationVersionDto[];
  createdAt: string;
  purchaseOrderId?: string | null;
  rejectionReason?: string | null;
  revisionRequestNote?: string | null;
}

export interface AddQuotationItemVariantInput {
  supplierItemVariantId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface AddQuotationItemInput {
  supplierItemId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  variants?: AddQuotationItemVariantInput[];
}

export interface UpdateQuotationVariantInput {
  supplierItemVariantId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface UpdateQuotationItemInput {
  quantity?: number;
  unitPrice?: number;
  notes?: string;
  variants?: UpdateQuotationVariantInput[];
}

export interface ReviseQuotationInput {
  notes?: string;
  validUntil?: string;
}

export const quotationApi = {
  list: (params?: {
    search?: string;
    status?: string;
    rfqId?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<QuotationSummaryDto>>("/quotations", { params })
      .then((r) => r.data),

  create: (rfqId: string) =>
    api.post<string>("/quotations", { rfqId }).then((r) => r.data),

  get: (id: string): Promise<QuotationDetailDto> =>
    api.get<QuotationDetailDto>(`/quotations/${id}`).then((r) => r.data),

  addItem: (id: string, versionId: string, data: AddQuotationItemInput) =>
    api
      .post(`/quotations/${id}/items/version/${versionId}`, data)
      .then((r) => r.data),

  updateItem: (
    id: string,
    itemId: string,
    versionId: string,
    data: UpdateQuotationItemInput,
  ) =>
    api
      .put(`/quotations/${id}/items/${itemId}/version/${versionId}`, data)
      .then((r) => r.data),

  removeItem: (id: string, itemId: string, versionId: string) =>
    api
      .delete(`/quotations/${id}/items/${itemId}/version/${versionId}`)
      .then((r) => r.data),

  submit: (id: string) =>
    api.post(`/quotations/${id}/submit`).then((r) => r.data),

  accept: (id: string) =>
    api.post(`/quotations/${id}/accept`).then((r) => r.data),

  reject: (id: string, reason?: string) =>
    api.post(`/quotations/${id}/reject`, { reason: reason ?? null }).then((r) => r.data),

  requestRevision: (id: string, note?: string) =>
    api.post(`/quotations/${id}/request-revision`, { note: note ?? null }).then((r) => r.data),

  revise: (id: string, data: ReviseQuotationInput) =>
    api.post(`/quotations/${id}/revise`, data).then((r) => r.data),

  deleteVersion: (id: string, versionId: string) =>
    api.delete(`/quotations/${id}/versions/${versionId}`).then((r) => r.data),
};
