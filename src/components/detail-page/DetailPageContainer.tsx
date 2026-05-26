import { cn } from '@/lib/utils'

interface DetailPageContainerProps {
  children: React.ReactNode
  className?: string
}

export function DetailPageContainer({ children, className }: DetailPageContainerProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {children}
    </div>
  )
}
