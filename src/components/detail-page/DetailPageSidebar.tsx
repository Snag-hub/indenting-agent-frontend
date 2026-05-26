import { cn } from '@/lib/utils'

interface DetailPageSidebarProps {
  children: React.ReactNode
  className?: string
}

export function DetailPageSidebar({ children, className }: DetailPageSidebarProps) {
  return (
    <aside className={cn('space-y-4', className)}>
      {children}
    </aside>
  )
}
