import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TicketCreationDialog } from './TicketCreationDialog'
import { useTicketStore } from '@/stores/ticketStore'
import { useAuthStore } from '@/stores/authStore'
import * as ticketApi from '@/features/tickets/api/ticketApi'
import type { ReactNode } from 'react'

// Mock modules
jest.mock('@/features/tickets/api/ticketApi')
jest.mock('@/features/tickets/hooks/useAvailableTicketDocuments', () => ({
  useAvailableTicketDocuments: (entityType: string) => {
    const mockDocuments = {
      PI: [
        { id: 'pi-1', number: 'PI-001', status: 'Sent', createdDate: '2026-05-10', amount: 1000, description: 'PI-001' },
      ],
      DO: [
        { id: 'do-1', number: 'DO-001', status: 'Dispatched', createdDate: '2026-05-10', amount: 2000, description: 'DO-001' },
      ],
      Payment: [
        { id: 'pay-1', number: 'PAY-001', status: 'Confirmed', createdDate: '2026-05-10', amount: 3000, description: 'PAY-001' },
      ],
    }
    return {
      documents: mockDocuments[entityType as keyof typeof mockDocuments] || [],
      isLoading: false,
      isError: false,
      error: null,
    }
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('TicketCreationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useTicketStore.setState({
      isOpen: false,
      selectedEntityType: null,
      selectedEntityId: null,
      preFilledTitle: undefined,
      preFilledDescription: undefined,
    })
  })

  it('should not render when dialog is closed', () => {
    useTicketStore.setState({ isOpen: false })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render dialog when isOpen is true', () => {
    useTicketStore.setState({ isOpen: true })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Create Ticket')).toBeInTheDocument()
  })

  it('should show PI and DO tabs for customer', () => {
    useTicketStore.setState({ isOpen: true })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    expect(screen.getByRole('tab', { name: /Proforma Invoice/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Delivery Order/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Payment/i })).not.toBeInTheDocument()
  })

  it('should show only Payment tab for supplier', () => {
    useTicketStore.setState({ isOpen: true })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Supplier' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    expect(screen.getByRole('tab', { name: /Payment/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Proforma Invoice/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Delivery Order/i })).not.toBeInTheDocument()
  })

  it('should show all tabs for admin', () => {
    useTicketStore.setState({ isOpen: true })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Admin' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    expect(screen.getByRole('tab', { name: /Proforma Invoice/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Delivery Order/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Payment/i })).toBeInTheDocument()
  })

  it('should require title field', async () => {
    const user = userEvent.setup()
    useTicketStore.setState({ isOpen: true })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    const createButton = screen.getByRole('button', { name: /Create Ticket/i })
    expect(createButton).toBeDisabled()

    const titleInput = screen.getByPlaceholderText('Brief description of the issue')
    await user.type(titleInput, 'Test Issue')

    expect(createButton).toBeDisabled() // Still disabled because no document selected
  })

  it('should disable create button if document not selected', async () => {
    useTicketStore.setState({ isOpen: true })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    const titleInput = screen.getByPlaceholderText('Brief description of the issue')
    await userEvent.type(titleInput, 'Test Issue')

    const createButton = screen.getByRole('button', { name: /Create Ticket/i })
    expect(createButton).toBeDisabled()
  })

  it('should enable create button when all required fields filled', async () => {
    const user = userEvent.setup()
    useTicketStore.setState({
      isOpen: true,
      selectedEntityType: 'PI',
      selectedEntityId: 'pi-1',
    })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    const titleInput = screen.getByPlaceholderText('Brief description of the issue')
    await user.type(titleInput, 'Test Issue')

    const createButton = screen.getByRole('button', { name: /Create Ticket/i })
    expect(createButton).toBeEnabled()
  })

  it('should close dialog when cancel button clicked', async () => {
    const user = userEvent.setup()
    useTicketStore.setState({ isOpen: true })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(useTicketStore.getState().isOpen).toBe(false)
    })
  })

  it('should submit form with correct data', async () => {
    const user = userEvent.setup()
    jest.spyOn(ticketApi, 'create').mockResolvedValue('ticket-id')

    useTicketStore.setState({
      isOpen: true,
      selectedEntityType: 'PI',
      selectedEntityId: 'pi-1',
    })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    const titleInput = screen.getByPlaceholderText('Brief description of the issue')
    await user.type(titleInput, 'Test PI Issue')

    const descriptionInput = screen.getByPlaceholderText('Provide additional context...')
    await user.type(descriptionInput, 'Test description')

    const createButton = screen.getByRole('button', { name: /Create Ticket/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(ticketApi.create).toHaveBeenCalledWith({
        title: 'Test PI Issue',
        description: 'Test description',
        priority: 'Medium',
        linkedEntityType: 'PI',
        linkedEntityId: 'pi-1',
      })
    })
  })

  it('should display error message on creation failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Failed to create ticket'
    jest.spyOn(ticketApi, 'create').mockRejectedValue(new Error(errorMessage))

    useTicketStore.setState({
      isOpen: true,
      selectedEntityType: 'PI',
      selectedEntityId: 'pi-1',
    })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    const titleInput = screen.getByPlaceholderText('Brief description of the issue')
    await user.type(titleInput, 'Test Issue')

    const createButton = screen.getByRole('button', { name: /Create Ticket/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to create ticket/i)).toBeInTheDocument()
    })
  })

  it('should support priority selection', async () => {
    const user = userEvent.setup()
    jest.spyOn(ticketApi, 'create').mockResolvedValue('ticket-id')

    useTicketStore.setState({
      isOpen: true,
      selectedEntityType: 'DO',
      selectedEntityId: 'do-1',
    })
    useAuthStore.setState({
      user: { id: '1', fullName: 'Test User', email: 'test@example.com', role: 'Customer' },
    })

    render(<TicketCreationDialog />, { wrapper: createWrapper() })

    const prioritySelect = screen.getByDisplayValue('Medium')
    await user.click(prioritySelect)
    const highOption = screen.getByRole('option', { name: 'High' })
    await user.click(highOption)

    const titleInput = screen.getByPlaceholderText('Brief description of the issue')
    await user.type(titleInput, 'High Priority Issue')

    const createButton = screen.getByRole('button', { name: /Create Ticket/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(ticketApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'High',
        })
      )
    })
  })
})
