import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Send, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ThreadPanelProps {
  threadId: string
  title?: string
  canPostInternal?: boolean
}

const messageSchema = z.object({
  message: z.string().min(1, 'Message is required').min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
  isInternal: z.boolean().default(false),
})

type MessageForm = z.infer<typeof messageSchema>

export function ThreadPanel({ threadId, title, canPostInternal = false }: ThreadPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const [page, setPage] = useState(1)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Fetch messages with pagination
  const { data: messagesData, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.threads.messages(threadId, page),
    queryFn: () => threadApi.getMessages(threadId, page, 20),
  })

  // Real-time hub connection
  const { isConnected, sendMessage: hubSendMessage, updateMessage: hubUpdateMessage, deleteMessage: hubDeleteMessage } = useThreadHub(threadId)

  // Form management
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: '', isInternal: false },
  })

  const isInternalChecked = watch('isInternal')

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: MessageForm) => {
      const response = await threadApi.postMessage(threadId, {
        message: data.message,
        isInternal: data.isInternal,
      })
      return response
    },
    onSuccess: () => {
      reset()
      qc.invalidateQueries({ queryKey: queryKeys.threads.messages(threadId, page) })
    },
  })

  // Update message mutation
  const updateMessage = useMutation({
    mutationFn: (data: { messageId: string; message: string }) =>
      threadApi.updateMessage(threadId, data.messageId, { message: data.message }),
    onSuccess: () => {
      setEditingMessageId(null)
      setEditText('')
      qc.invalidateQueries({ queryKey: queryKeys.threads.messages(threadId, page) })
    },
  })

  // Delete message mutation
  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => threadApi.deleteMessage(threadId, messageId),
    onSuccess: () => {
      setDeletingMessageId(null)
      qc.invalidateQueries({ queryKey: queryKeys.threads.messages(threadId, page) })
    },
  })

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData])

  const handleSendMessage = handleSubmit((data) => {
    sendMessage.mutate(data)
  })

  const handleEditMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId)
    setEditText(currentText)
  }

  const handleSaveEdit = () => {
    if (editingMessageId && editText.trim()) {
      updateMessage.mutate({ messageId: editingMessageId, message: editText })
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage.mutate(messageId)
  }

  const messages = messagesData?.data ?? []
  const totalCount = messagesData?.totalCount ?? 0
  const canLoadMore = page * 20 < totalCount

  const canEdit = (message: ThreadMessageDto) => {
    if (!user) return false
    return user.id === message.createdById || user.role === 'Admin'
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border">
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Conversation</h3>
          {title && <p className="text-xs text-muted-foreground mt-0.5">{title}</p>}
        </div>
      )}

      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
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
          <>
            {canLoadMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                >
                  Load earlier messages
                </Button>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="flex gap-3 group">
                {/* Avatar placeholder */}
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 flex-shrink-0">
                  {message.createdByName.charAt(0).toUpperCase()}
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{message.createdByName}</p>
                    {message.isInternal && (
                      <Badge variant="destructive" className="h-5">
                        Internal
                      </Badge>
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
                          onClick={handleSaveEdit}
                          disabled={updateMessage.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingMessageId(null)
                            setEditText('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                      {message.message}
                    </p>
                  )}

                  {/* Message metadata */}
                  {message.modifiedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Edited {formatDistanceToNow(new Date(message.modifiedAt), { addSuffix: true })}
                    </p>
                  )}

                  {/* Edit/Delete buttons */}
                  {canEdit(message) && editingMessageId !== message.id && (
                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditMessage(message.id, message.message)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingMessageId(message.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <div className="border-t p-4 space-y-3">
        {!isConnected && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-xs text-yellow-800">Connecting to real-time updates...</p>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="space-y-2">
          <Textarea
            {...register('message')}
            placeholder="Type your message here..."
            className="resize-none"
            rows={3}
            disabled={sendMessage.isPending}
          />
          {errors.message && (
            <p className="text-xs text-red-500">{errors.message.message}</p>
          )}

          {canPostInternal && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('isInternal')}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">
                Internal message (admins only)
              </span>
            </label>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={sendMessage.isPending}
              className="gap-2"
            >
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
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deletingMessageId}
        onOpenChange={(open) => !open && setDeletingMessageId(null)}
        title="Delete message"
        description="This message will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingMessageId && handleDeleteMessage(deletingMessageId)}
        isLoading={deleteMessage.isPending}
      />
    </div>
  )
}
