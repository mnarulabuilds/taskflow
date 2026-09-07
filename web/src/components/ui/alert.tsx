import { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

const variantClasses: Record<AlertVariant, string> = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning-foreground',
  info: 'border-info/30 bg-info/10 text-info',
};

export function Alert({
  variant = 'error',
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { variant?: AlertVariant }) {
  return (
    <p
      role="alert"
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
