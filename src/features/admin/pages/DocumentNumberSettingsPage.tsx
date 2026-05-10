import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { documentNumberApi, type DocumentNumberFormatDto } from '@/features/admin/api/adminApi'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Edit2, Check } from 'lucide-react'

const QUERY_KEY = ['settings', 'document-number-formats']

const ENTITY_LABELS: Record<string, string> = {
  ENQ: 'Enquiry',
  RFQ: 'Request for Quotation',
  QT: 'Quotation',
  PO: 'Purchase Order',
  PI: 'Proforma Invoice',
  DO: 'Delivery Order',
  SKU: 'Supplier Item SKU',
}

const formatSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required').max(20),
  suffix: z.string().max(20).optional(),
  padding: z.number().int().min(1).max(10),
  includeYear: z.boolean(),
})

type FormatForm = z.infer<typeof formatSchema>

function getPreview(prefix: string, suffix: string | null | undefined, padding: number, includeYear: boolean): string {
  const counter = '1'.padStart(padding, '0')
  const year = new Date().getFullYear()
  return includeYear ? `${prefix}-${year}-${counter}${suffix ?? ''}` : `${prefix}-${counter}${suffix ?? ''}`
}

function EditFormatDialog({ format, onClose }: { format: DocumentNumberFormatDto; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormatForm>({
    resolver: zodResolver(formatSchema),
    defaultValues: {
      prefix: format.prefix,
      suffix: format.suffix ?? '',
      padding: format.padding,
      includeYear: format.includeYear,
    },
  })

  const watchAll = watch()
  const preview = getPreview(watchAll.prefix || '?', watchAll.suffix, watchAll.padding || 4, watchAll.includeYear)

  const update = useMutation({
    mutationFn: (data: FormatForm) =>
      documentNumberApi.updateFormat(format.entityType, {
        prefix: data.prefix,
        suffix: data.suffix || null,
        padding: data.padding,
        includeYear: data.includeYear,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Format — {ENTITY_LABELS[format.entityType] ?? format.entityType}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => update.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <Label>Prefix</Label>
            <Input placeholder="e.g. RFQ, ACME-RFQ" {...register('prefix')} />
            {errors.prefix && <p className="text-xs text-destructive">{errors.prefix.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Suffix (optional)</Label>
            <Input placeholder="e.g. -2026, leave blank for none" {...register('suffix')} />
            {errors.suffix && <p className="text-xs text-destructive">{errors.suffix.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Counter Padding (digits)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              {...register('padding', { valueAsNumber: true })}
            />
            {errors.padding && <p className="text-xs text-destructive">{errors.padding.message}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="includeYear"
              checked={watchAll.includeYear}
              onCheckedChange={(v) => setValue('includeYear', v)}
            />
            <Label htmlFor="includeYear">Include year in document number</Label>
          </div>

          <Card className="bg-muted/40">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Preview</p>
              <p className="font-mono text-sm font-semibold">{preview}</p>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={update.isPending}>
              <Check className="mr-2 h-4 w-4" />
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DocumentNumberSettingsPage() {
  const [editingFormat, setEditingFormat] = useState<DocumentNumberFormatDto | null>(null)

  const { data: formats, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => documentNumberApi.getFormats(),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Document Number Settings"
        description="Customise prefix, suffix, and format for your document numbers. Changes apply to documents you create."
      />

      <div className="space-y-3">
        {(formats ?? []).map((fmt) => (
          <Card key={fmt.entityType}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">{ENTITY_LABELS[fmt.entityType] ?? fmt.entityType}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Type: <code className="font-mono">{fmt.entityType}</code>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditingFormat(fmt)}>
                <Edit2 className="mr-2 h-3 w-3" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Prefix</p>
                  <p className="font-mono text-sm font-semibold">{fmt.prefix}</p>
                </div>
                {fmt.suffix && (
                  <div>
                    <p className="text-xs text-muted-foreground">Suffix</p>
                    <p className="font-mono text-sm font-semibold">{fmt.suffix}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Padding</p>
                  <p className="text-sm">{fmt.padding} digits</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Year</p>
                  <Badge variant={fmt.includeYear ? 'default' : 'outline'}>
                    {fmt.includeYear ? 'Included' : 'Excluded'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Example</p>
                  <p className="font-mono text-sm text-primary font-semibold">
                    {getPreview(fmt.prefix, fmt.suffix, fmt.padding, fmt.includeYear)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {formats?.length === 0 && (
          <p className="text-sm text-muted-foreground">No document number formats available.</p>
        )}
      </div>

      {editingFormat && (
        <EditFormatDialog
          format={editingFormat}
          onClose={() => setEditingFormat(null)}
        />
      )}
    </div>
  )
}
