import { useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import type { NotificationDto } from "@/features/notifications/api/notificationApi";

export function useSignalR() {
  const connectionRef = useRef<any>(null);
  const { accessToken } = useAuthStore();
  const { increment } = useNotificationStore();

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
      // Optionally show toast notification here
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
  }, [accessToken, increment]);

  return connectionRef.current;
}
