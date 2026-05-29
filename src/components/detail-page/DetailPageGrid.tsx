import { cn } from '@/lib/utils'

interface DetailPageGridProps {
  children: React.ReactNode
  className?: string
}

export function DetailPageGrid({ children, className }: DetailPageGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6 lg:grid-cols-3', className)}>
      {children}
    </div>
  )
}
