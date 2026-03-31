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
};
