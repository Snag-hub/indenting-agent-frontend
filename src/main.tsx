import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { Toaster } from '@/components/ui/sonner'
import { ConfigurationProvider } from '@/lib/configurationContext'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigurationProvider>
        <RouterProvider router={router} />
        {/* Global toast provider — call toast.success() / toast.error() from any mutation */}
        <Toaster />
      </ConfigurationProvider>
    </QueryClientProvider>
  </StrictMode>,
)
