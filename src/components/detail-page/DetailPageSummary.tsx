import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export interface SummaryItem {
  label: string
  value: React.ReactNode
}

interface DetailPageSummaryProps {
  items: SummaryItem[]
  columns?: 2 | 3 | 4
  className?: string
}

export function DetailPageSummary({ items, columns = 3, className }: DetailPageSummaryProps) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  }[columns]

  return (
    <Card>
      <CardContent className="pt-6">
        <div className={cn('grid grid-cols-2 gap-4', colClass, className)}>
          {items.map((item) => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <div className="text-sm font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
