import { create } from 'zustand'

interface TicketDialogState {
  isOpen: boolean
  selectedEntityType: 'PI' | 'DO' | 'Payment' | null
  selectedEntityId: string | null
  preFilledTitle?: string
  preFilledDescription?: string

  openDialog: (entityType?: 'PI' | 'DO' | 'Payment', entityId?: string, title?: string, description?: string) => void
  closeDialog: () => void
  setSelectedEntity: (entityType: 'PI' | 'DO' | 'Payment', entityId: string) => void
  resetSelection: () => void
}

export const useTicketStore = create<TicketDialogState>((set) => ({
  isOpen: false,
  selectedEntityType: null,
  selectedEntityId: null,
  preFilledTitle: undefined,
  preFilledDescription: undefined,

  openDialog: (entityType, entityId, title, description) =>
    set({
      isOpen: true,
      selectedEntityType: entityType || null,
      selectedEntityId: entityId || null,
      preFilledTitle: title,
      preFilledDescription: description,
    }),

  closeDialog: () =>
    set({
      isOpen: false,
      selectedEntityType: null,
      selectedEntityId: null,
      preFilledTitle: undefined,
      preFilledDescription: undefined,
    }),

  setSelectedEntity: (entityType, entityId) =>
    set({
      selectedEntityType: entityType,
      selectedEntityId: entityId,
    }),

  resetSelection: () =>
    set({
      selectedEntityType: null,
      selectedEntityId: null,
    }),
}))
