import { useEffect } from 'react'

const APP_NAME = 'IndentingAgent'

/**
 * Sets document.title to "<pageTitle> | IndentingAgent" while the component is mounted.
 * Falls back to just the app name when no title is provided.
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    return () => {
      document.title = prev
    }
  }, [title])
}
