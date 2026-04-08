import * as React from 'react'
import { cn } from '@/lib/utils'

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'h-4 w-4 rounded border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Checkbox.displayName = 'Checkbox'
