import { api } from "@/lib/api";

export interface NotificationDto {
  id: string;
  tenantId: string;
  recipientUserId: string;
  type: string;
  message: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPagedResult {
  data: NotificationDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const notificationApi = {
  /**
   * GET /api/v1/notifications
   * Get paginated list of current user's notifications
   */
  list: (page: number = 1, pageSize: number = 20, unreadOnly: boolean = false): Promise<NotificationsPagedResult> =>
    api.get<NotificationsPagedResult>("/notifications", {
      params: { page, pageSize, unreadOnly }
    }).then((r) => r.data),

  /**
   * GET /api/v1/notifications/unread-count
   * Get count of unread notifications
   */
  getUnreadCount: (): Promise<number> =>
    api.get<number>("/notifications/unread-count").then((r) => r.data),

  /**
   * POST /api/v1/notifications/{id}/read
   * Mark a notification as read
   */
  markAsRead: (id: string): Promise<void> =>
    api.post(`/notifications/${id}/read`).then(() => undefined),

  /**
   * POST /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  markAllAsRead: (): Promise<void> =>
    api.post("/notifications/read-all").then(() => undefined),

  /**
   * DELETE /api/v1/notifications/{id}
   * Delete a notification
   */
  delete: (id: string): Promise<void> =>
    api.delete(`/notifications/${id}`).then(() => undefined),
};
