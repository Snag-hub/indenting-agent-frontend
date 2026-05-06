export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  catalog: {
    categoryTree: () => ["catalog", "categories", "tree"] as const,
    category: (id: string) => ["catalog", "categories", id] as const,
    items: (filters?: Record<string, unknown>) =>
      ["catalog", "items", filters] as const,
    item: (id: string) => ["catalog", "items", id] as const,
  },
  customers: {
    list: (filters?: Record<string, unknown>) =>
      ["customers", "list", filters] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
  },
  suppliers: {
    list: (filters?: Record<string, unknown>) =>
      ["suppliers", "list", filters] as const,
    detail: (id: string) => ["suppliers", "detail", id] as const,
  },
  supplierItems: {
    list: (filters?: Record<string, unknown>) =>
      ["supplierItems", "list", filters] as const,
    mine: (filters?: Record<string, unknown>) =>
      ["supplierItems", "mine", filters] as const,
    browse: (filters?: Record<string, unknown>) =>
      ["supplierItems", "browse", filters] as const,
    detail: (id: string) => ["supplierItems", "detail", id] as const,
  },
  pricing: {
    baseTiers: (supplierItemId: string) =>
      ["pricing", "base", supplierItemId] as const,
    customerTiers: (supplierItemId: string, customerId?: string) =>
      ["pricing", "customer", supplierItemId, customerId] as const,
  },
  attachments: {
    list: (entityType: string, entityId: string) =>
      ["attachments", entityType, entityId] as const,
  },
  statuses: {
    list: (entityType: string) => ["statuses", entityType] as const,
  },
  dimensions: {
    my: () => ["my-dimensions"] as const,
  },
  enquiries: {
    list: (params?: Record<string, unknown>) =>
      ["enquiries", "list", params ?? {}] as const,
    detail: (id: string) => ["enquiries", "detail", id] as const,
  },
  rfqs: {
    list: (params?: Record<string, unknown>) =>
      ["rfqs", "list", params ?? {}] as const,
    detail: (id: string) => ["rfqs", "detail", id] as const,
    enquiryItems: (enquiryId: string, supplierId?: string) =>
      ["rfqs", "enquiry-items", enquiryId, supplierId ?? ""] as const,
  },
  quotations: {
    list: (params?: Record<string, unknown>) =>
      ["quotations", "list", params ?? {}] as const,
    detail: (id: string) => ["quotations", "detail", id] as const,
  },
  pos: {
    list: (params?: Record<string, unknown>) =>
      ["pos", "list", params ?? {}] as const,
    detail: (id: string) => ["pos", "detail", id] as const,
    dispatchBalance: (id: string) => ["pos", "dispatch-balance", id] as const,
    invoiceBalance: (id: string) => ["pos", "invoice-balance", id] as const,
  },
  customerItems: {
    list: (params?: Record<string, unknown>) =>
      ["customerItems", "list", params ?? {}] as const,
    detail: (id: string) => ["customerItems", "detail", id] as const,
  },
  notifications: {
    list: (params?: Record<string, unknown>) =>
      ["notifications", "list", params ?? {}] as const,
    preferences: () => ["notifications", "preferences"] as const,
  },
  proformaInvoices: {
    list: (params?: Record<string, unknown>) =>
      ["proforma-invoices", "list", params ?? {}] as const,
    detail: (id: string) => ["proforma-invoices", "detail", id] as const,
  },
  deliveryOrders: {
    list: (params?: Record<string, unknown>) =>
      ["delivery-orders", "list", params ?? {}] as const,
    detail: (id: string) => ["delivery-orders", "detail", id] as const,
  },
  payments: {
    list: (params?: Record<string, unknown>) =>
      ["payments", "list", params ?? {}] as const,
    detail: (id: string) => ["payments", "detail", id] as const,
  },
  reports: {
    activity: (count?: number) => ["reports", "activity", count ?? 10] as const,
  },
  tickets: {
    list: (params?: Record<string, unknown>) =>
      ["tickets", "list", params ?? {}] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
  },
  dashboard: {
    overview: () => ["dashboard", "overview"] as const,
  },
};
