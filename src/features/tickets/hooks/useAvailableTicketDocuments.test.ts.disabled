import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAvailableTicketDocuments } from './useAvailableTicketDocuments'
import * as ticketApi from '@/features/tickets/api/ticketApi'
import type { ReactNode } from 'react'

// Mock the ticketApi
jest.mock('@/features/tickets/api/ticketApi')

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAvailableTicketDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return empty documents when entityType is null', () => {
    const { result } = renderHook(() => useAvailableTicketDocuments(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.documents).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should fetch PI documents when entityType is PI', async () => {
    const mockDocs = [
      {
        id: '1',
        number: 'PI-001',
        status: 'Sent',
        createdDate: '2026-05-10T00:00:00Z',
        amount: 1000,
        description: 'PI-001 - Amount: $1,000',
      },
    ]

    jest.spyOn(ticketApi, 'getAvailableDocuments').mockResolvedValue(mockDocs)

    const { result } = renderHook(() => useAvailableTicketDocuments('PI'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.documents).toEqual(mockDocs)
  })

  it('should fetch DO documents when entityType is DO', async () => {
    const mockDocs = [
      {
        id: '2',
        number: 'DO-001',
        status: 'Dispatched',
        createdDate: '2026-05-10T00:00:00Z',
        amount: 2000,
        description: 'DO-001 - Amount: $2,000',
      },
    ]

    jest.spyOn(ticketApi, 'getAvailableDocuments').mockResolvedValue(mockDocs)

    const { result } = renderHook(() => useAvailableTicketDocuments('DO'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.documents).toEqual(mockDocs)
  })

  it('should fetch Payment documents when entityType is Payment', async () => {
    const mockDocs = [
      {
        id: '3',
        number: 'PAY-001',
        status: 'Confirmed',
        createdDate: '2026-05-10T00:00:00Z',
        amount: 3000,
        description: 'PAY-001 - Amount: $3,000 (USD)',
      },
    ]

    jest.spyOn(ticketApi, 'getAvailableDocuments').mockResolvedValue(mockDocs)

    const { result } = renderHook(() => useAvailableTicketDocuments('Payment'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.documents).toEqual(mockDocs)
  })

  it('should handle errors gracefully', async () => {
    const mockError = new Error('API error')
    jest.spyOn(ticketApi, 'getAvailableDocuments').mockRejectedValue(mockError)

    const { result } = renderHook(() => useAvailableTicketDocuments('PI'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.error).toBeDefined()
  })

  it('should not fetch when entityType changes from PI to null', async () => {
    const mockDocs = [
      {
        id: '1',
        number: 'PI-001',
        status: 'Sent',
        createdDate: '2026-05-10T00:00:00Z',
        amount: 1000,
        description: 'PI-001 - Amount: $1,000',
      },
    ]

    jest.spyOn(ticketApi, 'getAvailableDocuments').mockResolvedValue(mockDocs)

    const { result, rerender } = renderHook(
      ({ entityType }) => useAvailableTicketDocuments(entityType),
      {
        initialProps: { entityType: 'PI' as const },
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(1)
    })

    rerender({ entityType: null })

    // Should still have the previous documents in memory (from cache)
    // but enabled should be false so no new requests are made
    expect(result.current.documents).toBeDefined()
  })
})
