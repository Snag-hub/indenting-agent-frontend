import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a nullable monetary value. Returns '—' when the value is null/undefined. */
export function formatCurrency(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null) return '—'
  const sym = currency ?? 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: sym, minimumFractionDigits: 2 }).format(amount)
  } catch {
    return `${sym} ${amount.toFixed(2)}`
  }
}

/** Badge variant for an RFQSupplier invitation status. */
export function supplierStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Quoted':   return 'default'
    case 'Declined': return 'destructive'
    default:         return 'outline'   // Invited / Pending
  }
}
