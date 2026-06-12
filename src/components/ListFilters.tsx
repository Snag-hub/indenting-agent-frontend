import { X, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

export interface ListFiltersProps {
  /** Free-text search — parent should debounce before passing to the API */
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string

  status?: string
  onStatusChange?: (v: string) => void
  statusOptions?: FilterOption[]

  fromDate?: string
  onFromDateChange?: (v: string) => void
  toDate?: string
  onToDateChange?: (v: string) => void
  /** Available date fields (e.g. createdAt, dueDate). Omit when only createdAt applies. */
  dateFields?: FilterOption[]
  dateField?: string
  onDateFieldChange?: (v: string) => void

  /** Admin-only: supplier dropdown. Omit to hide. */
  supplierId?: string
  onSupplierChange?: (v: string) => void
  supplierOptions?: FilterOption[]

  /** Admin-only: customer dropdown. Omit to hide. */
  customerId?: string
  onCustomerChange?: (v: string) => void
  customerOptions?: FilterOption[]

  onClear: () => void
  className?: string
}

export function ListFilters({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  status,
  onStatusChange,
  statusOptions,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  dateFields,
  dateField,
  onDateFieldChange,
  supplierId,
  onSupplierChange,
  supplierOptions,
  customerId,
  onCustomerChange,
  customerOptions,
  onClear,
  className,
}: ListFiltersProps) {
  const activeCount = [
    search,
    status,
    fromDate,
    toDate,
    supplierId,
    customerId,
  ].filter(Boolean).length

  const hasDateFilter = onFromDateChange || onToDateChange
  const hasDateFieldSelect = dateFields && dateFields.length > 1 && onDateFieldChange

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Search */}
      {onSearchChange && (
        <div className="relative">
          <Input
            placeholder={searchPlaceholder}
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-64 pr-7 text-sm"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Status */}
      {statusOptions && onStatusChange && (
        <Select
          value={status || 'all'}
          onValueChange={(v) => onStatusChange(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date field selector */}
      {hasDateFieldSelect && (
        <Select value={dateField || dateFields![0].value} onValueChange={onDateFieldChange}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateFields!.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date range */}
      {hasDateFilter && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">From</span>
          <Input
            type="date"
            value={fromDate ?? ''}
            onChange={(e) => onFromDateChange?.(e.target.value)}
            className="h-9 w-36 text-sm"
            max={toDate || undefined}
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={toDate ?? ''}
            onChange={(e) => onToDateChange?.(e.target.value)}
            className="h-9 w-36 text-sm"
            min={fromDate || undefined}
          />
        </div>
      )}

      {/* Supplier (admin) */}
      {supplierOptions && onSupplierChange && (
        <Select
          value={supplierId || 'all'}
          onValueChange={(v) => onSupplierChange(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {supplierOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Customer (admin) */}
      {customerOptions && onCustomerChange && (
        <Select
          value={customerId || 'all'}
          onValueChange={(v) => onCustomerChange(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customerOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-9 gap-1.5 text-sm text-muted-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Clear
          <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold h-4 w-4">
            {activeCount}
          </span>
        </Button>
      )}
    </div>
  )
}
