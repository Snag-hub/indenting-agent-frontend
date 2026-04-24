import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface PaymentSummaryDto {
  id: string;
  purchaseOrderId: string;
  referenceNumber: string;
  supplierName: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface PaymentDetailDto {
  id: string;
  purchaseOrderId: string;
  customerId: string;
  supplierId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  referenceNumber: string;
  notes?: string;
  supplierName: string;
  status: string;
  createdAt: string;
}

export const paymentApi = {
  list: (params?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<PaymentSummaryDto>>("/payments", { params })
      .then((r) => r.data),

  create: (data: {
    purchaseOrderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    referenceNumber: string;
    notes?: string;
  }) => api.post<string>("/payments", data).then((r) => r.data),

  get: (id: string) =>
    api.get<PaymentDetailDto>(`/payments/${id}`).then((r) => r.data),

  confirm: (id: string) => api.post(`/payments/${id}/confirm`),

  reject: (id: string) => api.post(`/payments/${id}/reject`),
};
