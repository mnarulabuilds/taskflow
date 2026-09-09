'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration: number;
}

interface ShowToastOptions {
  type?: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: ShowToastOptions | ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, options?: ShowToastOptions | ToastType) => {
      const normalized: ShowToastOptions =
        typeof options === 'string' ? { type: options } : (options ?? {});

      const id = Date.now() + Math.random();
      const duration = normalized.duration ?? (normalized.action ? 5000 : 4000);

      setToasts((current) => [
        ...current,
        {
          id,
          message,
          type: normalized.type ?? 'error',
          action: normalized.action,
          duration,
        },
      ]);

      if (!normalized.action) {
        setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, duration);
      }
    },
    [],
  );

  function dismissToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'flex max-w-sm items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
              toast.type === 'success' && 'bg-success',
              toast.type === 'error' && 'bg-destructive',
              toast.type === 'info' && 'bg-info',
            )}
          >
            <span aria-hidden="true">
              {toast.type === 'success' ? '✓' : toast.type === 'info' ? '↩' : '!'}
            </span>
            <div className="flex-1">
              <span>{toast.message}</span>
              {toast.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto px-2 py-1 text-white hover:bg-white/20"
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                >
                  {toast.action.label}
                </Button>
              )}
            </div>
            {!toast.action && (
              <button
                type="button"
                className="ml-2 opacity-80 hover:opacity-100"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
