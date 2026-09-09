'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

import {
  CommandPalette,
  CommandPaletteTrigger,
  useCommandPalette,
} from '@/components/command-palette';
import { NotificationBell } from '@/components/notification-bell';
import { SidebarNav } from '@/components/sidebar-nav';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/providers/theme-provider';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';

interface AppShellProps {
  breadcrumbs?: { label: string; href?: string }[];
  children: ReactNode;
}

export function AppShell({ breadcrumbs = [], children }: AppShellProps) {
  const { user, logout } = useAuth();
  const commandPalette = useCommandPalette();

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="border-b border-border bg-surface shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground"
              >
                TF
              </span>
              TaskFlow
            </Link>
            {breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted"
              >
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;

                  return (
                    <span
                      key={`${crumb.label}-${index}`}
                      className="flex items-center gap-1"
                    >
                      {index > 0 && (
                        <span aria-hidden="true" className="text-border">
                          /
                        </span>
                      )}
                      {crumb.href ? (
                        <Link
                          href={crumb.href}
                          className="font-medium text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className="font-medium text-foreground"
                          aria-current={isLast ? 'page' : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </span>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <CommandPaletteTrigger onClick={() => commandPalette.setOpen(true)} />
            <ThemeToggle className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
            <NotificationBell />
            <Link
              href="/settings"
              className="hidden rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground sm:inline"
            >
              Profile
            </Link>
            {user?.email && (
              <span className="hidden text-sm text-muted md:inline">
                {user.email}
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 md:px-6">
        <aside className="w-full shrink-0 border-border py-6 lg:w-52 lg:border-r lg:pr-6">
          <SidebarNav />
        </aside>

        <main
          id="main-content"
          className={cn('min-w-0 flex-1 py-6 md:py-8')}
        >
          {children}
        </main>
      </div>

      <CommandPalette
        open={commandPalette.open}
        onClose={commandPalette.close}
      />
    </div>
  );
}
