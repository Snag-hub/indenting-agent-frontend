import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { threadApi } from '@/features/threads/api/threadApi'
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

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [entityType, setEntityType] = useState('all')
  const [sortBy, setSortBy] = useState<'lastActivity' | 'created'>('lastActivity')
  const [page, setPage] = useState(1)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  // Debounce search input to avoid excessive API calls
  const search = useDebounce(searchInput, 300)

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.threads.list({ page, search, entityType, sortBy }),
    queryFn: () =>
      threadApi.list({
        page,
        pageSize: 20,
        search: search || undefined,
        entityType: entityType !== 'all' ? entityType : undefined,
        sortBy,
      }),
    retry: 1,
  })

  const selectedThread = data?.data.find((t) => t.threadId === selectedThreadId)

  // Check if any filters are active
  const hasActiveFilters = searchInput !== '' || entityType !== 'all'

  const clearFilters = () => {
    setSearchInput('')
    setEntityType('all')
    setPage(1)
  }

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId)
    setMobileView('detail')
  }

  const handleCloseDetail = () => {
    setSelectedThreadId(null)
    setMobileView('list')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Conversations"
        description="View and manage all conversations across your documents"
      />

      {/* Error Alert */}
      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">Failed to load conversations. Please try again.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Left Pane: Thread List */}
        <div className={`col-span-1 border rounded-lg bg-card flex flex-col ${
          mobileView === 'detail' ? 'hidden lg:flex' : ''
        }`}>
          <div className="border-b p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="Search by name, doc #..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  setPage(1)
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

            {/* Filter Controls */}
            <div className="flex gap-2">
              <Select value={entityType} onValueChange={(v) => {
                setEntityType(v)
                setPage(1)
              }}>
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
            threads={data?.data ?? []}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
            isLoading={isLoading}
            page={page}
            totalCount={data?.totalCount ?? 0}
            onPageChange={setPage}
          />
        </div>

        {/* Right Pane: Thread Detail */}
        <div className={`col-span-2 flex flex-col ${
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
