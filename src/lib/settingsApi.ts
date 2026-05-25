import { api } from '@/lib/api'

export interface CurrencyDto {
  code: string
  name: string
  symbol: string
}

export interface LanguageDto {
  code: string
  name: string
  nativeName: string
  isDefault: boolean
  direction: 'ltr' | 'rtl'
}

export const settingsApi = {
  getCurrencies: (): Promise<CurrencyDto[]> =>
    api.get<CurrencyDto[]>('/settings/currencies').then((r) => r.data),

  getLanguages: (): Promise<LanguageDto[]> =>
    api.get<LanguageDto[]>('/settings/languages').then((r) => r.data),
}
