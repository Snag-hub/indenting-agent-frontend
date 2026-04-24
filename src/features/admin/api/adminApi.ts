import { api } from "@/lib/api";

export interface DocumentNumberFormatDto {
  entityType: string;
  prefix: string;
  suffix?: string | null;
  padding: number;
  includeYear: boolean;
}

export type UpdateDocumentNumberFormatInput = Omit<DocumentNumberFormatDto, "entityType">;

// Shared endpoint — works for Admin, Customer, and Supplier roles.
// Admin reads/writes /admin/document-number-formats (tenant-wide defaults).
// Customer and Supplier read/write /settings/document-number-formats (their own scope).
export const documentNumberApi = {
  getFormats: (): Promise<DocumentNumberFormatDto[]> =>
    api
      .get<DocumentNumberFormatDto[]>("/settings/document-number-formats")
      .then((r) => r.data),

  updateFormat: (entityType: string, data: UpdateDocumentNumberFormatInput) =>
    api
      .put(`/settings/document-number-formats/${entityType}`, data)
      .then((r) => r.data),
};

// Keep adminApi alias for backward compat with existing AdminController routes
export const adminApi = {
  getDocumentNumberFormats: (): Promise<DocumentNumberFormatDto[]> =>
    api
      .get<DocumentNumberFormatDto[]>("/admin/document-number-formats")
      .then((r) => r.data),

  updateDocumentNumberFormat: (entityType: string, data: UpdateDocumentNumberFormatInput) =>
    api
      .put(`/admin/document-number-formats/${entityType}`, data)
      .then((r) => r.data),
};
