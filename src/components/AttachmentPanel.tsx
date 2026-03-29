import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Paperclip, Trash2, Upload } from 'lucide-react'
import { useRef } from 'react'
import { format } from 'date-fns'

interface Attachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: string
  uploadedByName: string
}

interface AttachmentPanelProps {
  entityType: string
  entityId: string
}

export function AttachmentPanel({ entityType, entityId }: AttachmentPanelProps) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery<Attachment[]>({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () =>
      api.get('/attachments', { params: { entityType, entityId } }).then((r) => r.data),
  })

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/attachments/upload?entityType=${entityType}&entityId=${entityId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/attachments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] }),
  })

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-700">Attachments</h3>
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" />
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload.mutate(file)
            e.target.value = ''
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : data?.length === 0 ? (
        <p className="text-sm text-slate-400">No attachments yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {data?.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.fileName}</p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(a.fileSize)} · {format(new Date(a.uploadedAt), 'dd MMM yyyy')} · {a.uploadedByName}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove.mutate(a.id)}
                disabled={remove.isPending}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
