import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTicketStore } from '@/stores/ticketStore'
import { useAuthStore } from '@/stores/authStore'
import { ticketApi } from '@/features/tickets/api/ticketApi'
import { useAvailableTicketDocuments } from '@/features/tickets/hooks/useAvailableTicketDocuments'
import { queryKeys } from '@/lib/queryKeys'

export function TicketCreationDialog() {
  const { user } = useAuthStore()
  const {
    isOpen,
    closeDialog,
    selectedEntityType,
    selectedEntityId,
    setSelectedEntity,
    preFilledTitle,
    preFilledDescription,
  } = useTicketStore()

  const [title, setTitle] = useState(preFilledTitle || '')
  const [description, setDescription] = useState(preFilledDescription || '')
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium')
  const [activeTab, setActiveTab] = useState(selectedEntityType || 'PI')

  const queryClient = useQueryClient()
  const { documents: piDocuments } = useAvailableTicketDocuments(
    activeTab === 'PI' ? 'PI' : null
  )
  const { documents: doDocuments } = useAvailableTicketDocuments(
    activeTab === 'DO' ? 'DO' : null
  )
  const { documents: paymentDocuments } = useAvailableTicketDocuments(
    activeTab === 'Payment' ? 'Payment' : null
  )

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedEntityType || !selectedEntityId) {
        throw new Error('Document selection is required')
      }
      return ticketApi.create({
        title,
        description: description || undefined,
        priority,
        linkedEntityType: selectedEntityType as 'PI' | 'DO' | 'Payment',
        linkedEntityId: selectedEntityId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.list() })
      closeDialog()
      setTitle('')
      setDescription('')
      setPriority('Medium')
    },
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog()
      setTitle('')
      setDescription('')
      setPriority('Medium')
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  const handleDocumentSelect = (docId: string) => {
    setSelectedEntity(activeTab as 'PI' | 'DO' | 'Payment', docId)
  }

  const handleSubmit = () => {
    createMutation.mutate()
  }

  const getDocumentsForActiveTab = () => {
    switch (activeTab) {
      case 'PI':
        return piDocuments
      case 'DO':
        return doDocuments
      case 'Payment':
        return paymentDocuments
      default:
        return []
    }
  }

  const canShowTab = (tab: string) => {
    if (user?.role === 'Admin') return true
    if (user?.role === 'Customer' && (tab === 'PI' || tab === 'DO')) return true
    if (user?.role === 'Supplier' && tab === 'Payment') return true
    return false
  }

  const visibleTabs = ['PI', 'DO', 'Payment'].filter(canShowTab)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Ticket</DialogTitle>
          <DialogDescription>
            Create a new support ticket and link it to a document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context..."
              disabled={createMutation.isPending}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as 'Low' | 'Medium' | 'High' | 'Critical')}
              disabled={createMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Link to Document * </label>
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                {visibleTabs.map((tab) => (
                  <TabsTrigger key={tab} value={tab}>
                    {tab === 'PI' && 'Proforma Invoice'}
                    {tab === 'DO' && 'Delivery Order'}
                    {tab === 'Payment' && 'Payment'}
                  </TabsTrigger>
                ))}
              </TabsList>

              {visibleTabs.map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <Select
                    value={selectedEntityId || ''}
                    onValueChange={handleDocumentSelect}
                    disabled={createMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select a ${tab}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getDocumentsForActiveTab().map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{doc.number}</span>
                            <span className="text-xs text-gray-500">{doc.status}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getDocumentsForActiveTab().length === 0 && !createMutation.isPending && (
                    <p className="text-sm text-gray-500 mt-2">No {tab === 'PI' ? 'Proforma Invoices' : tab === 'DO' ? 'Delivery Orders' : 'Payments'} available</p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {createMutation.isError && (
            <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
              {createMutation.error?.message || 'Failed to create ticket'}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || !selectedEntityId || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
