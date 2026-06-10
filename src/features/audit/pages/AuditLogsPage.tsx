import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi, type AuditLogDto } from '@/features/audit/api/auditApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, X, FileSearch } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

const ENTITY_TYPES = [
  { value: 'all', label: 'All Entity Types' },
  { value: 'Enquiry', label: 'Enquiry' },
  { value: 'RFQ', label: 'RFQ' },
  { value: 'Quotation', label: 'Quotation' },
  { value: 'PurchaseOrder', label: 'Purchase Order' },
  { value: 'ProformaInvoice', label: 'Proforma Invoice' },
  { value: 'DeliveryOrder', label: 'Delivery Order' },
  { value: 'Payment', label: 'Payment' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Supplier', label: 'Supplier' },
]

const ACTION_COLORS: Record<string, string> = {
  Created: 'bg-green-50 text-green-700 border-green-200',
  Updated: 'bg-blue-50 text-blue-700 border-blue-200',
  Deleted: 'bg-red-50 text-red-700 border-red-200',
  StatusChanged: 'bg-purple-50 text-purple-700 border-purple-200',
  Restored: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-teal-50 text-teal-700 border-teal-200',
}

function ActionBadge({ action }: { action: string }) {
  const colorClass = ACTION_COLORS[action] ?? 'bg-slate-50 text-slate-700 border-slate-200'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', colorClass)}>
      {action}
    </span>
  )
}

function ValueDiff({ oldValue, newValue }: { oldValue?: string | null; newValue?: string | null }) {
  if (!oldValue && !newValue) return <span className="text-muted-foreground">—</span>
  if (!oldValue && newValue) return <span className="text-sm">{newValue}</span>
  if (oldValue && !newValue) return <span className="text-sm line-through text-muted-foreground">{oldValue}</span>
  return (
    <span className="text-sm">
      <span className="line-through text-muted-foreground">{oldValue}</span>
      <span className="mx-1 text-muted-foreground">→</span>
      <span className="font-medium">{newValue}</span>
    </span>
  )
}

const PAGE_SIZE = 50

export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [entityIdInput, setEntityIdInput] = useState('')
  const entityId = useDebounce(entityIdInput, 400)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auditLogs.list({
      page,
      pageSize: PAGE_SIZE,
      entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
      entityId: entityId || undefined,
    }),
    queryFn: () =>
      auditApi.list({
        page,
        pageSize: PAGE_SIZE,
        entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
        entityId: entityId || undefined,
      }),
    staleTime: 30_000,
  })

  const logs: AuditLogDto[] = data?.data ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const hasFilters = entityTypeFilter !== 'all' || entityIdInput !== ''

  const clearFilters = () => {
    setEntityTypeFilter('all')
    setEntityIdInput('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description={`Complete change history for all entities in your tenant.${totalCount > 0 ? ` ${totalCount.toLocaleString()} total entries.` : ''}`}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={entityTypeFilter}
          onValueChange={(v) => { setEntityTypeFilter(v); setPage(1) }}
        >
          <SelectTrigger className="h-9 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            placeholder="Filter by Entity ID (UUID)…"
            value={entityIdInput}
            onChange={(e) => { setEntityIdInput(e.target.value); setPage(1) }}
            className="h-9 w-72 pr-8 font-mono text-sm"
          />
          {entityIdInput && (
            <button
              onClick={() => { setEntityIdInput(''); setPage(1) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileSearch className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {hasFilters ? 'No audit logs match your filters.' : 'No audit logs found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
                        <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[180px]">
                          {log.entityId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <ValueDiff oldValue={log.oldValue} newValue={log.newValue} />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {log.changedByName ?? (
                          <span className="text-xs font-mono text-muted-foreground">
                            {log.changedById.slice(0, 8)}…
                          </span>
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.changedAt), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {totalCount.toLocaleString()} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
