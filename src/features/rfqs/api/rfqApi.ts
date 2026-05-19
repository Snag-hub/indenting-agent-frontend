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

/** One invited supplier on an RFQ + their response state. */
export interface RFQSupplierDto {
  supplierId: string;
  supplierName: string;
  /** "Invited" | "Quoted" | "Declined" */
  status: string;
  invitedAt: string;
  respondedAt?: string | null;
  declineReason?: string | null;
}

/** Summary row in the RFQ list. */
export interface RFQSummaryDto {
  id: string;
  invitedSupplierCount: number;
  respondedSupplierCount: number;
  /** null for Customer/Admin; one of Invited/Quoted/Declined for Supplier. */
  ownSupplierStatus?: string | null;
  customerName?: string;
  status: string;
  itemCount: number;
  dueDate?: string;
  createdAt: string;
  documentNumber: string;
}

/** Full RFQ detail — N invited suppliers. */
export interface RFQDetailDto {
  id: string;
  enquiryId?: string;
  enquiryDocumentNumber?: string;
  suppliers: RFQSupplierDto[];
  notes?: string;
  status: string;
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
  /** "Invited" | "Quoted" | "Declined" */
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
  /** All invited supplier IDs — backend creates ONE RFQ with N RFQSupplier rows. */
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
  supplierName: string;
  suggestedQuantity: number;
  notes?: string;
  hasVariants: boolean;
  allocatedQuantity: number;
  availableQuantity: number;
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
   * POST /rfqs — create ONE RFQ inviting all selected suppliers.
   * Returns a single RFQ GUID.
   */
  create: (data: CreateRFQInput) =>
    api.post<string>("/rfqs", data).then((r) => r.data),

  /** GET /rfqs/:id — full detail including all invited suppliers and items. */
  get: (id: string): Promise<RFQDetailDto> =>
    api.get<RFQDetailDto>(`/rfqs/${id}`).then((r) => r.data),

  /** GET /rfqs/:id/comparison — side-by-side supplier quotation comparison. */
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

  /** POST /rfqs/:id/send — transition RFQ from Draft → Submitted (notifies all suppliers). */
  send: (id: string) => api.post(`/rfqs/${id}/send`).then((r) => r.data),

  /** POST /rfqs/:id/close — transition RFQ to Closed. */
  close: (id: string) => api.post(`/rfqs/${id}/close`).then((r) => r.data),

  /**
   * POST /rfqs/:id/decline — Supplier declines to quote.
   * The reason is optional; the body may be omitted entirely for no reason.
   */
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
   * POST /rfqs/:id/clone — clone the RFQ for a new set of suppliers.
   * Pass an empty array to copy the source RFQ's invited supplier list.
   * Returns new RFQ GUID.
   */
  clone: (id: string, supplierIds: string[] = []) =>
    api
      .post<string>(`/rfqs/${id}/clone`, { supplierIds })
      .then((r) => r.data),
};
