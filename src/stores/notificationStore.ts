import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  isConnected: boolean;
  connectionError: string | null;
  setUnreadCount: (n: number) => void;
  increment: () => void;
  decrement: () => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  isConnected: false,
  connectionError: null,
  setUnreadCount: (n: number) => set({ unreadCount: n }),
  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrement: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  setConnected: (connected: boolean) => set({ isConnected: connected }),
  setConnectionError: (error: string | null) => set({ connectionError: error }),
}));
