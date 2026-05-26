import { useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import type { NotificationDto } from "@/features/notifications/api/notificationApi";

export function useSignalR() {
  const connectionRef = useRef<any>(null);
  const { accessToken } = useAuthStore();
  const { increment } = useNotificationStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ?? "";
    const hubUrl = `${baseUrl}/hubs/notifications`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => accessToken,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Debug)
      .build();

    connection.on("notification", (_dto: NotificationDto) => {
      increment();
      // Invalidate the list so the panel reflects the new notification immediately
      qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    });

    connection
      .start()
      .then(() => {
        console.log("SignalR connected");
        connectionRef.current = connection;
      })
      .catch((err) => console.error("SignalR connection error:", err));

    return () => {
      if (connectionRef.current) {
        connectionRef.current
          .stop()
          .catch((err: any) => console.error("SignalR disconnect error:", err));
      }
    };
  }, [accessToken, increment, qc]);

  return connectionRef.current;
}
