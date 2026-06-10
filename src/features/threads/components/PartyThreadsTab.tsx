import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.threads.list({ customerId, supplierId, page }),
    queryFn: () =>
      threadApi.list({
        customerId,
        supplierId,
        page,
        pageSize: 20,
      }),
  })

  const handleSelectThread = (threadId: string) => {
    navigate({ to: '/threads', search: { threadId } })
  }

  return (
    <div className="h-[500px] border rounded-lg bg-card flex flex-col overflow-hidden">
      <ThreadListPane
        threads={data?.data ?? []}
        selectedThreadId={null}
        onSelectThread={handleSelectThread}
        isLoading={isLoading}
        page={page}
        totalCount={data?.totalCount ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}
