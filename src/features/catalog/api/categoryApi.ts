import { api } from '@/lib/api'

export interface CategoryTreeNode {
  id: string
  name: string
  children: CategoryTreeNode[]
}

export interface Category {
  id: string
  name: string
  parentCategoryId: string | null
  createdAt: string
}

export const categoryApi = {
  getTree: () => api.get<CategoryTreeNode[]>('/catalog/categories/tree').then((r) => r.data),
  getById: (id: string) => api.get<Category>(`/catalog/categories/${id}`).then((r) => r.data),
  create: (data: { name: string; parentCategoryId?: string }) =>
    api.post<string>('/catalog/categories', data).then((r) => r.data),
  update: (id: string, data: { name: string; parentCategoryId?: string | null }) =>
    api.put(`/catalog/categories/${id}`, data),
  delete: (id: string) => api.delete(`/catalog/categories/${id}`),
}
