import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

export interface NotificationDto {
  id: string;
  type: string;
  message: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; pageSize?: number }) =>
    api
      .get<PagedResult<NotificationDto>>("/notifications", { params })
      .then((r) => r.data),

  markRead: (id: string) => api.post(`/notifications/${id}/read`),

  markAllRead: () => api.post(`/notifications/read-all`),

  delete: (id: string) => api.delete(`/notifications/${id}`),

  deleteAll: () => api.delete(`/notifications`),

  getUnreadCount: () => api.get<number>("/notifications/unread-count").then((r) => r.data),
};
