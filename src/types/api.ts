export interface PagedResult<T> {
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  pageCount?: number
}

export interface ProblemDetails {
  status: number
  title: string
  type?: string
  errors?: Record<string, string[]>
}
