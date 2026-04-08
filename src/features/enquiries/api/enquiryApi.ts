import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export type EnquiryType = 'General' | 'ItemSpecific'

export interface EnquiryItemVariantInput {
  supplierItemVariantId: string
  quantity: number
}

export interface EnquiryItemInput {
  masterItemId?: string;
  supplierItemId?: string;
  quantity: number;
  notes?: string;
  variants?: EnquiryItemVariantInput[]
}

export interface EnquiryItemDto {
  id: string;
  masterItemId?: string;
  supplierItemId?: string;
  itemName: string;
  supplierName?: string;
  quantity: number;
  notes?: string;
  variants: {
    id: string
    supplierItemVariantId: string
    dimensionSummary: string
    sku?: string
    quantity: number
  }[]
}

export interface EnquirySummaryDto {
  id: string;
  title: string;
  status: string; // 'Draft' | 'Open' | 'Closed'
  itemCount: number;
  customerName: string;
  createdAt: string;
}

export interface EnquiryDetailDto {
  id: string;
  title: string;
  notes?: string;
  status: string;
  customerName: string;
  items: EnquiryItemDto[];
  createdAt: string;
}

export interface AvailableEnquiryItemDto {
  id: string;
  type: "Master" | "Supplier";
  resolvedName: string;
  originalName?: string;
  supplierName?: string;
  hasVariants: boolean
  customerItemId?: string
}

export const enquiryApi = {
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<EnquirySummaryDto>>("/enquiries", { params })
      .then((r) => r.data),

  create: (data: {
    enquiryType?: EnquiryType;
    supplierId?: string;
    title: string;
    notes?: string;
    items?: EnquiryItemInput[];
  }) => api.post<string>("/enquiries", data).then((r) => r.data),

  get: (id: string): Promise<EnquiryDetailDto> =>
    api.get<EnquiryDetailDto>(`/enquiries/${id}`).then((r) => r.data),

  submit: (id: string) =>
    api.post(`/enquiries/${id}/submit`).then((r) => r.data),

  close: (id: string) =>
    api.post(`/enquiries/${id}/close`).then((r) => r.data),

  availableItems: (params?: { search?: string; supplierId?: string }): Promise<AvailableEnquiryItemDto[]> =>
    api
      .get<AvailableEnquiryItemDto[]>("/enquiries/available-items", { params })
      .then((r) => r.data),
};
