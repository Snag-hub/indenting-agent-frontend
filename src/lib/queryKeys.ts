export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  catalog: {
    categoryTree: () => ['catalog', 'categories', 'tree'] as const,
    category: (id: string) => ['catalog', 'categories', id] as const,
    items: (filters?: Record<string, unknown>) =>
      ['catalog', 'items', filters] as const,
    item: (id: string) => ['catalog', 'items', id] as const,
  },
}
