import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface QuotationItemDto {
  id: string;
  supplierItemId: string;
  supplierItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface QuotationVersionDto {
  id: string;
  versionNumber: number;
  notes?: string;
  validUntil?: string;
  items: QuotationItemDto[];
}

export interface QuotationSummaryDto {
  id: string;
  rfqId: string;
  rfqTitle: string;
  supplierName: string;
  status: string; // 'Draft' | 'Submitted' | 'Accepted' | 'Rejected'
  versionCount: number;
  createdAt: string;
}

export interface QuotationDetailDto {
  id: string;
  rfqId: string;
  rfqTitle: string;
  supplierName: string;
  status: string;
  versions: QuotationVersionDto[];
  createdAt: string;
}

export interface AddQuotationItemInput {
  supplierItemId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface UpdateQuotationItemInput {
  quantity?: number;
  unitPrice?: number;
  notes?: string;
}

export interface ReviseQuotationInput {
  notes?: string;
  validUntil?: string;
}

export const quotationApi = {
  list: (params?: {
    search?: string;
    status?: string;
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

  reject: (id: string) =>
    api.post(`/quotations/${id}/reject`).then((r) => r.data),

  revise: (id: string, data: ReviseQuotationInput) =>
    api.post(`/quotations/${id}/revise`, data).then((r) => r.data),
};
