import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  increment: () => void;
  decrement: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n: number) => set({ unreadCount: n }),
  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrement: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));
