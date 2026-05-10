import { useQuery } from '@tanstack/react-query'
import {
  configurationApi,
  type ConfigurationTypeDto,
  type ConfigurationGroupDto,
  type ConfigurationParameterDto,
} from '@/lib/configurationApi'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Fetch all entity types (Status, Priority, Role, EnquiryType, etc.)
 */
export function useEntityTypes() {
  return useQuery({
    queryKey: queryKeys.configuration.entityTypes(),
    queryFn: configurationApi.getEntityTypes,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Fetch all priority levels (Low, Medium, High, Critical)
 */
export function usePriorities() {
  return useQuery({
    queryKey: queryKeys.configuration.priorities(),
    queryFn: configurationApi.getPriorities,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Fetch all roles (Admin, Customer, Supplier)
 */
export function useRoles() {
  return useQuery({
    queryKey: queryKeys.configuration.roles(),
    queryFn: configurationApi.getRoles,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Fetch all enquiry types (General, ItemSpecific)
 */
export function useEnquiryTypes() {
  return useQuery({
    queryKey: queryKeys.configuration.enquiryTypes(),
    queryFn: configurationApi.getEnquiryTypes,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Fetch statuses for a specific document type
 * @param documentType - RFQ, Quotation, PurchaseOrder, ProformaInvoice, DeliveryOrder, Enquiry, Ticket, Payment
 */
export function useStatuses(documentType: string) {
  return useQuery({
    queryKey: queryKeys.configuration.statuses(documentType),
    queryFn: () => configurationApi.getStatuses(documentType),
    enabled: !!documentType,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Fetch all groups (organizations) for an entity type
 */
export function useGroups(entityTypeName: string) {
  return useQuery({
    queryKey: queryKeys.configuration.groups(entityTypeName),
    queryFn: () => configurationApi.getGroups(entityTypeName),
    enabled: !!entityTypeName,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Fetch all parameters for an entity type and group
 */
export function useParameters(entityTypeName: string, entityGroupName: string) {
  return useQuery({
    queryKey: queryKeys.configuration.parameters(entityTypeName, entityGroupName),
    queryFn: () =>
      configurationApi.getParameters(entityTypeName, entityGroupName),
    enabled: !!entityTypeName && !!entityGroupName,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Fetch a single parameter by entity type and parameter name
 */
export function useParameter(entityTypeName: string, parameterName: string) {
  return useQuery({
    queryKey: queryKeys.configuration.parameter(entityTypeName, parameterName),
    queryFn: () =>
      configurationApi.getParameter(entityTypeName, parameterName),
    enabled: !!entityTypeName && !!parameterName,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Convenience hook to get statuses as a map by name for easy lookup
 */
export function useStatusesMap(documentType: string) {
  const { data: statuses, ...rest } = useStatuses(documentType)

  const statusMap = statuses?.reduce(
    (acc, status) => {
      acc[status.name] = status
      return acc
    },
    {} as Record<string, ConfigurationParameterDto>
  )

  return { statusMap, statuses, ...rest }
}

/**
 * Convenience hook to get priorities as a map by name for easy lookup
 */
export function usePrioritiesMap() {
  const { data: priorities, ...rest } = usePriorities()

  const priorityMap = priorities?.reduce(
    (acc, priority) => {
      acc[priority.name] = priority
      return acc
    },
    {} as Record<string, ConfigurationParameterDto>
  )

  return { priorityMap, priorities, ...rest }
}

/**
 * Convenience hook to get roles as a map by name for easy lookup
 */
export function useRolesMap() {
  const { data: roles, ...rest } = useRoles()

  const roleMap = roles?.reduce(
    (acc, role) => {
      acc[role.name] = role
      return acc
    },
    {} as Record<string, ConfigurationParameterDto>
  )

  return { roleMap, roles, ...rest }
}
