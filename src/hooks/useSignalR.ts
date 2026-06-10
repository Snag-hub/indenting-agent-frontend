import { useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel, type HubConnection } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { notificationApi } from "@/features/notifications/api/notificationApi";
import { queryKeys } from "@/lib/queryKeys";

export function useSignalR() {
  const connectionRef = useRef<HubConnection | null>(null);
  const { accessToken } = useAuthStore();
  const { increment, setUnreadCount, setConnected, setConnectionError } = useNotificationStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    // Guard flag — prevents stale async callbacks from mutating state after
    // this effect has been cleaned up (e.g. on token change / unmount).
    let destroyed = false;

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
      if (destroyed) return;
      setConnected(true);
      setConnectionError(null);
      // Re-sync unread count for any notifications received while offline.
      notificationApi
        .getUnreadCount()
        .then((count) => { if (!destroyed) setUnreadCount(count); })
        .catch(() => {/* ignore — badge stays at last known value */});
      qc.invalidateQueries({ queryKey: ["notifications", "infinite"] });
      qc.invalidateQueries({ queryKey: queryKeys.threads.unreadCount() });
    });

    connection.onreconnecting(() => {
      if (!destroyed) setConnected(false);
    });

    connection.onclose((err) => {
      if (destroyed) return;
      setConnected(false);
      if (err) {
        setConnectionError("Real-time notifications disconnected. Refresh the page to reconnect.");
      }
    });

    connection.on("notification", () => {
      if (destroyed) return;
      increment();
      qc.invalidateQueries({ queryKey: ["notifications", "infinite"] });
      // Thread messages generate bell notifications via FanoutAsync — invalidate
      // the nav badge so it reflects the new unread thread immediately.
      qc.invalidateQueries({ queryKey: queryKeys.threads.unreadCount() });
    });

    connection
      .start()
      .then(() => {
        if (destroyed) return;
        setConnected(true);
        setConnectionError(null);
        connectionRef.current = connection;
      })
      .catch((err) => {
        if (destroyed) return;
        setConnected(false);
        setConnectionError("Could not connect to real-time notifications.");
        console.error("SignalR connection error:", err);
      });

    return () => {
      destroyed = true;
      connectionRef.current = null;
      connection
        .stop()
        .catch((err: unknown) => console.error("SignalR disconnect error:", err));
    };
  }, [accessToken, increment, setUnreadCount, setConnected, setConnectionError, qc]);

  // eslint-disable-next-line react-hooks/refs
  return connectionRef.current;
}
