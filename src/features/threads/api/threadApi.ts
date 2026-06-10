import { api } from '@/lib/api'

export interface ThreadSummaryDto {
  id: string
  threadId: string
  entityType: string
  entityId: string
  entityDocumentNumber?: string
  entityTitle?: string
  entityPartyName?: string
  /** "Customer" | "Supplier" — role of the opposing party on this document */
  entityPartyRole?: string
  subject: string
  lastMessageAt?: string
  lastMessagePreview?: string
  unreadCount: number
  messageCount: number
  createdAt: string
}

export interface ThreadsPagedResult {
  data: ThreadSummaryDto[]
  totalCount: number
  page: number
  pageSize: number
}

export interface ThreadMessageDto {
  id: string
  threadId: string
  message: string
  isInternal: boolean
  attachmentUrl?: string
  mentionedUserId?: number
  createdById: string
  createdByName: string
  createdAt: string
  modifiedById?: string
  modifiedByName?: string
  modifiedAt?: string
}

export interface ThreadMessagesPagedResult {
  data: ThreadMessageDto[]
  totalCount: number
  page: number
  pageSize: number
}

export interface PostThreadMessageRequest {
  message: string
  isInternal: boolean
  attachmentUrl?: string
  mentionedUserId?: number
}

export interface UpdateThreadMessageRequest {
  message: string
}

export const threadApi = {
  /**
   * Browse all accessible threads with pagination, search, filtering, and sorting
   */
  list: (params: {
    page?: number
    pageSize?: number
    entityType?: string
    search?: string
    sortBy?: 'lastActivity' | 'created'
    /** When true, only threads with unread messages are returned */
    unreadOnly?: boolean
    /** Admin or Supplier: filter to threads linked to this customer */
    customerId?: string
    /** Admin or Customer: filter to threads linked to this supplier */
    supplierId?: string
  } = {}): Promise<ThreadsPagedResult> => {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append('page', params.page.toString())
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    if (params.entityType) searchParams.append('entityType', params.entityType)
    if (params.search) searchParams.append('search', params.search)
    if (params.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params.unreadOnly) searchParams.append('unreadOnly', 'true')
    if (params.customerId) searchParams.append('customerId', params.customerId)
    if (params.supplierId) searchParams.append('supplierId', params.supplierId)

    return api
      .get<ThreadsPagedResult>(`/threads?${searchParams.toString()}`)
      .then((r) => r.data)
  },

  /**
   * Fetch paginated list of messages for a thread
   * Non-admin users won't see internal messages
   */
  getMessages: (
    threadId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ThreadMessagesPagedResult> =>
    api
      .get<ThreadMessagesPagedResult>(
        `/threads/${threadId}/messages?page=${page}&pageSize=${pageSize}`
      )
      .then((r) => r.data),

  /**
   * Post a new message to a thread
   * Only admins can post internal messages (isInternal=true)
   */
  postMessage: (
    threadId: string,
    request: PostThreadMessageRequest
  ): Promise<{ id: string }> =>
    api
      .post<{ id: string }>(`/threads/${threadId}/messages`, request)
      .then((r) => r.data),

  /**
   * Update an existing message (only creator or admin can update)
   */
  updateMessage: (
    threadId: string,
    messageId: string,
    request: UpdateThreadMessageRequest
  ): Promise<void> =>
    api
      .put(`/threads/${threadId}/messages/${messageId}`, request)
      .then(() => undefined),

  /**
   * Delete a message (soft delete, only creator or admin can delete)
   */
  deleteMessage: (threadId: string, messageId: string): Promise<void> =>
    api
      .delete(`/threads/${threadId}/messages/${messageId}`)
      .then(() => undefined),

  /**
   * Mark a thread as read for the current user
   * Updates the user's last read timestamp for this thread
   */
  markAsRead: (threadId: string): Promise<void> =>
    api
      .post(`/threads/${threadId}/mark-as-read`)
      .then(() => undefined),

  /**
   * Get unread message count for a specific entity's thread
   */
  getUnreadCount: (entityType: string, entityId: string): Promise<number> =>
    api
      .get<{ count: number }>(`/threads/${entityType}/${entityId}/unread-count`)
      .then((r) => r.data.count),

  /**
   * Get total number of threads with at least one unread message for the current user.
   * Used for the nav badge.
   */
  getMyUnreadCount: (): Promise<number> =>
    api
      .get<{ count: number }>('/threads/unread-count')
      .then((r) => r.data.count),
}
