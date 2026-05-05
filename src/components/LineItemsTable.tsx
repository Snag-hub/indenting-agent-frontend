import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface LineItemVariant {
  id: string
  dimensionSummary?: string | null
  sku?: string | null
  quantity: number
}

export interface LineItem {
  id: string
  name: string
  supplierName?: string | null
  quantity: number
  notes?: string | null
  variants?: LineItemVariant[] | null
}

interface LineItemsTableProps {
  items: LineItem[]
  /** Extra column headers beyond Item / Qty / Notes */
  extraHeaders?: React.ReactNode[]
  /** Render extra cells per item row. Receives the item. */
  extraCells?: (item: LineItem) => React.ReactNode[]
  emptyMessage?: string
}

export function LineItemsTable({
  items,
  extraHeaders = [],
  extraCells,
  emptyMessage = 'No line items.',
}: LineItemsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const colSpan = 3 + extraHeaders.length

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Qty</TableHead>
            {extraHeaders.map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground text-sm py-6">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            items.flatMap((item) => {
              const hasVariants = !!item.variants?.length
              const isExpanded = expanded.has(item.id)
              const extra = extraCells?.(item) ?? []

              const rows: React.ReactNode[] = [
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      {hasVariants && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 shrink-0"
                          onClick={() => toggle(item.id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.supplierName && (
                          <div className="text-xs text-muted-foreground">{item.supplierName}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {item.quantity}
                    {hasVariants && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {item.variants!.length} variant{item.variants!.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </TableCell>
                  {extra.map((cell, i) => (
                    <TableCell key={i} className="text-sm">{cell}</TableCell>
                  ))}
                  <TableCell className="text-sm">
                    {item.notes ? item.notes : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>,
              ]

              if (hasVariants && isExpanded) {
                item.variants!.forEach((v) => {
                  rows.push(
                    <TableRow key={`${item.id}-v-${v.id}`} className="bg-muted/30">
                      <TableCell className="text-xs pl-10 py-2 text-muted-foreground">
                        {v.dimensionSummary || <span className="italic">No dimensions</span>}
                        {v.sku && (
                          <span className="ml-2 font-mono text-[11px]">· {v.sku}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">
                        {v.quantity}
                      </TableCell>
                      {extra.map((_, i) => (
                        <TableCell key={i} className="py-2" />
                      ))}
                      <TableCell className="py-2" />
                    </TableRow>
                  )
                })
              }

              return rows
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
