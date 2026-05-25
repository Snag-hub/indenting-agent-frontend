import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { X, Plus } from 'lucide-react'

interface QuantityTierInputProps {
  value: number[]
  onChange: (tiers: number[]) => void
  label?: string
  description?: string
}

/**
 * Tag-style input for declaring discrete valid order quantities (lot sizes).
 * Supplier types a quantity, presses Enter or the Add button; the value is
 * added to a sorted pill list. Each pill has an × to remove it.
 */
export function QuantityTierInput({ value, onChange, label = 'Order Quantities', description }: QuantityTierInputProps) {
  const [draft, setDraft] = useState('')

  const addTier = () => {
    const qty = parseInt(draft, 10)
    if (!qty || qty <= 0) return
    if (value.includes(qty)) { setDraft(''); return }
    onChange([...value, qty].sort((a, b) => a - b))
    setDraft('')
  }

  const removeTier = (qty: number) => onChange(value.filter((t) => t !== qty))

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <Input
          type="number"
          min="1"
          placeholder="e.g. 500000"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTier() } }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTier} disabled={!draft}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1">
              {t.toLocaleString()}
              <button
                type="button"
                onClick={() => removeTier(t)}
                className="rounded-full hover:bg-muted p-0.5"
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
