'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { Notification } from '@/types/notification';

function notificationHref(notification: Notification) {
  const metadata = notification.metadata ?? {};

  if (typeof metadata.projectId === 'string') {
    const taskId =
      typeof metadata.taskId === 'string' ? metadata.taskId : undefined;
    return taskId
      ? `/projects/${metadata.projectId}?task=${taskId}`
      : `/projects/${metadata.projectId}`;
  }

  if (typeof metadata.workspaceId === 'string') {
    return `/workspaces/${metadata.workspaceId}`;
  }

  if (notification.type === 'WORKSPACE_INVITE') {
    return '/dashboard';
  }

  return null;
}

export function NotificationBell() {
  const router = useRouter();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const [items, count] = await Promise.all([
      api<Notification[]>('/notifications'),
      api<number>('/notifications/unread-count'),
    ]);
    setNotifications(items);
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    loadNotifications().catch(() => undefined);
    const interval = setInterval(() => {
      loadNotifications().catch(() => undefined);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      await api(`/notifications/${notification.id}/read`, { method: 'PATCH' });
      await loadNotifications();
    }

    const href = notificationHref(notification);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'PATCH' });
    await loadNotifications();
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <span aria-hidden="true">🔔</span>
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Notifications menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-surface-muted/60 px-4 py-3">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-4 text-sm text-muted">No notifications yet.</p>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                role="menuitem"
                onClick={() => handleClick(notification).catch(() => undefined)}
                className={cn(
                  'block w-full border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-muted',
                  notification.read ? 'bg-surface' : 'bg-info/10',
                )}
              >
                <p className="text-sm font-medium text-foreground">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-muted">{notification.message}</p>
                <p className="mt-2 text-xs text-muted">
                  <time dateTime={notification.createdAt}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </time>
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
