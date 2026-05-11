import { api } from "@/lib/api";

export type NotificationStatus = "Unread" | "Read" | "Cleared";

export interface NotificationDto {
  id: string;
  tenantId: string;
  recipientUserId: string;
  type: string;
  message: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  status: NotificationStatus;
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
   * Get paginated list of current user's notifications.
   *
   * Pass `includeCleared=true` to see the full 30-day history (used by the
   * dedicated notifications page). The drawer leaves it off so cleared
   * notifications are hidden.
   */
  list: (
    page: number = 1,
    pageSize: number = 20,
    unreadOnly: boolean = false,
    includeCleared: boolean = false,
  ): Promise<NotificationsPagedResult> =>
    api.get<NotificationsPagedResult>("/notifications", {
      params: { page, pageSize, unreadOnly, includeCleared }
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
   * Soft-deletes a notification (sets IsDeleted = true).
   * Row stays in DB until the daily cleanup job removes it.
   */
  delete: (id: string): Promise<void> =>
    api.delete(`/notifications/${id}`).then(() => undefined),

  /**
   * POST /api/v1/notifications/{id}/clear
   * Marks a single notification as Cleared (dismissed from drawer).
   * Row stays in DB; reappears nowhere in the UI.
   */
  clear: (id: string): Promise<void> =>
    api.post(`/notifications/${id}/clear`).then(() => undefined),

  /**
   * POST /api/v1/notifications/clear-all
   * Marks all of the current user's visible notifications as Cleared.
   */
  clearAll: (): Promise<void> =>
    api.post("/notifications/clear-all").then(() => undefined),
};
