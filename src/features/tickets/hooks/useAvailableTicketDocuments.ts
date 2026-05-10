import { useQuery } from '@tanstack/react-query'
import { ticketApi, type AvailableDocumentDto } from '@/features/tickets/api/ticketApi'
import { queryKeys } from '@/lib/queryKeys'

export function useAvailableTicketDocuments(entityType: 'PI' | 'DO' | 'Payment' | null) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.tickets.availableDocuments(entityType || 'unknown'),
    queryFn: () => (entityType ? ticketApi.getAvailableDocuments(entityType) : Promise.resolve([])),
    enabled: !!entityType,
  })

  return {
    documents: (data as AvailableDocumentDto[]) || [],
    isLoading,
    isError,
    error,
  }
}
