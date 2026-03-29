import { Badge } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

const STATUS_VARIANT_MAP: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  // Generic
  active: 'success',
  inactive: 'secondary',
  deleted: 'destructive',
  // RFQ / workflow
  draft: 'secondary',
  sent: 'default',
  open: 'default',
  closed: 'secondary',
  cancelled: 'destructive',
  // Quotation
  submitted: 'warning',
  accepted: 'success',
  rejected: 'destructive',
  // PO / PI / DO
  confirmed: 'success',
  pending: 'warning',
  dispatched: 'default',
  delivered: 'success',
  partial: 'warning',
}

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = STATUS_VARIANT_MAP[status.toLowerCase()] ?? 'secondary'
  return (
    <Badge variant={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
