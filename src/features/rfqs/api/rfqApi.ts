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

/** Summary row in the RFQ list — one supplier per RFQ. */
export interface RFQSummaryDto {
  id: string;
  supplierId: string;
  supplierName: string;
  customerName?: string;
  status: string;
  declineReason?: string | null;
  itemCount: number;
  dueDate?: string;
  createdAt: string;
  documentNumber: string;
}

/** Full RFQ detail — one supplier per RFQ after the per-supplier split. */
export interface RFQDetailDto {
  id: string;
  enquiryId?: string;
  enquiryDocumentNumber?: string;
  supplierId: string;
  supplierName: string;
  notes?: string;
  status: string;
  declineReason?: string | null;
  dueDate?: string;
  items: RFQItemDto[];
  createdAt: string;
  documentNumber: string;
}

// ─── Comparison DTO types ────────────────────────────────────────────────────

export interface QuotedItemVariantComparisonDto {
  supplierItemVariantId: string;
  dimensionSummary?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuotedItemComparisonDto {
  rfqItemId: string;
  quotationItemId?: string | null;
  quantityOffered: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  dimensionSummary?: string | null;
  sku?: string | null;
  notes?: string | null;
  variants?: QuotedItemVariantComparisonDto[] | null;
}

export interface SupplierQuotationComparisonDto {
  supplierId: string;
  supplierName: string;
  /** RFQ status — "Submitted" | "Declined" | etc. */
  invitationStatus: string;
  declineReason?: string | null;
  quotationId?: string | null;
  quotationStatus?: string | null;
  submittedAt?: string | null;
  subtotal: number;
  discountAmount: number;
  discountPercent?: number | null;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency?: string | null;
  quotedItems: QuotedItemComparisonDto[];
}

export interface RFQComparisonDto {
  rfqId: string;
  documentNumber: string;
  notes?: string | null;
  dueDate?: string | null;
  requestedItems: RFQItemComparisonDto[];
  supplierQuotations: SupplierQuotationComparisonDto[];
}

export interface RFQItemComparisonDto {
  rfqItemId: string;
  supplierItemId: string;
  itemName: string;
  quantityRequested: number;
  notes?: string | null;
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface CreateRFQItemVariantInput {
  supplierItemVariantId: string;
  quantity: number;
}

export interface CreateRFQInput {
  notes?: string;
  dueDate?: string;
  enquiryId?: string;
  /** Invited supplier IDs — backend creates one RFQ per supplier. */
  supplierIds: string[];
  items?: {
    supplierItemId: string;
    quantity: number;
    notes?: string;
    variants?: CreateRFQItemVariantInput[];
  }[];
}

export interface UpdateRFQInput {
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
  supplierId: string;
  supplierName: string;
  suggestedQuantity: number;
  notes?: string;
  hasVariants: boolean;
  allocatedQuantity: number;
  availableQuantity: number;
  quantityTiers?: number[];
}

// ─── API surface ─────────────────────────────────────────────────────────────

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
   * POST /rfqs — creates one RFQ per invited supplier.
   * Returns an array of new RFQ GUIDs (one per supplier).
   */
  create: (data: CreateRFQInput) =>
    api.post<string[]>("/rfqs", data).then((r) => r.data),

  /** GET /rfqs/:id — full detail for a single RFQ. */
  get: (id: string): Promise<RFQDetailDto> =>
    api.get<RFQDetailDto>(`/rfqs/${id}`).then((r) => r.data),

  /** GET /rfqs/:id/comparison — quotation comparison for this RFQ's supplier. */
  getComparison: (id: string): Promise<RFQComparisonDto> =>
    api.get<RFQComparisonDto>(`/rfqs/${id}/comparison`).then((r) => r.data),

  /** PUT /rfqs/:id — partial update (notes, dueDate). */
  update: (id: string, data: UpdateRFQInput) =>
    api.put(`/rfqs/${id}`, data).then((r) => r.data),

  /** POST /rfqs/:id/items — add an item to a Draft RFQ. */
  addItem: (id: string, data: AddRFQItemInput) =>
    api.post(`/rfqs/${id}/items`, data).then((r) => r.data),

  /** DELETE /rfqs/:id/items/:itemId — remove an item from a Draft RFQ. */
  removeItem: (id: string, itemId: string) =>
    api.delete(`/rfqs/${id}/items/${itemId}`).then((r) => r.data),

  /** POST /rfqs/:id/send — transition RFQ from Draft → Submitted. */
  send: (id: string) => api.post(`/rfqs/${id}/send`).then((r) => r.data),

  /** POST /rfqs/:id/close — transition RFQ to Closed. */
  close: (id: string) => api.post(`/rfqs/${id}/close`).then((r) => r.data),

  /** POST /rfqs/:id/decline — Supplier declines to quote. */
  decline: (id: string, reason?: string) =>
    api.post(`/rfqs/${id}/decline`, { reason }).then((r) => r.data),

  /** DELETE /rfqs/:id — soft-delete an RFQ. */
  delete: (id: string) => api.delete(`/rfqs/${id}`),

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

  /**
   * POST /rfqs/:id/clone — clone the RFQ, optionally re-targeting a different supplier.
   * Omit supplierId to keep the source's supplier.
   * Returns new RFQ GUID.
   */
  clone: (id: string, supplierId?: string) =>
    api
      .post<string>(`/rfqs/${id}/clone`, supplierId ? { supplierId } : {})
      .then((r) => r.data),
};
