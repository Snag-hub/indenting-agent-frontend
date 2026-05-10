import { renderHook, act } from '@testing-library/react'
import { useTicketStore } from './ticketStore'

describe('useTicketStore', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTicketStore())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.selectedEntityType).toBeNull()
    expect(result.current.selectedEntityId).toBeNull()
    expect(result.current.preFilledTitle).toBeUndefined()
    expect(result.current.preFilledDescription).toBeUndefined()
  })

  it('should open dialog with openDialog', () => {
    const { result } = renderHook(() => useTicketStore())

    act(() => {
      result.current.openDialog('PI', 'test-pi-id')
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.selectedEntityType).toBe('PI')
    expect(result.current.selectedEntityId).toBe('test-pi-id')
  })

  it('should open dialog with pre-filled fields', () => {
    const { result } = renderHook(() => useTicketStore())

    act(() => {
      result.current.openDialog('DO', 'test-do-id', 'Delivery Issue', 'Package not received')
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.selectedEntityType).toBe('DO')
    expect(result.current.selectedEntityId).toBe('test-do-id')
    expect(result.current.preFilledTitle).toBe('Delivery Issue')
    expect(result.current.preFilledDescription).toBe('Package not received')
  })

  it('should close dialog with closeDialog', () => {
    const { result } = renderHook(() => useTicketStore())

    act(() => {
      result.current.openDialog('Payment', 'test-payment-id')
    })

    act(() => {
      result.current.closeDialog()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.selectedEntityType).toBeNull()
    expect(result.current.selectedEntityId).toBeNull()
  })

  it('should set selected entity', () => {
    const { result } = renderHook(() => useTicketStore())

    act(() => {
      result.current.openDialog('PI')
    })

    act(() => {
      result.current.setSelectedEntity('PI', 'new-pi-id')
    })

    expect(result.current.selectedEntityId).toBe('new-pi-id')
    expect(result.current.selectedEntityType).toBe('PI')
  })

  it('should reset selection', () => {
    const { result } = renderHook(() => useTicketStore())

    act(() => {
      result.current.openDialog('DO', 'test-do-id')
    })

    act(() => {
      result.current.resetSelection()
    })

    expect(result.current.selectedEntityType).toBeNull()
    expect(result.current.selectedEntityId).toBeNull()
  })

  it('should clear dialog state on closeDialog', () => {
    const { result } = renderHook(() => useTicketStore())

    act(() => {
      result.current.openDialog('PI', 'test-pi-id', 'Test Title', 'Test Description')
    })

    expect(result.current.preFilledTitle).toBe('Test Title')
    expect(result.current.preFilledDescription).toBe('Test Description')

    act(() => {
      result.current.closeDialog()
    })

    expect(result.current.preFilledTitle).toBeUndefined()
    expect(result.current.preFilledDescription).toBeUndefined()
  })

  it('should open dialog without entity type', () => {
    const { result } = renderHook(() => useTicketStore())

    act(() => {
      result.current.openDialog()
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.selectedEntityType).toBeNull()
    expect(result.current.selectedEntityId).toBeNull()
  })
})
