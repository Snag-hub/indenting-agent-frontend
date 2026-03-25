import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserInfo {
  id: string
  fullName: string
  email: string
  role: 'Admin' | 'Customer' | 'Supplier'
}

interface AuthState {
  user: UserInfo | null
  accessToken: string | null
  refreshToken: string | null
  setTokens: (accessToken: string, refreshToken: string, user: UserInfo) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setTokens: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'auth' }
  )
)
