'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/my-tasks', label: 'My Tasks', icon: '☑' },
  { href: '/favorites', label: 'Favorites', icon: '★' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="mb-4 lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-nav"
      >
        {mobileOpen ? 'Close menu' : 'Menu'}
      </Button>

      <nav
        id="sidebar-nav"
        aria-label="Main navigation"
        className={cn(
          'flex flex-col gap-1',
          mobileOpen ? 'block' : 'hidden lg:flex',
        )}
      >
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-surface-muted hover:text-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
