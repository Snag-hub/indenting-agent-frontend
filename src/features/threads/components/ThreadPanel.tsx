import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { threadApi, type ThreadMessageDto } from '@/features/threads/api/threadApi'
import { useThreadHub } from '@/hooks/useThreadHub'
import { useAuthStore } from '@/stores/authStore'
import { queryKeys } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AlertCircle, Edit2, Loader2, Send, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ThreadPanelProps {
  threadId: string
  title?: string
  canPostInternal?: boolean
  /** When set, the composer is replaced with this notice. */
  disabledReason?: string
}

const messageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
  isInternal: z.boolean(),
})
type MessageForm = z.infer<typeof messageSchema>

export function ThreadPanel({ threadId, title, canPostInternal = false, disabledReason }: ThreadPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef<number>(0)
  const shouldScrollToBottomRef = useRef<boolean>(true)  // true on first load + after send
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Infinite query — page 1 = newest 20 messages (backend orders DESC).
  // getNextPageParam loads older pages.
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.threads.messagesInfinite(threadId),
    queryFn: ({ pageParam }) => threadApi.getMessages(threadId, pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalCount / lastPage.pageSize)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
  })

  // Flatten pages and reverse for chronological display.
  // Backend returns newest-first, so flatMap gives [newest…oldest].
  // Reversing gives [oldest…newest] — correct chat order.
  const messages: ThreadMessageDto[] = data?.pages.flatMap((p) => p.data).reverse() ?? []

  // Real-time hub
  const { isConnected } = useThreadHub(threadId)

  // Form
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: '', isInternal: false },
  })
  const isInternalChecked = watch('isInternal')

  // ── Scroll behaviour ────────────────────────────────────────────────────────

  // Auto-scroll to bottom on first load and after sending a message.
  useEffect(() => {
    if (shouldScrollToBottomRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: shouldScrollToBottomRef.current ? 'instant' : 'smooth' })
      shouldScrollToBottomRef.current = false
    }
  }, [messages.length])

  // Preserve scroll position when older messages are prepended.
  // Run synchronously before paint so there's no visual jump.
  useLayoutEffect(() => {
    const el = messagesContainerRef.current
    if (!el || prevScrollHeightRef.current === 0) return
    el.scrollTop = el.scrollHeight - prevScrollHeightRef.current
    prevScrollHeightRef.current = 0
  }, [data?.pages.length])

  // Sentinel at top — when visible, load older messages.
  const topSentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = topSentinelRef.current
    const container = messagesContainerRef.current
    if (!sentinel || !container) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          // Snapshot scroll height before fetch so layoutEffect can restore position.
          prevScrollHeightRef.current = container.scrollHeight
          fetchNextPage()
        }
      },
      { root: container, rootMargin: '60px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ── Mutations ───────────────────────────────────────────────────────────────

  const sendMessage = useMutation({
    mutationFn: (data: MessageForm) =>
      threadApi.postMessage(threadId, { message: data.message, isInternal: data.isInternal }),
    onSuccess: () => {
      reset()
      shouldScrollToBottomRef.current = true
      qc.invalidateQueries({ queryKey: queryKeys.threads.messagesInfinite(threadId) })
    },
  })

  const updateMessage = useMutation({
    mutationFn: (d: { messageId: string; message: string }) =>
      threadApi.updateMessage(threadId, d.messageId, { message: d.message }),
    onSuccess: () => {
      setEditingMessageId(null)
      setEditText('')
      qc.invalidateQueries({ queryKey: queryKeys.threads.messagesInfinite(threadId) })
    },
  })

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => threadApi.deleteMessage(threadId, messageId),
    onSuccess: () => {
      setDeletingMessageId(null)
      qc.invalidateQueries({ queryKey: queryKeys.threads.messagesInfinite(threadId) })
    },
  })

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const canEdit = (msg: ThreadMessageDto) =>
    !!user && (user.id === msg.createdById || user.role === 'Admin')

  const handleSendMessage = handleSubmit((data) => sendMessage.mutate(data))

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border">
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b shrink-0">
          <h3 className="font-semibold text-sm">Conversation</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        </div>
      )}

      {/* Messages container */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {/* Top sentinel — triggers loading older messages on scroll up */}
        <div ref={topSentinelRef} className="flex justify-center py-1 min-h-[1px]">
          {isFetchingNextPage && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!hasNextPage && messages.length > 0 && (
            <p className="text-xs text-slate-400">Beginning of conversation</p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3 group">
              {/* Avatar */}
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0">
                {message.createdByName.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{message.createdByName}</p>
                  {message.isInternal && (
                    <Badge variant="destructive" className="h-5 text-[10px]">Internal</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {editingMessageId === message.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => editingMessageId && editText.trim() && updateMessage.mutate({ messageId: editingMessageId, message: editText })}
                        disabled={updateMessage.isPending}
                      >Save</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingMessageId(null); setEditText('') }}
                      >Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                    {message.message}
                  </p>
                )}

                {message.modifiedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Edited {formatDistanceToNow(new Date(message.modifiedAt), { addSuffix: true })}
                  </p>
                )}

                {canEdit(message) && editingMessageId !== message.id && (
                  <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => { setEditingMessageId(message.id); setEditText(message.message) }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setDeletingMessageId(message.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Bottom anchor — scroll target for new messages */}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t p-4 space-y-3 shrink-0">
        {disabledReason ? (
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
            <p className="text-xs text-slate-600">{disabledReason}</p>
          </div>
        ) : (
          <>
            {!isConnected && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-xs text-yellow-800">Connecting to real-time updates…</p>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-2">
              <Textarea
                {...register('message')}
                placeholder="Type your message here…"
                className="resize-none"
                rows={3}
                disabled={sendMessage.isPending}
              />
              {errors.message && (
                <p className="text-xs text-red-500">{errors.message.message}</p>
              )}

              {canPostInternal && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('isInternal')} className="rounded border-gray-300" />
                  <span className="text-sm text-muted-foreground">Internal message (admins only)</span>
                </label>
              )}

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={sendMessage.isPending} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
                {isInternalChecked && (
                  <div className="flex items-center gap-2 px-3 rounded-md bg-red-50 border border-red-200">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    <p className="text-xs text-red-700">Admin visibility only</p>
                  </div>
                )}
              </div>
            </form>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingMessageId}
        onOpenChange={(open) => !open && setDeletingMessageId(null)}
        title="Delete message"
        description="This message will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingMessageId && deleteMessage.mutate(deletingMessageId)}
        isLoading={deleteMessage.isPending}
      />
    </div>
  )
}
