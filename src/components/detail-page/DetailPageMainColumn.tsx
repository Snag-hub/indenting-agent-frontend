import { cn } from '@/lib/utils'

interface DetailPageMainColumnProps {
  children: React.ReactNode
  className?: string
}

export function DetailPageMainColumn({ children, className }: DetailPageMainColumnProps) {
  return (
    <div className={cn('space-y-6 lg:col-span-2', className)}>
      {children}
    </div>
  )
}
