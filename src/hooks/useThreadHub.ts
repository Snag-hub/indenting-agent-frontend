import { useEffect, useRef, useCallback } from 'react'
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export const useThreadHub = (threadId: string | null) => {
  const hubConnectionRef = useRef<HubConnection | null>(null)
  const { accessToken } = useAuthStore()
  const qc = useQueryClient()

  // Initialize and connect to ThreadHub
  useEffect(() => {
    if (!threadId || !accessToken) return

    const initializeHub = async () => {
      try {
        const hubConnection = new HubConnectionBuilder()
          .withUrl(`${import.meta.env.VITE_SIGNALR_BASE_URL ?? ''}/hubs/threads`, {
            accessTokenFactory: () => accessToken,
            withCredentials: true,
          })
          .withAutomaticReconnect([0, 0, 5000, 10000, 30000])
          .configureLogging(LogLevel.Warning)
          .build()

        // Setup event listeners
        hubConnection.on('MessageReceived', () => {
          qc.invalidateQueries({ queryKey: ['threads', 'messages', threadId] })
        })

        hubConnection.on('MessageUpdated', () => {
          qc.invalidateQueries({ queryKey: ['threads', 'messages', threadId] })
        })

        hubConnection.on('MessageDeleted', () => {
          qc.invalidateQueries({ queryKey: ['threads', 'messages', threadId] })
        })

        hubConnection.on('UserJoined', (data: { userId: string; userName: string; timestamp: string }) => {
          console.log(`${data.userName} joined the conversation`)
        })

        hubConnection.on('UserLeft', (data: { userId: string; userName: string; timestamp: string }) => {
          console.log(`${data.userName} left the conversation`)
        })

        hubConnection.on('Error', (message: string) => {
          console.error('Thread Hub error:', message)
          toast.error(`Thread error: ${message}`)
        })

        // Handle connection errors
        hubConnection.onclose(async () => {
          console.log('ThreadHub connection closed')
        })

        hubConnection.onreconnected(() => {
          console.log('ThreadHub reconnected')
          // Rejoin thread after reconnection
          hubConnection.invoke('JoinThread', threadId).catch((err) => console.error('Error rejoining thread:', err))
        })

        // Start connection
        await hubConnection.start()
        console.log('ThreadHub connected')

        // Join the thread
        await hubConnection.invoke('JoinThread', threadId)
        console.log(`Joined thread: ${threadId}`)

        hubConnectionRef.current = hubConnection
      } catch (err) {
        console.error('Error connecting to ThreadHub:', err)
        toast.error('Failed to connect to chat')
      }
    }

    initializeHub()

    // Cleanup on unmount
    return () => {
      if (hubConnectionRef.current) {
        hubConnectionRef.current
          .invoke('LeaveThread', threadId)
          .then(() => hubConnectionRef.current?.stop())
          .catch((err) => console.error('Error leaving thread:', err))
      }
    }
  }, [threadId, accessToken, qc])

  // Send message
  const sendMessage = useCallback(
    async (message: string, isInternal: boolean = false) => {
      if (!hubConnectionRef.current || !threadId) {
        console.error('Hub not connected or no thread ID')
        return
      }

      try {
        await hubConnectionRef.current.invoke('SendMessage', threadId, message, isInternal)
      } catch (err) {
        console.error('Error sending message:', err)
        throw err
      }
    },
    [threadId]
  )

  // Update message
  const updateMessage = useCallback(
    async (messageId: string, updatedMessage: string) => {
      if (!hubConnectionRef.current || !threadId) {
        console.error('Hub not connected or no thread ID')
        return
      }

      try {
        await hubConnectionRef.current.invoke('UpdateMessage', threadId, messageId, updatedMessage)
      } catch (err) {
        console.error('Error updating message:', err)
        throw err
      }
    },
    [threadId]
  )

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!hubConnectionRef.current || !threadId) {
        console.error('Hub not connected or no thread ID')
        return
      }

      try {
        await hubConnectionRef.current.invoke('DeleteMessage', threadId, messageId)
      } catch (err) {
        console.error('Error deleting message:', err)
        throw err
      }
    },
    [threadId]
  )

  const isConnected = hubConnectionRef.current?.state === 'Connected'

  return {
    isConnected,
    sendMessage,
    updateMessage,
    deleteMessage,
  }
}
