import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface RFQItemDto {
  id: string;
  supplierItemId: string;
  supplierItemName: string;
  supplierName: string;
  quantity: number;
  notes?: string;
}

export interface RFQSummaryDto {
  id: string;
  title: string;
  supplierName: string;
  status: string; // 'Draft' | 'Sent' | 'Closed'
  itemCount: number;
  dueDate?: string;
  createdAt: string;
}

export interface RFQDetailDto {
  id: string;
  enquiryId?: string;
  supplierId: string;
  supplierName: string;
  title: string;
  notes?: string;
  status: string;
  dueDate?: string;
  items: RFQItemDto[];
  createdAt: string;
}

export interface CreateRFQInput {
  title: string;
  notes?: string;
  dueDate?: string;
  enquiryId?: string;
  supplierId: string;
  items?: { supplierItemId: string; quantity: number; notes?: string }[];
}

export interface UpdateRFQInput {
  title?: string;
  notes?: string;
  dueDate?: string;
}

export interface AddRFQItemInput {
  supplierItemId: string;
  quantity: number;
  notes?: string;
}

export interface EnquiryItemForRFQDto {
  supplierItemId: string;
  itemName: string;
  supplierName: string;
  suggestedQuantity: number;
  notes?: string;
}

export const rfqApi = {
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<RFQSummaryDto>>("/rfqs", { params })
      .then((r) => r.data),

  create: (data: CreateRFQInput) =>
    api.post<string>("/rfqs", data).then((r) => r.data),

  get: (id: string): Promise<RFQDetailDto> =>
    api.get<RFQDetailDto>(`/rfqs/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateRFQInput) =>
    api.put(`/rfqs/${id}`, data).then((r) => r.data),

  addItem: (id: string, data: AddRFQItemInput) =>
    api.post(`/rfqs/${id}/items`, data).then((r) => r.data),

  removeItem: (id: string, itemId: string) =>
    api.delete(`/rfqs/${id}/items/${itemId}`).then((r) => r.data),

  send: (id: string) => api.post(`/rfqs/${id}/send`).then((r) => r.data),

  close: (id: string) => api.post(`/rfqs/${id}/close`).then((r) => r.data),

  getEnquiryItems: (enquiryId: string, supplierId?: string) =>
    api
      .get<EnquiryItemForRFQDto[]>("/rfqs/enquiry-items", {
        params: { enquiryId, supplierId },
      })
      .then((r) => r.data),

  clone: (id: string, supplierId: string) =>
    api.post<string>(`/rfqs/${id}/clone`, { supplierId }).then((r) => r.data),
};
