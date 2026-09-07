'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';

import { NotificationBell } from '@/components/notification-bell';
import { api } from '@/lib/api';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AppShellProps {
  email?: string;
  breadcrumbs?: { label: string; href?: string }[];
  children: ReactNode;
}

export function AppShell({ email, breadcrumbs = [], children }: AppShellProps) {
  const router = useRouter();
  const [resolvedEmail, setResolvedEmail] = useState(email);

  useEffect(() => {
    if (!email) {
      api<{ email: string }>('/auth/me')
        .then((user) => setResolvedEmail(user.email))
        .catch(() => router.replace('/login'));
    }
  }, [email, router]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 p-4 md:p-6">
          <div className="min-w-0">
            <Link href="/dashboard" className="text-xl font-semibold">
              TaskFlow
            </Link>
            {breadcrumbs.length > 0 && (
              <nav className="mt-1 flex flex-wrap items-center gap-1 text-sm text-gray-500">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 && <span>/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-gray-800">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-800">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            {resolvedEmail && (
              <span className="hidden text-sm text-gray-600 sm:inline">
                {resolvedEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  );
}
