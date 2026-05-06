import { api } from '@/lib/api'

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
}
