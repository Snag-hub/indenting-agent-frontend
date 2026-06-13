import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export type EnquiryType = "General" | "ItemSpecific";

export interface EnquiryItemVariantInput {
  supplierItemVariantId: string;
  quantityRequested: number;
}

export interface EnquiryItemInput {
  masterItemId?: string;
  supplierItemId?: string;
  quantity: number;
  notes?: string;
  variants?: EnquiryItemVariantInput[];
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
    id: string;
    supplierItemVariantId: string;
    dimensionSummary?: string;
    sku?: string | null;
    quantityRequested: number;
  }[];
}

export interface EnquirySummaryDto {
  id: string;
  documentNumber: string;
  title: string;
  status: string; // 'Draft' | 'Open' | 'Closed'
  itemCount: number;
  customerName: string;
  createdAt: string;
}

export interface EnquiryDetailDto {
  id: string;
  documentNumber: string;
  enquiryType?: EnquiryType;
  priority?: string;
  title: string;
  notes?: string;
  status: string;
  customerName: string;
  supplierId?: string | null;
  supplierName?: string | null;
  items: EnquiryItemDto[];
  createdAt: string;
}

export interface AvailableItemOfferDto {
  supplierId: string;
  supplierName: string;
  supplierItemId: string;
  hasVariants: boolean;
  quantityTiers: number[];   // empty array means "any quantity"
}

export interface AvailableEnquiryItemDto {
  id: string;                // Master item id (Type=Master) or SupplierItem id (Type=Supplier)
  type: "Master" | "Supplier";
  name: string;
  resolvedName: string;      // custom-name overlay, falls back to name
  offers: AvailableItemOfferDto[];  // 1+ entries (one per supplier offering this item)
}

export const enquiryApi = {
  list: (params?: {
    search?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    dateField?: string;
    customerId?: string;
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

  /**
   * Create one enquiry per supplier in a single transaction.
   * Returns the ordered list of created enquiry IDs.
   */
  createBatch: (data: {
    enquiries: {
      supplierId: string;
      title?: string;
      notes?: string;
      items: EnquiryItemInput[];
    }[];
  }) =>
    api
      .post<string[]>("/enquiries/batch", data)
      .then((r) => r.data),

  get: (id: string): Promise<EnquiryDetailDto> =>
    api.get<EnquiryDetailDto>(`/enquiries/${id}`).then((r) => r.data),

  submit: (id: string) =>
    api.post(`/enquiries/${id}/submit`).then((r) => r.data),

  close: (id: string) => api.post(`/enquiries/${id}/close`).then((r) => r.data),

  delete: (id: string) => api.delete(`/enquiries/${id}`),

  addItem: (enquiryId: string, data: EnquiryItemInput) =>
    api.post<string>(`/enquiries/${enquiryId}/items`, data).then((r) => r.data),

  updateItem: (itemId: string, data: { quantity: number; notes?: string; variants?: EnquiryItemVariantInput[] }) =>
    api.put(`/enquiries/items/${itemId}`, data),

  removeItem: (itemId: string) =>
    api.delete(`/enquiries/items/${itemId}`),

  availableItems: (params?: {
    search?: string;
    supplierIds?: string[];   // empty/undefined → all suppliers in tenant
    categoryId?: string;
  }): Promise<AvailableEnquiryItemDto[]> =>
    api
      .get<AvailableEnquiryItemDto[]>("/enquiries/available-items", {
        params,
        // Axios needs explicit "repeat" serializer for List<Guid> → ?supplierIds=...&supplierIds=...
        paramsSerializer: {
          indexes: null,   // foo=a&foo=b instead of foo[]=a or foo[0]=a
        },
      })
      .then((r) => r.data),
};
