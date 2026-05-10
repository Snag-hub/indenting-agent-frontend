import { api } from './api'

export interface ConfigurationTypeDto {
  id: number
  name: string
  displayName: string
  description?: string
  isActive: boolean
}

export interface ConfigurationGroupDto {
  id: number
  entityTypeId: number
  name: string
  displayName: string
  tenantId: string
  isActive: boolean
}

export interface ConfigurationParameterDto {
  id: number
  entityTypeId: number
  name: string
  displayName: string
  displayOrder: number
  isActive: boolean
  metadata?: string
}

export const configurationApi = {
  // Get all entity types
  getEntityTypes: async (): Promise<ConfigurationTypeDto[]> => {
    const { data } = await api.get('/configuration/entity-types')
    return data
  },

  // Get all priorities
  getPriorities: async (): Promise<ConfigurationParameterDto[]> => {
    const { data } = await api.get('/configuration/priorities')
    return data
  },

  // Get all roles
  getRoles: async (): Promise<ConfigurationParameterDto[]> => {
    const { data } = await api.get('/configuration/roles')
    return data
  },

  // Get all enquiry types
  getEnquiryTypes: async (): Promise<ConfigurationParameterDto[]> => {
    const { data } = await api.get('/configuration/enquiry-types')
    return data
  },

  // Get statuses for a document type (Status → RFQ, Quotation, PurchaseOrder, etc.)
  getStatuses: async (
    documentType: string
  ): Promise<ConfigurationParameterDto[]> => {
    const { data } = await api.get(`/configuration/statuses/${documentType}`)
    return data
  },

  // Get all groups for an entity type
  getGroups: async (
    entityTypeName: string
  ): Promise<ConfigurationGroupDto[]> => {
    const { data } = await api.get(
      `/configuration/entity-type/${entityTypeName}/groups`
    )
    return data
  },

  // Get all parameters for an entity type and group
  getParameters: async (
    entityTypeName: string,
    entityGroupName: string
  ): Promise<ConfigurationParameterDto[]> => {
    const { data } = await api.get(
      `/configuration/entity-type/${entityTypeName}/groups/${entityGroupName}/parameters`
    )
    return data
  },

  // Get a single parameter by entity type and parameter name
  getParameter: async (
    entityTypeName: string,
    parameterName: string
  ): Promise<ConfigurationParameterDto | null> => {
    try {
      const { data } = await api.get(
        `/configuration/entity-type/${entityTypeName}/parameter/${parameterName}`
      )
      return data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },
}
