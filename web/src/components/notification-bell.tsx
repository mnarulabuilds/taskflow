'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { Notification } from '@/types/notification';

export function NotificationBell() {
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

  async function markRead(notificationId: string) {
    await api(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    await loadNotifications();
  }

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'PATCH' });
    await loadNotifications();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded border px-3 py-1.5 text-sm"
        aria-label="Notifications"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No notifications yet.</p>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => {
                  if (!notification.read) {
                    markRead(notification.id).catch(() => undefined);
                  }
                }}
                className={`block w-full border-b px-4 py-3 text-left last:border-b-0 ${
                  notification.read ? 'bg-white' : 'bg-blue-50'
                }`}
              >
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
