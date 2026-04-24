import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { deliveryOrderApi } from '@/features/deliveryOrders/api/deliveryOrderApi'
import { queryKeys } from '@/lib/queryKeys'
import { PrintLayout } from '@/layouts/PrintLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

export function DeliveryOrderPrintPage() {
  const { id } = useParams({ from: '/_app/delivery-orders/$id/print' })
  const navigate = useNavigate()

  const { data: DO, isLoading } = useQuery({
    queryKey: queryKeys.deliveryOrders.detail(id),
    queryFn: () => deliveryOrderApi.get(id),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!DO) {
    return <div className="text-muted-foreground p-4">Delivery Order not found.</div>
  }

  const totalQty = (DO.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <PrintLayout documentTitle={`Delivery Order #${DO.documentNumber}`}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">Delivery Order</h1>
            {DO.documentNumber && (
              <p className="text-sm text-muted-foreground">#{DO.documentNumber}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">Status: {DO.status}</p>
            {DO.createdAt && (
              <p className="text-muted-foreground">{format(new Date(DO.createdAt), 'dd MMM yyyy')}</p>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 avoid-break">
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">FROM</p>
            <p className="font-medium text-sm">{DO.supplierName}</p>
            {DO.supplierAddress && (
              <p className="text-xs text-muted-foreground mt-1">{DO.supplierAddress}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">TO/RECEIVER</p>
            <p className="font-medium text-sm">{DO.customerName}</p>
            {DO.deliveryAddress && (
              <p className="text-xs text-muted-foreground mt-1">{DO.deliveryAddress}</p>
            )}
          </div>
        </div>

        {/* Details */}
        {(DO.deliveryDate || DO.poReference) && (
          <div className="grid grid-cols-2 gap-8 text-sm avoid-break">
            {DO.deliveryDate && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Delivery Date</p>
                <p className="font-medium">{format(new Date(DO.deliveryDate), 'dd MMM yyyy')}</p>
              </div>
            )}
            {DO.poReference && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">PO Reference</p>
                <p className="font-medium">{DO.poReference}</p>
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
                <th className="text-left py-2 px-2 font-semibold w-20">SKU</th>
                <th className="text-right py-2 px-2 font-semibold w-20">Qty</th>
                <th className="text-right py-2 px-2 font-semibold w-24">Received</th>
              </tr>
            </thead>
            <tbody>
              {(DO.items || []).map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3 px-2">
                    <p className="font-medium text-xs">{item.supplierItemName}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </td>
                  <td className="py-3 px-2 font-mono text-xs">{item.sku || '—'}</td>
                  <td className="text-right py-3 px-2">{item.quantity}</td>
                  <td className="text-right py-3 px-2">
                    <span className="border border-gray-300 px-2 py-1 rounded text-xs">
                      _______
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end avoid-break">
          <div className="w-64">
            <div className="flex justify-between py-2 border-t-2 border-gray-600 pt-4">
              <p className="font-semibold">TOTAL ITEMS</p>
              <p className="font-mono font-bold">{totalQty}</p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 avoid-break mt-12">
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs font-semibold">Prepared By</p>
            <p className="text-xs text-muted-foreground mt-4">_________________</p>
            <p className="text-xs text-muted-foreground">Date: _________</p>
          </div>
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs font-semibold">Delivered By</p>
            <p className="text-xs text-muted-foreground mt-4">_________________</p>
            <p className="text-xs text-muted-foreground">Date: _________</p>
          </div>
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs font-semibold">Received By</p>
            <p className="text-xs text-muted-foreground mt-4">_________________</p>
            <p className="text-xs text-muted-foreground">Date: _________</p>
          </div>
        </div>

        {/* Notes */}
        {DO.notes && (
          <div className="avoid-break">
            <p className="text-xs text-muted-foreground font-semibold mb-2">Special Instructions</p>
            <p className="text-xs whitespace-pre-wrap">{DO.notes}</p>
          </div>
        )}
      </div>

      {/* Print Button */}
      <div className="flex gap-2 mt-8 print:hidden">
        <Button onClick={() => window.print()} size="sm">
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: '/delivery-orders/$id', params: { id } })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    </PrintLayout>
  )
}
