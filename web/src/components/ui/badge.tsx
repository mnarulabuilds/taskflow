import { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type BadgeVariant =
  | 'default'
  | 'todo'
  | 'in-progress'
  | 'done'
  | 'low'
  | 'medium'
  | 'high'
  | 'overdue'
  | 'due-today'
  | 'due-soon'
  | 'info'
  | 'success'
  | 'warning';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-muted text-foreground border-border',
  todo: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  'in-progress': 'bg-amber-100 text-amber-900 border-amber-200',
  done: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  low: 'bg-sky-100 text-sky-900 border-sky-200',
  medium: 'bg-orange-100 text-orange-900 border-orange-200',
  high: 'bg-rose-100 text-rose-900 border-rose-200',
  overdue: 'bg-rose-100 text-rose-900 border-rose-200',
  'due-today': 'bg-amber-100 text-amber-900 border-amber-200',
  'due-soon': 'bg-yellow-100 text-yellow-900 border-yellow-200',
  info: 'bg-blue-100 text-blue-900 border-blue-200',
  success: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  warning: 'bg-amber-100 text-amber-900 border-amber-200',
};

export function Badge({
  variant = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
