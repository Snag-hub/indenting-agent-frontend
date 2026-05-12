import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'Admin' | 'Customer' | 'Supplier'
export type OrganisationType = 'Admin' | 'Customer' | 'Supplier'
export type UserStatus = 'Invited' | 'Active' | 'Disabled'

export interface UserInfo {
  id: string
  fullName: string
  email: string
  role: Role
  organisationType: OrganisationType
  customerId: string | null
  supplierId: string | null
  isOrgAdmin: boolean
  status: UserStatus
}

interface AuthState {
  user: UserInfo | null
  accessToken: string | null
  refreshToken: string | null
  setTokens: (accessToken: string, refreshToken: string, user: UserInfo) => void
  setUser: (user: UserInfo) => void
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
      setUser: (user) => set({ user }),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'auth' }
  )
)
