'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    if (!dialog) {
      return () => {
        document.body.style.overflow = '';
      };
    }

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={dialogRef}
          className={cn(
            'flex w-full max-h-[min(calc(100dvh-2rem),56rem)] flex-col rounded-xl border border-border bg-surface shadow-2xl',
            size === 'lg' ? 'max-w-2xl' : 'max-w-md',
          )}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-surface-muted/60 px-6 py-4">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <span aria-hidden="true">✕</span>
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
            {children}
          </div>
          {footer && (
            <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
