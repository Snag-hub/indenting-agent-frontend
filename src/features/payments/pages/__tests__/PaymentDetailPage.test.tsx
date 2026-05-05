import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

// Mocks
const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ id: 'payment-id-1' }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { role: 'Supplier' } })
}))

const mockPayment = {
  id: 'payment-id-1',
  purchaseOrderId: 'po-1',
  customerId: 'cust-1',
  supplierId: 'sup-1',
  amount: 123.45,
  currency: 'USD',
  paymentMethod: 'Bank Transfer',
  referenceNumber: 'PAY-001',
  notes: 'Test payment',
  supplierName: 'ACME Supplies',
  status: 'Pending',
  createdAt: new Date().toISOString(),
}

vi.mock('@/features/payments/api/paymentApi', () => ({
  paymentApi: {
    get: vi.fn(() => Promise.resolve(mockPayment)),
    confirm: vi.fn(() => Promise.resolve()),
    reject: vi.fn(() => Promise.resolve()),
  },
}))

// Mock AttachmentPanel to avoid network calls during unit tests
vi.mock('@/components/AttachmentPanel', () => ({
  AttachmentPanel: (props: any) => {
    return (
      <div data-testid="attachment-panel">Attachments for {props.entityType} {props.entityId}</div>
    )
  },
}))

// Import after mocks
import { PaymentDetailPage } from '../PaymentDetailPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const renderWithQuery = (ui: any) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('PaymentDetailPage', () => {
  it('navigates to create ticket with correct query when Create Ticket clicked', async () => {
    renderWithQuery(<PaymentDetailPage />)

    // Wait for payment title to appear
    await waitFor(() => expect(screen.getByText(/Payment #PAY-001/)).toBeDefined())

    const createBtn = screen.getByRole('button', { name: /create ticket/i })
    await userEvent.click(createBtn)

    expect(navigateMock).toHaveBeenCalled()
    // The navigate is called with an object containing to and search
    const callArg = navigateMock.mock.calls[0][0]
    expect(callArg).toBeDefined()
    expect(callArg.to).toBe('/tickets/new')
    expect(callArg.search).toEqual({ entityType: 'Payment', entityId: mockPayment.id, entityNumber: mockPayment.referenceNumber })
  })
})
