import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/lib/settingsApi'

/** Returns active currencies from the database, cached for the session. */
export function useCurrencies() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['settings', 'currencies'],
    queryFn: settingsApi.getCurrencies,
    staleTime: Infinity, // currencies rarely change — re-fetch only on page reload
  })
  return { currencies: data, isLoading }
}

/** Returns active UI languages from the database, cached for the session. */
export function useLanguages() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['settings', 'languages'],
    queryFn: settingsApi.getLanguages,
    staleTime: Infinity,
  })
  return { languages: data, isLoading }
}
