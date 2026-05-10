import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface ProformaInvoiceItemVariantDto {
  id: string;
  supplierItemVariantId: string;
  dimensionSummary?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface ProformaInvoiceItemDto {
  id: string;
  supplierItemId: string;
  supplierItemName: string;
  customerItemName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  variants?: ProformaInvoiceItemVariantDto[] | null;
}

export interface ProformaInvoiceSummaryDto {
  id: string;
  purchaseOrderId: string;
  documentNumber: string;
  title: string;
  supplierName: string;
  status: string;
  itemCount: number;
  createdAt: string;
}

export interface ProformaInvoiceDetailDto {
  id: string;
  purchaseOrderId: string;
  customerId: string;
  customerName?: string;
  customerAddress?: string;
  supplierId: string;
  documentNumber: string;
  title: string;
  notes?: string;
  supplierName: string;
  supplierAddress?: string;
  dueDate?: string;
  validUntil?: string;
  status: string;
  items: ProformaInvoiceItemDto[];
  createdAt: string;
}

export interface CreateProformaInvoiceVariantInput {
  supplierItemVariantId: string;
  quantityInvoiced: number;
}

export interface CreateProformaInvoiceItemInput {
  supplierItemId: string;
  quantityInvoiced: number;
  notes?: string;
  variants?: CreateProformaInvoiceVariantInput[];
}

export const proformaInvoiceApi = {
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<ProformaInvoiceSummaryDto>>("/proforma-invoices", {
        params,
      })
      .then((r) => r.data),

  create: (data: { purchaseOrderId: string; title: string; notes?: string; items: CreateProformaInvoiceItemInput[] }) =>
    api.post<string>("/proforma-invoices", data).then((r) => r.data),

  get: (id: string) =>
    api
      .get<ProformaInvoiceDetailDto>(`/proforma-invoices/${id}`)
      .then((r) => r.data),

  send: (id: string) => api.post(`/proforma-invoices/${id}/send`),

  acknowledge: (id: string) => api.post(`/proforma-invoices/${id}/acknowledge`),

  cancel: (id: string) => api.post(`/proforma-invoices/${id}/cancel`),
};
