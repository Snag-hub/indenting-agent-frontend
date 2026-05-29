import { useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { notificationApi, type NotificationDto } from "@/features/notifications/api/notificationApi";

export function useSignalR() {
  const connectionRef = useRef<any>(null);
  const { accessToken } = useAuthStore();
  const { increment, setUnreadCount, setConnected, setConnectionError } = useNotificationStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ?? "";
    const hubUrl = `${baseUrl}/hubs/notifications`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        // Always reads the current token from the store so reconnects after a
        // token refresh don't use a stale JWT.
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnected(() => {
      setConnected(true);
      setConnectionError(null);
      // Re-sync unread count for any notifications received while offline.
      notificationApi
        .getUnreadCount()
        .then(setUnreadCount)
        .catch(() => {/* ignore — badge stays at last known value */});
      qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    });

    connection.onreconnecting(() => {
      setConnected(false);
    });

    connection.onclose((err) => {
      setConnected(false);
      if (err) {
        setConnectionError("Real-time notifications disconnected. Refresh the page to reconnect.");
      }
    });

    connection
      .start()
      .then(() => {
        setConnected(true);
        setConnectionError(null);
        connectionRef.current = connection;
      })
      .catch((err) => {
        setConnected(false);
        setConnectionError("Could not connect to real-time notifications.");
        console.error("SignalR connection error:", err);
      });

    // Register the handler only after start() succeeds via onreconnected / initial start.
    // Registering before start() is safe in SignalR JS but we do it here for clarity.
    connection.on("notification", (_dto: NotificationDto) => {
      increment();
      qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    });

    return () => {
      connection
        .stop()
        .catch((err: any) => console.error("SignalR disconnect error:", err));
      connectionRef.current = null;
    };
  }, [accessToken, increment, setUnreadCount, setConnected, setConnectionError, qc]);

  return connectionRef.current;
}
