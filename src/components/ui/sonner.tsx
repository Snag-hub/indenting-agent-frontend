import { Toaster as Sonner } from 'sonner'

/**
 * App-wide toast provider.
 * Drop this once inside the component tree (in main.tsx) and then call
 * `toast.success(msg)` / `toast.error(msg)` from any mutation's
 * `onSuccess` / `onError` callback — no prop drilling required.
 *
 * @example
 *   // In a mutation:
 *   onSuccess: () => toast.success('Ticket created'),
 *   onError:   () => toast.error('Something went wrong'),
 */
export function Toaster() {
  return (
    <Sonner
      richColors
      position="bottom-right"
      closeButton
      duration={4000}
    />
  )
}
