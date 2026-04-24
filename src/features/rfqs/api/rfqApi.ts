import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface RFQItemVariantDto {
  id: string;
  supplierItemVariantId: string;
  quantityOffered: number;
  dimensionSummary?: string | null;
  sku?: string | null;
  unitPrice?: number | null;
  priceNotes?: string | null;
}

export interface RFQItemDto {
  id: string;
  supplierItemId: string;
  supplierItemName: string;
  supplierName: string;
  quantity: number;
  notes?: string;
  variants: RFQItemVariantDto[];
}

/** Summary row in the RFQ list — one RFQ = one Supplier. */
export interface RFQSummaryDto {
  id: string;
  documentNumber?: string;
  title: string;
  supplierName: string;
  customerName?: string;
  status: string; // 'Draft' | 'Sent' | 'Closed'
  itemCount: number;
  dueDate?: string;
  createdAt: string;
}

/** Full RFQ detail — single supplier per RFQ. */
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

export interface CreateRFQItemVariantInput {
  supplierItemVariantId: string;
  quantity: number;
}

export interface CreateRFQInput {
  title: string;
  notes?: string;
  dueDate?: string;
  enquiryId?: string;
  /** One or more supplier IDs — backend creates one RFQ per supplier, each with only their items. */
  supplierIds: string[];
  items?: {
    supplierItemId: string;
    quantity: number;
    notes?: string;
    variants?: CreateRFQItemVariantInput[];
  }[];
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
  enquiryItemId: string;
  supplierItemId: string;
  itemName: string;
  supplierName: string;
  suggestedQuantity: number;
  notes?: string;
  hasVariants: boolean;
  allocatedQuantity: number;
  availableQuantity: number;
}

export const rfqApi = {
  /** GET /rfqs — paginated list with optional filters. */
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<RFQSummaryDto>>("/rfqs", { params })
      .then((r) => r.data),

  /**
   * POST /rfqs — create RFQs for the selected suppliers.
   * Backend splits items per supplier and returns one RFQ ID per supplier that had matching items.
   */
  create: (data: CreateRFQInput) =>
    api.post<string[]>("/rfqs", data).then((r) => r.data),

  /** GET /rfqs/:id — full detail including single supplier and items. */
  get: (id: string): Promise<RFQDetailDto> =>
    api.get<RFQDetailDto>(`/rfqs/${id}`).then((r) => r.data),

  /** PUT /rfqs/:id — partial update (title, notes, dueDate). */
  update: (id: string, data: UpdateRFQInput) =>
    api.put(`/rfqs/${id}`, data).then((r) => r.data),

  /** POST /rfqs/:id/items — add an item to a Draft RFQ. */
  addItem: (id: string, data: AddRFQItemInput) =>
    api.post(`/rfqs/${id}/items`, data).then((r) => r.data),

  /** DELETE /rfqs/:id/items/:itemId — remove an item from a Draft RFQ. */
  removeItem: (id: string, itemId: string) =>
    api.delete(`/rfqs/${id}/items/${itemId}`).then((r) => r.data),

  /** POST /rfqs/:id/send — transition RFQ from Draft → Sent (notifies the supplier). */
  send: (id: string) => api.post(`/rfqs/${id}/send`).then((r) => r.data),

  /** POST /rfqs/:id/close — transition RFQ to Closed. */
  close: (id: string) => api.post(`/rfqs/${id}/close`).then((r) => r.data),

  /**
   * GET /rfqs/enquiry-items — items from a linked enquiry.
   * Pass supplierId to filter to one supplier, or omit to return all suppliers' items.
   */
  getEnquiryItems: (enquiryId: string, supplierId?: string) =>
    api
      .get<EnquiryItemForRFQDto[]>("/rfqs/enquiry-items", {
        params: { enquiryId, supplierId },
      })
      .then((r) => r.data),

  /** POST /rfqs/:id/clone — clone this RFQ for a single new supplier. Returns new RFQ GUID. */
  clone: (id: string, supplierId: string) =>
    api.post<string>(`/rfqs/${id}/clone`, { supplierId }).then((r) => r.data),
};
