import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAvailableTicketDocuments } from './useAvailableTicketDocuments'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

const wrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const doc = (id: string, number: string) => ({
  id, number, status: 'Open', createdDate: '2026-05-10T00:00:00Z', amount: 0, description: number,
})

describe('useAvailableTicketDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty + does not fetch when entityType is null', () => {
    const { result } = renderHook(() => useAvailableTicketDocuments(null), { wrapper: wrapper() })
    expect(result.current.documents).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(mockedGet).not.toHaveBeenCalled()
  })

  it.each(['RFQ', 'QT', 'PO', 'PI', 'DO', 'Payment'] as const)(
    'fetches documents for entityType=%s',
    async (entityType) => {
      mockedGet.mockResolvedValueOnce({ data: [doc('pk-1', `${entityType}-001`)] })

      const { result } = renderHook(() => useAvailableTicketDocuments(entityType), { wrapper: wrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(mockedGet).toHaveBeenCalledWith('/tickets/available-documents', { params: { entityType } })
      expect(result.current.documents).toHaveLength(1)
      expect(result.current.documents[0].number).toBe(`${entityType}-001`)
    },
  )

  it('surfaces errors via isError', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useAvailableTicketDocuments('PO'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})
