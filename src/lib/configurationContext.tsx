import React, { createContext, useContext, ReactNode } from 'react'
import {
  useEntityTypes,
  usePriorities,
  useRoles,
  useEnquiryTypes,
} from '@/hooks/useConfiguration'
import type {
  ConfigurationTypeDto,
  ConfigurationParameterDto,
} from './configurationApi'

interface ConfigurationContextType {
  entityTypes: ConfigurationTypeDto[] | undefined
  priorities: ConfigurationParameterDto[] | undefined
  roles: ConfigurationParameterDto[] | undefined
  enquiryTypes: ConfigurationParameterDto[] | undefined
  isLoading: boolean
  error: Error | null
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(
  undefined
)

export function ConfigurationProvider({ children }: { children: ReactNode }) {
  const { data: entityTypes, isLoading: typesLoading } = useEntityTypes()
  const { data: priorities, isLoading: prioritiesLoading } = usePriorities()
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const { data: enquiryTypes, isLoading: enquiryTypesLoading } =
    useEnquiryTypes()

  const isLoading =
    typesLoading || prioritiesLoading || rolesLoading || enquiryTypesLoading

  const value: ConfigurationContextType = {
    entityTypes,
    priorities,
    roles,
    enquiryTypes,
    isLoading,
    error: null,
  }

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  )
}

export function useConfigurationContext() {
  const context = useContext(ConfigurationContext)
  if (context === undefined) {
    throw new Error(
      'useConfigurationContext must be used within ConfigurationProvider'
    )
  }
  return context
}
