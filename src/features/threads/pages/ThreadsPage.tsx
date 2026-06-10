import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { threadApi } from '@/features/threads/api/threadApi'
import { customerApi } from '@/features/accounts/api/customerApi'
import { supplierApi } from '@/features/accounts/api/supplierApi'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Filter, AlertCircle, MessageSquare, ArrowLeft } from 'lucide-react'
import { ThreadListPane } from '@/features/threads/components/ThreadListPane'
import { ThreadDetailPane } from '@/features/threads/components/ThreadDetailPane'

const ENTITY_TYPES = [
  { value: 'all', label: 'All Entities' },
  { value: 'PurchaseOrder', label: 'Purchase Orders' },
  { value: 'DeliveryOrder', label: 'Delivery Orders' },
  { value: 'ProformaInvoice', label: 'Proforma Invoices' },
  { value: 'RFQ', label: 'RFQs' },
  { value: 'Enquiry', label: 'Enquiries' },
  { value: 'Quotation', label: 'Quotations' },
  { value: 'Ticket', label: 'Tickets' },
]

const SORT_OPTIONS = [
  { value: 'lastActivity', label: 'Last Activity' },
  { value: 'created', label: 'Created Date' },
]

export function ThreadsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'
  const isSupplier = user?.role === 'Supplier'
  const isCustomer = user?.role === 'Customer'
  const { threadId: preselectedThreadId } = useSearch({ from: '/_app/threads' })

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(preselectedThreadId ?? null)
  const [searchInput, setSearchInput] = useState('')
  const [entityType, setEntityType] = useState('all')
  const [sortBy, setSortBy] = useState<'lastActivity' | 'created'>('lastActivity')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>(preselectedThreadId ? 'detail' : 'list')

  // When navigated from a party detail page with a threadId, auto-open that thread.
  // Syncing URL search params into local state is the intended use of useEffect here.
  useEffect(() => {
    if (preselectedThreadId) {
      setSelectedThreadId(preselectedThreadId) // eslint-disable-line react-hooks/set-state-in-effect
      setMobileView('detail') // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [preselectedThreadId])

  // Admin-only party filters
  const [partyType, setPartyType] = useState<'all' | 'customer' | 'supplier'>('all')
  const [partyId, setPartyId] = useState<string>('all')

  const search = useDebounce(searchInput, 300)

  // Load counterparty lists for filter dropdowns:
  //   Admin    → loads both
  //   Supplier → loads customers (to filter their threads by customer)
  //   Customer → loads suppliers (to filter their threads by supplier)
  const { data: customersData } = useQuery({
    queryKey: queryKeys.customers.list({ page: 1, pageSize: 100 }),
    queryFn: () => customerApi.list({ page: 1, pageSize: 100 }),
    enabled: isAdmin || isSupplier,
  })
  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.suppliers.list({ page: 1, pageSize: 100 }),
    queryFn: () => supplierApi.list({ page: 1, pageSize: 100 }),
    enabled: isAdmin || isCustomer,
  })

  // Admin uses a two-level (partyType + partyId) picker.
  // Supplier/Customer get a single-level picker for their counterpart.
  const resolvedCustomerId =
    partyId !== 'all' && (partyType === 'customer' || isSupplier) ? partyId : undefined
  const resolvedSupplierId =
    partyId !== 'all' && (partyType === 'supplier' || isCustomer) ? partyId : undefined

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: queryKeys.threads.infinite({
      search,
      entityType,
      sortBy,
      unreadOnly,
      customerId: resolvedCustomerId,
      supplierId: resolvedSupplierId,
    }),
    queryFn: ({ pageParam }) =>
      threadApi.list({
        page: pageParam as number,
        pageSize: 20,
        search: search || undefined,
        entityType: entityType !== 'all' ? entityType : undefined,
        sortBy,
        unreadOnly: unreadOnly || undefined,
        customerId: resolvedCustomerId,
        supplierId: resolvedSupplierId,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalCount / lastPage.pageSize)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
    retry: 1,
  })

  const threads = data?.pages.flatMap((p) => p.data) ?? []
  const selectedThread = threads.find((t) => t.threadId === selectedThreadId)

  const hasActiveFilters =
    searchInput !== '' ||
    entityType !== 'all' ||
    unreadOnly ||
    partyType !== 'all' ||
    partyId !== 'all'

  const clearFilters = () => {
    setSearchInput('')
    setEntityType('all')
    setUnreadOnly(false)
    setPartyType('all')
    setPartyId('all')
  }

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId)
    setMobileView('detail')
  }

  const handleCloseDetail = () => {
    setSelectedThreadId(null)
    setMobileView('list')
  }

  const handlePartyTypeChange = (value: string) => {
    setPartyType(value as 'all' | 'customer' | 'supplier')
    setPartyId('all')
  }

  return (
    <div className="h-full overflow-hidden flex flex-col gap-4">
      <PageHeader
        title="Conversations"
        description="View and manage all conversations across your documents"
      />

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">Failed to load conversations. Please try again.</p>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Pane: Thread List */}
        <div className={`col-span-1 min-h-0 border rounded-lg bg-card flex flex-col ${
          mobileView === 'detail' ? 'hidden lg:flex' : ''
        }`}>
          <div className="border-b p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="Search by doc #, party name, subject…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                }}
                className="h-9 pr-8"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Entity Type + Sort + Unread toggle */}
            <div className="flex gap-2">
              <Select value={entityType} onValueChange={(v) => { setEntityType(v) }}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'lastActivity' | 'created')}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unread only toggle */}
            <Button
              variant={unreadOnly ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              <span className={`mr-2 h-2 w-2 rounded-full ${unreadOnly ? 'bg-white' : 'bg-blue-500'}`} />
              {unreadOnly ? 'Showing Unread Only' : 'Show Unread Only'}
            </Button>

            {/* Party filter — Admin: two-level picker; Supplier: customer picker; Customer: supplier picker */}
            {isAdmin && (
              <div className="flex gap-2">
                <Select value={partyType} onValueChange={handlePartyTypeChange}>
                  <SelectTrigger className="h-9 w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parties</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>

                {partyType === 'customer' && (
                  <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
                    <SelectTrigger className="h-9 flex-1 min-w-0">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      {customersData?.data.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {partyType === 'supplier' && (
                  <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
                    <SelectTrigger className="h-9 flex-1 min-w-0">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliersData?.data.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Supplier: filter own threads by a specific customer */}
            {isSupplier && (
              <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customersData?.data.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Customer: filter own threads by a specific supplier */}
            {isCustomer && (
              <Select value={partyId} onValueChange={(v) => setPartyId(v)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliersData?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Active Filters Indicator */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  Filters active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {/* Thread List */}
          <ThreadListPane
            threads={threads}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
            isLoading={isLoading}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage ?? false}
            isFetchingNextPage={isFetchingNextPage}
          />
        </div>

        {/* Right Pane: Thread Detail */}
        <div className={`col-span-2 min-h-0 flex flex-col ${
          mobileView === 'list' ? 'hidden lg:flex' : ''
        }`}>
          {selectedThread ? (
            <>
              {/* Mobile Back Button */}
              <div className="lg:hidden mb-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseDetail}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to list
                </Button>
              </div>
              <ThreadDetailPane
                thread={selectedThread}
                onClose={handleCloseDetail}
                canPostInternal={user?.role === 'Admin'}
              />
            </>
          ) : (
            <div className="border rounded-lg bg-card flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium text-foreground mb-1">No conversation selected</p>
              <p className="text-sm">Choose a conversation from the list to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
