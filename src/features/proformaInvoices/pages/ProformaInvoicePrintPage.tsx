import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { proformaInvoiceApi } from '@/features/proformaInvoices/api/proformaInvoiceApi'
import { queryKeys } from '@/lib/queryKeys'
import { PrintLayout } from '@/layouts/PrintLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

export function ProformaInvoicePrintPage() {
  const { id } = useParams({ from: '/_app/proforma-invoices/$id/print' })
  const navigate = useNavigate()

  const { data: pi, isLoading } = useQuery({
    queryKey: queryKeys.proformaInvoices.detail(id),
    queryFn: () => proformaInvoiceApi.get(id),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!pi) {
    return <div className="text-muted-foreground p-4">Proforma Invoice not found.</div>
  }

  const totalAmount = (pi.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0)

  return (
    <PrintLayout documentTitle={`Proforma Invoice #${pi.documentNumber}`}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">Proforma Invoice</h1>
            {pi.documentNumber && (
              <p className="text-sm text-muted-foreground">#{pi.documentNumber}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">Status: {pi.status}</p>
            {pi.createdAt && (
              <p className="text-muted-foreground">{format(new Date(pi.createdAt), 'dd MMM yyyy')}</p>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 avoid-break">
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">FROM</p>
            <p className="font-medium text-sm">{pi.supplierName}</p>
            {pi.supplierAddress && (
              <p className="text-xs text-muted-foreground mt-1">{pi.supplierAddress}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">TO</p>
            <p className="font-medium text-sm">{pi.customerName}</p>
            {pi.customerAddress && (
              <p className="text-xs text-muted-foreground mt-1">{pi.customerAddress}</p>
            )}
          </div>
        </div>

        {/* Details */}
        {(pi.dueDate || pi.validUntil) && (
          <div className="grid grid-cols-2 gap-8 text-sm avoid-break">
            {pi.dueDate && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Due Date</p>
                <p className="font-medium">{format(new Date(pi.dueDate), 'dd MMM yyyy')}</p>
              </div>
            )}
            {pi.validUntil && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Valid Until</p>
                <p className="font-medium">{format(new Date(pi.validUntil), 'dd MMM yyyy')}</p>
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        <div className="avoid-break">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-600">
                <th className="text-left py-2 px-2 font-semibold">Item</th>
                <th className="text-right py-2 px-2 font-semibold w-20">Qty</th>
                <th className="text-right py-2 px-2 font-semibold w-24">Unit Price</th>
                <th className="text-right py-2 px-2 font-semibold w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {(pi.items || []).map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 px-2">
                    <p className="font-medium text-xs">{item.customerItemName}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </td>
                  <td className="text-right py-3 px-2">{item.quantity}</td>
                  <td className="text-right py-3 px-2 font-mono">
                    {item.unitPrice?.toFixed(2) || '—'}
                  </td>
                  <td className="text-right py-3 px-2 font-mono font-medium">
                    {item.totalPrice?.toFixed(2) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end avoid-break">
          <div className="w-64">
            <div className="flex justify-between py-2 border-t-2 border-gray-600 pt-4">
              <p className="font-semibold">TOTAL</p>
              <p className="font-mono font-bold text-lg">{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {pi.notes && (
          <div className="avoid-break">
            <p className="text-xs text-muted-foreground font-semibold mb-2">Notes</p>
            <p className="text-xs whitespace-pre-wrap">{pi.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center mt-12 pt-4 border-t">
          <p>This is an electronically generated document. No signature is required.</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="flex gap-2 mt-8 print:hidden">
        <Button onClick={() => window.print()} size="sm">
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: '/proforma-invoices/$id', params: { id } })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    </PrintLayout>
  )
}
