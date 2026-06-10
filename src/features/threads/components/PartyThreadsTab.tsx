import { useInfiniteQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { threadApi } from '@/features/threads/api/threadApi'
import { ThreadListPane } from '@/features/threads/components/ThreadListPane'
import { queryKeys } from '@/lib/queryKeys'

interface PartyThreadsTabProps {
  customerId?: string
  supplierId?: string
}

/**
 * Embeddable tab content that shows all conversations for a specific customer or
 * supplier. Clicking a thread navigates to the global Conversations page with that
 * thread pre-selected.
 */
export function PartyThreadsTab({ customerId, supplierId }: PartyThreadsTabProps) {
  const navigate = useNavigate()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: queryKeys.threads.infinite({ customerId, supplierId }),
    queryFn: ({ pageParam }) =>
      threadApi.list({
        customerId,
        supplierId,
        page: pageParam as number,
        pageSize: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalCount / lastPage.pageSize)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
  })

  const threads = data?.pages.flatMap((p) => p.data) ?? []

  const handleSelectThread = (threadId: string) => {
    navigate({ to: '/threads', search: { threadId } })
  }

  return (
    <div className="h-[500px] border rounded-lg bg-card flex flex-col overflow-hidden">
      <ThreadListPane
        threads={threads}
        selectedThreadId={null}
        onSelectThread={handleSelectThread}
        isLoading={isLoading}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  )
}
