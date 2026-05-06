import { api } from "@/lib/api";

export interface NotificationPreferenceDto {
  id: string;
  userId: string;
  enableSignalR: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  enableWhatsApp: boolean;
  enableWeChat: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateNotificationPreferenceRequest {
  enableSignalR: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  enableWhatsApp: boolean;
  enableWeChat: boolean;
}

export const notificationsApi = {
  /**
   * GET /api/v1/notifications/preferences
   * Get current user's notification preferences
   */
  getPreferences: (): Promise<NotificationPreferenceDto> =>
    api.get<NotificationPreferenceDto>("/notifications/preferences").then((r) => r.data),

  /**
   * PUT /api/v1/notifications/preferences
   * Update current user's notification preferences
   */
  updatePreferences: (data: UpdateNotificationPreferenceRequest): Promise<NotificationPreferenceDto> =>
    api.put<NotificationPreferenceDto>("/notifications/preferences", data).then((r) => r.data),
};
