import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ticketApi } from './ticketApi'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(() => Promise.resolve({ data: 'new-ticket-id' })),
    get: vi.fn(() => Promise.resolve({ data: [] })),
  },
}))

const mockedApi = vi.mocked(api)

describe('ticketApi.create — payload mapping', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps linkedEntityType/linkedEntityId/assignedToId to the backend command field names', async () => {
    await ticketApi.create({
      title: 'PO problem',
      description: 'Something is off',
      priority: 'High',
      assignedToId: 'user-9',
      linkedEntityType: 'PO',
      linkedEntityId: 'po-pk-123',
    })

    expect(mockedApi.post).toHaveBeenCalledWith('/tickets', {
      title: 'PO problem',
      description: 'Something is off',
      priority: 'High',
      assignedToUserId: 'user-9',
      entityType: 'PO',
      entityId: 'po-pk-123',
    })
  })

  it('sends a standalone ticket with undefined link fields (no entityType/entityId)', async () => {
    await ticketApi.create({
      title: 'Standalone',
      description: 'No document',
      priority: 'Medium',
    })

    const body = mockedApi.post.mock.calls[0][1] as Record<string, unknown>
    expect(body.title).toBe('Standalone')
    expect(body.entityType).toBeUndefined()
    expect(body.entityId).toBeUndefined()
    expect(body.assignedToUserId).toBeUndefined()
  })

  it('passes the document PK (entityId), never the document number', async () => {
    await ticketApi.create({
      title: 'Linked by PK',
      description: 'x',
      priority: 'Low',
      linkedEntityType: 'QT',
      linkedEntityId: '019e9d99-1d87-78ec-86fe-88a312ce4c23',
    })

    const body = mockedApi.post.mock.calls[0][1] as Record<string, unknown>
    expect(body.entityId).toBe('019e9d99-1d87-78ec-86fe-88a312ce4c23')
    expect(body.entityType).toBe('QT')
  })

  it('returns the new ticket id from the response', async () => {
    const id = await ticketApi.create({ title: 't', description: 'd', priority: 'Low' })
    expect(id).toBe('new-ticket-id')
  })
})

describe('ticketApi.getAvailableDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['RFQ', 'QT', 'PO', 'PI', 'DO', 'Payment'] as const)(
    'requests available documents for entityType=%s',
    async (entityType) => {
      await ticketApi.getAvailableDocuments(entityType)
      expect(mockedApi.get).toHaveBeenCalledWith('/tickets/available-documents', {
        params: { entityType },
      })
    },
  )
})
