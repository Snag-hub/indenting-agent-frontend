import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401: attempt token refresh, retry once, else logout
let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const { refreshToken, setTokens, clearAuth } = useAuthStore.getState()
    if (!refreshToken) {
      clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original!.headers!['Authorization'] = `Bearer ${token}`
          resolve(api(original!))
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      // We need the userId — read from store user
      const userId = useAuthStore.getState().user?.id
      const { data } = await axios.post('/api/v1/auth/refresh', {
        userId,
        refreshToken,
      })
      setTokens(data.accessToken, data.refreshToken, data.user)
      queue.forEach((cb) => cb(data.accessToken))
      queue = []
      original!.headers!['Authorization'] = `Bearer ${data.accessToken}`
      return api(original!)
    } catch {
      clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)
