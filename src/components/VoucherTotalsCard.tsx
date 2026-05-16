import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface VoucherTotals {
  subtotal: number
  discountAmount: number
  discountPercent?: number | null
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  currency?: string | null
}

interface Props {
  totals: VoucherTotals
  /** Label shown on the card header — e.g. "Totals", "Pricing Summary". */
  title?: string
}

function formatMoney(value: number, currency: string | null | undefined): string {
  // Fall back to USD if no currency configured — keeps the formatter happy without
  // misleading the user.
  const code = currency && currency.length === 3 ? currency : 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value)
  } catch {
    // Some currencies (or bad codes) can throw; degrade gracefully.
    return `${currency ?? ''} ${value.toFixed(2)}`.trim()
  }
}

export function VoucherTotalsCard({ totals, title = 'Totals' }: Props) {
  const { subtotal, discountAmount, discountPercent, taxAmount, shippingAmount, totalAmount, currency } = totals

  const rows: { label: string; value: string; muted?: boolean }[] = [
    { label: 'Subtotal', value: formatMoney(subtotal, currency), muted: true },
  ]

  if (discountAmount > 0 || (discountPercent ?? 0) > 0) {
    const pctLabel = discountPercent ? ` (${discountPercent}%)` : ''
    rows.push({ label: `Discount${pctLabel}`, value: `− ${formatMoney(discountAmount, currency)}`, muted: true })
  }
  if (taxAmount > 0) {
    rows.push({ label: 'Tax', value: formatMoney(taxAmount, currency), muted: true })
  }
  if (shippingAmount > 0) {
    rows.push({ label: 'Shipping', value: formatMoney(shippingAmount, currency), muted: true })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <dt className={r.muted ? 'text-muted-foreground' : ''}>{r.label}</dt>
              <dd className="font-mono">{r.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 mt-1">
            <dt className="font-semibold">Grand Total</dt>
            <dd className="font-mono font-semibold">{formatMoney(totalAmount, currency)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
